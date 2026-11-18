import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { z } from "zod";

import { applyMigrations } from "../src/migrations.ts";
import { boards, postings, refreshTasks } from "../src/schema.ts";
import { temporaryWorkspace } from "./helpers.ts";

const migrationsDirectory = fileURLToPath(new URL("../drizzle", import.meta.url));

it("adds unread state to the indexed schema without replacing source data or history", () => {
  const workspace = temporaryWorkspace();
  const legacyDirectory = join(workspace.root, "legacy-migrations");
  mkdirSync(join(legacyDirectory, "meta"), { recursive: true });
  const journal = z
    .object({ entries: z.array(z.object({ tag: z.string() }).passthrough()) })
    .passthrough()
    .parse(JSON.parse(readFileSync(join(migrationsDirectory, "meta/_journal.json"), "utf8")));
  const entries = journal.entries.slice(0, 2);
  for (const { tag } of entries)
    copyFileSync(join(migrationsDirectory, `${tag}.sql`), join(legacyDirectory, `${tag}.sql`));
  writeFileSync(
    join(legacyDirectory, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries }),
  );
  const { db } = workspace.connect();
  applyMigrations({ db, migrationsDirectory: legacyDirectory });
  const now = "2026-10-27T10:00:00.000Z";
  db.insert(boards)
    .values({
      id: "board",
      provider: "ashby",
      sourceHost: "jobs.ashbyhq.com",
      boardKey: "example",
      canonicalUrl: "https://jobs.ashbyhq.com/example",
      displayName: "Example",
      createdAt: now,
      updatedAt: now,
      archivedAt: now,
    })
    .run();
  // Seed the old schema directly: the current ORM projection includes the absent read_at column.
  const insert = db.$client.prepare(`INSERT INTO postings
    (id, board_id, external_reference, title, description_plain, job_url, apply_url,
     locations, workplace_type, raw, content_hash, first_seen_at, last_seen_at,
     content_updated_at, unavailable_at, unavailable_reason)
    VALUES (?, 'board', 'source', 'Retained title', 'Retained description',
      'https://example.com/job', 'https://example.com/apply', '[]', 'unknown',
      '{"retained":true}', 'hash', ?, ?, ?, ?, ?)`);
  insert.run("current", now, now, now, null, null);
  insert.run("historical", now, now, now, now, "missing");
  db.insert(refreshTasks)
    .values({
      id: "refresh",
      boardId: "board",
      requestSource: "manual",
      state: "succeeded",
      phase: "finished",
      createdAt: now,
      finishedAt: now,
    })
    .run();
  const rows = z.array(z.record(z.string(), z.unknown()));
  const before = rows.parse(db.$client.prepare("SELECT * FROM postings ORDER BY id").all());
  const beforeBoard = db.select().from(boards).all();
  const beforeTasks = db.select().from(refreshTasks).all();

  applyMigrations({ db, migrationsDirectory });
  applyMigrations({ db, migrationsDirectory });
  expect(db.$client.prepare("SELECT * FROM postings ORDER BY id").all()).toEqual(
    before.map((row) => ({ ...row, read_at: null })),
  );
  expect(db.select().from(boards).all()).toEqual(beforeBoard);
  expect(db.select().from(refreshTasks).all()).toEqual(beforeTasks);
  expect(
    db
      .select()
      .from(postings)
      .all()
      .every((posting) => posting.readAt === null),
  ).toBe(true);
  expect(db.$client.prepare("SELECT * FROM __drizzle_migrations").all()).toHaveLength(3);
});
