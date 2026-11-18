import "server-only";

import { postings } from "@job-board/db/schema";
import { and, inArray, isNull } from "drizzle-orm";

import type { Database } from "@/features/refresh/server/store";

import type { ReadStateInput } from "../schemas";
import { IndexRequestError } from "./errors";

export function setReadState({
  db,
  input,
  now = new Date().toISOString(),
}: {
  db: Database;
  input: ReadStateInput;
  now?: string;
}) {
  return db.transaction(
    (tx) => {
      const target = inArray(postings.id, input.ids);
      const existing = tx.select({ id: postings.id }).from(postings).where(target).all();
      if (existing.length !== input.ids.length)
        throw new IndexRequestError(
          404,
          "NOT_FOUND",
          "Some postings were not found. Reload the list and try again.",
        );

      tx.update(postings)
        .set({ readAt: input.read ? now : null })
        .where(input.read ? and(target, isNull(postings.readAt)) : target)
        .run();
      return {
        postings: tx
          .select({ id: postings.id, readAt: postings.readAt })
          .from(postings)
          .where(target)
          .all(),
      };
    },
    { behavior: "immediate" },
  );
}
