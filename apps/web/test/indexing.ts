import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { boards } from "@job-board/db/schema";
import { identifyBoardUrl } from "@job-board/job-boards";

import { applyMigrations } from "../../../packages/db/src/migrations.ts";
import { temporaryWorkspace } from "../../../packages/db/test/helpers.ts";
import { claimNext, enqueueRefresh, type Database } from "../src/features/refresh/server/store";

export const initialTime = "2026-10-27T10:00:00.000Z";
export const migrationsDirectory = fileURLToPath(
  new URL("../../../packages/db/drizzle", import.meta.url),
);

export function indexingStorage() {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const db = connection.db;
  applyMigrations({ db, migrationsDirectory });
  return {
    workspace,
    connection,
    db,
    addBoard(url = "https://jobs.ashbyhq.com/example") {
      const source = identifyBoardUrl(url);
      if (!source.success) throw new Error(source.message);
      const board = db
        .insert(boards)
        .values({
          ...source.source,
          id: randomUUID(),
          displayName: source.source.boardKey,
          createdAt: initialTime,
          updatedAt: initialTime,
        })
        .returning()
        .get();
      if (!board) throw new Error("Test board was not saved.");
      return board;
    },
  };
}

export function beginRefresh(db: Database, boardId: string, now = initialTime) {
  enqueueRefresh({ db, boardId, requestSource: "manual", now });
  const result = claimNext({ db, now });
  if (result.kind !== "claimed") throw new Error("Test refresh was not claimed.");
  return result.claim;
}
