import "server-only";

import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "@job-board/db";
import { boards, postings, refreshTasks } from "@job-board/db/schema";
import { identifyBoardUrl, type BoardSource } from "@job-board/job-boards";
import { and, asc, count, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";

import { IndexRequestError } from "@/features/jobs/server/errors";

export type Database = DatabaseConnection["db"];
type Reader = Pick<Database, "select">;
export type RefreshClaim = {
  taskId: string;
  boardId: string;
  ownerToken: string;
  generation: number;
  source: BoardSource;
};
const activeStates = ["queued", "running"] satisfies (typeof refreshTasks.$inferSelect.state)[];

export function enqueueRefresh({
  db,
  boardId,
  requestSource,
  now = new Date().toISOString(),
}: {
  db: Database;
  boardId: string;
  requestSource: "manual" | "app-visit";
  now?: string;
}) {
  return db.transaction(
    (tx) => {
      const board = tx.select().from(boards).where(eq(boards.id, boardId)).get();
      if (!board) throw new IndexRequestError(404, "NOT_FOUND", "This board was not found.");
      if (board.archivedAt)
        throw new IndexRequestError(409, "ARCHIVED", "Restore this board before refreshing it.");
      const existing = tx
        .select()
        .from(refreshTasks)
        .where(and(eq(refreshTasks.boardId, boardId), inArray(refreshTasks.state, activeStates)))
        .get();
      if (existing) return existing;
      const cooldown = tx
        .select()
        .from(refreshTasks)
        .where(and(eq(refreshTasks.boardId, boardId), gt(refreshTasks.retryAt, now)))
        .orderBy(desc(refreshTasks.retryAt))
        .get();
      if (cooldown)
        throw new IndexRequestError(
          429,
          "RATE_LIMIT",
          "The provider asked us to wait before refreshing this board.",
          cooldown.retryAt,
        );
      const saved = tx
        .insert(refreshTasks)
        .values({
          id: randomUUID(),
          boardId,
          requestSource,
          state: "queued",
          phase: "queued",
          createdAt: now,
        })
        .returning()
        .get();
      if (!saved) throw new Error("Refresh acceptance returned no task.");
      return saved;
    },
    { behavior: "immediate" },
  );
}

export function enqueueActiveBoards({
  db,
  now = new Date().toISOString(),
  requestSource = "app-visit",
}: {
  db: Database;
  now?: string;
  requestSource?: "app-visit" | "manual";
}) {
  return db.transaction(
    (tx) => {
      const results: (
        | { boardId: string; kind: "accepted"; taskId: string }
        | { boardId: string; kind: "deferred"; retryAt: string | null }
      )[] = [];
      for (const board of tx
        .select({ id: boards.id })
        .from(boards)
        .where(isNull(boards.archivedAt))
        .all()) {
        try {
          const task = enqueueRefresh({ db, boardId: board.id, requestSource, now });
          results.push({ kind: "accepted", boardId: board.id, taskId: task.id });
        } catch (cause) {
          if (!(cause instanceof IndexRequestError) || cause.status !== 429) throw cause;
          results.push({ kind: "deferred", boardId: board.id, retryAt: cause.retryAt });
        }
      }
      return results;
    },
    { behavior: "immediate" },
  );
}

export function claimNext({
  db,
  now = new Date().toISOString(),
}: {
  db: Database;
  now?: string;
}): { kind: "claimed"; claim: RefreshClaim } | { kind: "wait"; until: string } | { kind: "idle" } {
  return db.transaction(
    (tx) => {
      tx.update(refreshTasks)
        .set({
          state: "interrupted",
          phase: "finished",
          finishedAt: now,
          ownerToken: null,
          leaseExpiresAt: null,
          errorCode: "INTERRUPTED",
          errorMessage:
            "The server stopped before this refresh completed. Refresh the board to retry.",
        })
        .where(
          and(
            eq(refreshTasks.state, "running"),
            or(lte(refreshTasks.leaseExpiresAt, now), isNull(refreshTasks.leaseExpiresAt)),
          ),
        )
        .run();
      const running = tx
        .select({ total: count() })
        .from(refreshTasks)
        .where(eq(refreshTasks.state, "running"))
        .get();
      if ((running?.total ?? 0) < 2) {
        const task = tx
          .select()
          .from(refreshTasks)
          .where(eq(refreshTasks.state, "queued"))
          .orderBy(asc(refreshTasks.sequence))
          .get();
        if (task) {
          const board = tx.select().from(boards).where(eq(boards.id, task.boardId)).get();
          if (!board || board.archivedAt) {
            tx.update(refreshTasks)
              .set({ state: "cancelled", phase: "finished", finishedAt: now })
              .where(eq(refreshTasks.id, task.id))
              .run();
            return { kind: "wait", until: now };
          }
          const identified = identifyBoardUrl(board.canonicalUrl);
          if (!identified.success) throw new Error("Stored board source is invalid.");
          const ownerToken = randomUUID();
          tx.update(refreshTasks)
            .set({
              state: "running",
              phase: "fetching",
              startedAt: now,
              ownerToken,
              generation: board.refreshGeneration,
              leaseExpiresAt: new Date(Date.parse(now) + 120_000).toISOString(),
            })
            .where(eq(refreshTasks.id, task.id))
            .run();
          return {
            kind: "claimed",
            claim: {
              taskId: task.id,
              boardId: task.boardId,
              ownerToken,
              generation: board.refreshGeneration,
              source: identified.source,
            },
          };
        }
      }
      const remaining = tx
        .select({ until: refreshTasks.leaseExpiresAt })
        .from(refreshTasks)
        .where(eq(refreshTasks.state, "running"))
        .orderBy(asc(refreshTasks.leaseExpiresAt))
        .get();
      return remaining?.until ? { kind: "wait", until: remaining.until } : { kind: "idle" };
    },
    { behavior: "immediate" },
  );
}

export function ownsClaim({ db, claim, now }: { db: Reader; claim: RefreshClaim; now: string }) {
  return Boolean(
    db
      .select({ id: refreshTasks.id })
      .from(refreshTasks)
      .innerJoin(boards, eq(boards.id, refreshTasks.boardId))
      .where(
        and(
          eq(refreshTasks.id, claim.taskId),
          eq(refreshTasks.ownerToken, claim.ownerToken),
          eq(refreshTasks.state, "running"),
          gt(refreshTasks.leaseExpiresAt, now),
          eq(boards.id, claim.boardId),
          isNull(boards.archivedAt),
          eq(boards.refreshGeneration, claim.generation),
        ),
      )
      .get(),
  );
}

export function failClaim({
  db,
  claim,
  code,
  message,
  retryAt = null,
  now = new Date().toISOString(),
}: {
  db: Database;
  claim: RefreshClaim;
  code: string;
  message: string;
  retryAt?: string | null;
  now?: string;
}) {
  return db.transaction(
    (tx) => {
      if (!ownsClaim({ db: tx, claim, now })) return false;
      tx.update(refreshTasks)
        .set({
          state: "failed",
          phase: "finished",
          finishedAt: now,
          ownerToken: null,
          leaseExpiresAt: null,
          errorCode: code,
          errorMessage: message,
          retryAt,
        })
        .where(eq(refreshTasks.id, claim.taskId))
        .run();
      return true;
    },
    { behavior: "immediate" },
  );
}

export function latestRefreshes(db: Database) {
  // One bounded summary per saved board, never full task history or ownership data.
  return db.transaction((tx) =>
    tx
      .select({ id: boards.id })
      .from(boards)
      .all()
      .flatMap((board) => {
        const task = tx
          .select({
            id: refreshTasks.id,
            boardId: refreshTasks.boardId,
            state: refreshTasks.state,
            phase: refreshTasks.phase,
            createdAt: refreshTasks.createdAt,
            startedAt: refreshTasks.startedAt,
            finishedAt: refreshTasks.finishedAt,
            newCount: refreshTasks.newCount,
            updatedCount: refreshTasks.updatedCount,
            unavailableCount: refreshTasks.unavailableCount,
            errorCode: refreshTasks.errorCode,
            errorMessage: refreshTasks.errorMessage,
            retryAt: refreshTasks.retryAt,
          })
          .from(refreshTasks)
          .where(eq(refreshTasks.boardId, board.id))
          .orderBy(desc(refreshTasks.sequence))
          .get();
        if (!task) return [];
        const successful =
          task.state === "succeeded"
            ? task
            : tx
                .select({
                  id: refreshTasks.id,
                  finishedAt: refreshTasks.finishedAt,
                  newCount: refreshTasks.newCount,
                  updatedCount: refreshTasks.updatedCount,
                  unavailableCount: refreshTasks.unavailableCount,
                })
                .from(refreshTasks)
                .where(and(eq(refreshTasks.boardId, board.id), eq(refreshTasks.state, "succeeded")))
                .orderBy(desc(refreshTasks.sequence))
                .get();
        const currentCount =
          tx
            .select({ total: count() })
            .from(postings)
            .where(and(eq(postings.boardId, board.id), isNull(postings.unavailableAt)))
            .get()?.total ?? 0;
        // Pending/failed attempts never replace the last committed index result.
        // Historical postings are excluded; Treat as new preserves the current count.
        const lastSuccessfulResult = successful?.finishedAt
          ? {
              id: successful.id,
              finishedAt: successful.finishedAt,
              newCount: successful.newCount ?? 0,
              updatedCount: successful.updatedCount ?? 0,
              unavailableCount: successful.unavailableCount ?? 0,
              cachedCount: Math.max(
                0,
                currentCount - (successful.newCount ?? 0) - (successful.updatedCount ?? 0),
              ),
            }
          : null;
        const cachedCount =
          task.state === "succeeded" && lastSuccessfulResult
            ? lastSuccessfulResult.cachedCount
            : null;
        return [{ ...task, cachedCount, lastSuccessfulResult }];
      }),
  );
}
