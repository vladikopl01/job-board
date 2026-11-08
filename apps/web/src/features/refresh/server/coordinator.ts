import "server-only";

import { setTimeout as wait } from "node:timers/promises";
import { postings, refreshTasks } from "@job-board/db/schema";
import { createFeedSession, FeedError, fetchSnapshot } from "@job-board/job-boards/server";
import { and, eq, isNull } from "drizzle-orm";

import { reconcileSnapshot } from "@/features/jobs/server/reconcile";

import { registerRefresh } from "./cancellation";
import { claimNext, failClaim, ownsClaim, type Database, type RefreshClaim } from "./store";

async function execute({
  db,
  claim,
  fetcher,
  clock,
}: {
  db: Database;
  claim: RefreshClaim;
  fetcher: typeof fetch;
  clock: () => number;
}) {
  const controller = new AbortController();
  const unregister = registerRefresh(claim.boardId, controller);
  const session = createFeedSession({ signal: controller.signal, fetcher });
  try {
    let snapshot = await fetchSnapshot(claim.source, session);
    const current = db
      .select({ reference: postings.externalReference })
      .from(postings)
      .where(and(eq(postings.boardId, claim.boardId), isNull(postings.unavailableAt)))
      .all();
    const references = new Set(snapshot.postings.map((posting) => posting.externalReference));
    if (
      claim.source.provider === "lever" &&
      current.some((posting) => !references.has(posting.reference))
    ) {
      if (!ownsClaim({ db, claim, now: new Date(clock()).toISOString() })) return;
      db.update(refreshTasks)
        .set({ phase: "confirming" })
        .where(
          and(
            eq(refreshTasks.id, claim.taskId),
            eq(refreshTasks.ownerToken, claim.ownerToken),
            eq(refreshTasks.state, "running"),
          ),
        )
        .run();
      const confirmation = await fetchSnapshot(claim.source, session);
      if (
        confirmation.postings.length !== references.size ||
        confirmation.postings.some((posting) => !references.has(posting.externalReference))
      ) {
        throw new FeedError(
          "INVALID_FEED",
          "The board changed during pagination. Refresh again to confirm the result.",
        );
      }
      snapshot = confirmation;
    }
    session.signal.throwIfAborted();
    reconcileSnapshot({ db, claim, snapshot, now: new Date(clock()).toISOString() });
  } catch (cause) {
    const failure =
      cause instanceof FeedError
        ? cause
        : new FeedError(
            "TRANSPORT",
            "The refresh could not finish. Your saved jobs are unchanged.",
          );
    failClaim({
      db,
      claim,
      code: failure.code,
      message: failure.message,
      retryAt: failure.retryAt,
      now: new Date(clock()).toISOString(),
    });
  } finally {
    controller.abort();
    unregister();
  }
}

export async function drainRefreshes({
  db,
  fetcher = fetch,
  clock = Date.now,
  sleep = wait,
}: {
  db: Database;
  fetcher?: typeof fetch;
  clock?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
}) {
  async function lane() {
    while (true) {
      const next = claimNext({ db, now: new Date(clock()).toISOString() });
      if (next.kind === "idle") return;
      if (next.kind === "wait") {
        await sleep(Math.max(1, Math.min(1000, Date.parse(next.until) - clock())));
      } else {
        await execute({ db, claim: next.claim, fetcher, clock });
      }
    }
  }
  await Promise.all([lane(), lane()]);
}
