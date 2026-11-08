import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { applyMigrations } from "../src/migrations.ts";
import { boards } from "../src/schema.ts";
import { temporaryWorkspace } from "./helpers.ts";

const migrationsDirectory = fileURLToPath(new URL("../drizzle", import.meta.url));

it("applies and replays the production board migration while retaining records across reopen", () => {
  const workspace = temporaryWorkspace();
  const first = workspace.connect();
  applyMigrations({ db: first.db, migrationsDirectory });
  const board = {
    id: "c1488c2e-b62d-4f63-b54a-123f9b80c4e2",
    provider: "ashby",
    sourceHost: "jobs.ashbyhq.com",
    boardKey: "ramp",
    canonicalUrl: "https://jobs.ashbyhq.com/ramp",
    displayName: "Ramp",
    createdAt: "2026-10-27T12:00:00.000Z",
    updatedAt: "2026-10-27T12:00:00.000Z",
    archivedAt: null,
  } satisfies typeof boards.$inferInsert;
  first.db.insert(boards).values(board).run();
  applyMigrations({ db: first.db, migrationsDirectory });
  first.close();

  const reopened = workspace.connect();
  applyMigrations({ db: reopened.db, migrationsDirectory });
  expect(reopened.db.select().from(boards).all()).toEqual([
    { ...board, lastSuccessfulRefreshAt: null, refreshGeneration: 0 },
  ]);
});
