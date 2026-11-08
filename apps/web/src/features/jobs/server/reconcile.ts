import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { boards, postings, refreshTasks } from "@job-board/db/schema";
import type { JsonValue, NormalizedPosting, PostingSnapshot } from "@job-board/job-boards";
import { and, eq, isNull } from "drizzle-orm";

import { ownsClaim, type Database, type RefreshClaim } from "@/features/refresh/server/store";

import { IndexRequestError } from "./errors";

function canonical(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key] ?? null)}`)
    .join(",")}}`;
}

function contentHash(posting: NormalizedPosting) {
  const { raw: _raw, ...content } = posting;
  return createHash("sha256").update(canonical(content)).digest("hex");
}

export function reconcileSnapshot({
  db,
  claim,
  snapshot,
  now = new Date().toISOString(),
}: {
  db: Database;
  claim: RefreshClaim;
  snapshot: PostingSnapshot;
  now?: string;
}) {
  return db.transaction(
    (tx) => {
      if (!ownsClaim({ db: tx, claim, now })) return false;
      const current = tx
        .select()
        .from(postings)
        .where(and(eq(postings.boardId, claim.boardId), isNull(postings.unavailableAt)))
        .all();
      const byReference = new Map(current.map((posting) => [posting.externalReference, posting]));
      const present = new Set<string>();
      let newCount = 0;
      let updatedCount = 0;
      let unavailableCount = 0;
      for (const posting of snapshot.postings) {
        const existing = byReference.get(posting.externalReference);
        present.add(posting.externalReference);
        const hash = contentHash(posting);
        if (existing) {
          tx.update(postings)
            .set({
              ...posting,
              contentHash: hash,
              lastSeenAt: now,
              contentUpdatedAt: existing.contentHash === hash ? existing.contentUpdatedAt : now,
            })
            .where(eq(postings.id, existing.id))
            .run();
          if (existing.contentHash !== hash) updatedCount++;
        } else {
          tx.insert(postings)
            .values({
              ...posting,
              id: randomUUID(),
              boardId: claim.boardId,
              contentHash: hash,
              firstSeenAt: now,
              lastSeenAt: now,
              contentUpdatedAt: now,
            })
            .run();
          newCount++;
        }
      }
      for (const posting of current) {
        if (!present.has(posting.externalReference)) {
          tx.update(postings)
            .set({ unavailableAt: now, unavailableReason: "missing" })
            .where(eq(postings.id, posting.id))
            .run();
          unavailableCount++;
        }
      }
      tx.update(boards)
        .set({ lastSuccessfulRefreshAt: now })
        .where(eq(boards.id, claim.boardId))
        .run();
      tx.update(refreshTasks)
        .set({
          state: "succeeded",
          phase: "finished",
          finishedAt: now,
          ownerToken: null,
          leaseExpiresAt: null,
          newCount,
          updatedCount,
          unavailableCount,
        })
        .where(eq(refreshTasks.id, claim.taskId))
        .run();
      return true;
    },
    { behavior: "immediate" },
  );
}

export function replacePosting({
  db,
  id,
  now = new Date().toISOString(),
}: {
  db: Database;
  id: string;
  now?: string;
}) {
  return db.transaction(
    (tx) => {
      const current = tx.select().from(postings).where(eq(postings.id, id)).get();
      if (!current) throw new IndexRequestError(404, "NOT_FOUND", "This posting was not found.");
      const board = tx.select().from(boards).where(eq(boards.id, current.boardId)).get();
      if (!board || board.archivedAt || current.unavailableAt)
        throw new IndexRequestError(
          409,
          "NOT_CURRENT",
          "Only a current posting on an active board can be treated as new.",
        );
      tx.update(postings)
        .set({ unavailableAt: now, unavailableReason: "superseded" })
        .where(eq(postings.id, id))
        .run();
      const newId = randomUUID();
      tx.insert(postings)
        .values({
          ...current,
          id: newId,
          firstSeenAt: now,
          unavailableAt: null,
          unavailableReason: null,
        })
        .run();
      return newId;
    },
    { behavior: "immediate" },
  );
}
