import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { expect, it } from "vitest";
import { z } from "zod";

import { applyMigrations } from "../src/migrations.ts";
import { boards, postings, refreshTasks } from "../src/schema.ts";
import { temporaryWorkspace } from "./helpers.ts";

const migrationsDirectory = fileURLToPath(new URL("../drizzle", import.meta.url));
// The old application's column projection must keep working after an additive upgrade.
const legacyBoards = sqliteTable("boards", {
  id: text("id").primaryKey(),
  provider: text("provider"),
  sourceHost: text("source_host"),
  boardKey: text("board_key"),
  canonicalUrl: text("canonical_url"),
  displayName: text("display_name"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
  archivedAt: text("archived_at"),
});

it("upgrades the existing board database without resetting identities, archive state or migration history", () => {
  const workspace = temporaryWorkspace();
  const legacyDirectory = join(workspace.root, "legacy-migrations");
  mkdirSync(join(legacyDirectory, "meta"), { recursive: true });
  copyFileSync(
    join(migrationsDirectory, "0000_company_boards.sql"),
    join(legacyDirectory, "0000_company_boards.sql"),
  );
  const journal = z
    .object({ version: z.string(), dialect: z.string(), entries: z.array(z.json()) })
    .parse(JSON.parse(readFileSync(join(migrationsDirectory, "meta/_journal.json"), "utf8")));
  writeFileSync(
    join(legacyDirectory, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }),
  );
  const { db } = workspace.connect();
  applyMigrations({ db, migrationsDirectory: legacyDirectory });
  const row = {
    id: "old-board",
    provider: "ashby",
    sourceHost: "jobs.ashbyhq.com",
    boardKey: "example",
    canonicalUrl: "https://jobs.ashbyhq.com/example",
    displayName: "Original name",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    archivedAt: "2026-10-02T10:00:00.000Z",
  };
  db.insert(legacyBoards).values(row).run();
  applyMigrations({ db, migrationsDirectory });
  applyMigrations({ db, migrationsDirectory });
  expect(db.select().from(boards).get()).toEqual({
    ...row,
    lastSuccessfulRefreshAt: null,
    refreshGeneration: 0,
  });
  expect(db.select().from(postings).all()).toEqual([]);
  expect(db.select().from(refreshTasks).all()).toEqual([]);
  expect(db.select().from(legacyBoards).get()).toEqual(row);
  db.update(legacyBoards).set({ displayName: "Legacy rename" }).run();
  expect(db.select().from(boards).get()?.displayName).toBe("Legacy rename");
  db.insert(legacyBoards)
    .values({ ...row, id: "second", boardKey: "second" })
    .run();
  expect(db.select().from(boards).all()).toHaveLength(2);
});
