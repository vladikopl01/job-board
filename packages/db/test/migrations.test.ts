import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { expect, it } from "vitest";

import { applyMigrations } from "../src/migrations.ts";
import journal from "./fixtures/migrations/meta/_journal.json" with { type: "json" };
import { parents } from "./fixtures/schema.ts";
import { temporaryWorkspace } from "./helpers.ts";

const fixtureDirectory = fileURLToPath(new URL("./fixtures/migrations", import.meta.url));
const originalParents = sqliteTable("fixture_parents", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

function copyMigrations(root: string) {
  const directory = join(root, "migrations");
  cpSync(fixtureDirectory, directory, { recursive: true });
  return directory;
}

function writeJournal(directory: string, entries: typeof journal.entries) {
  writeFileSync(join(directory, "meta", "_journal.json"), JSON.stringify({ ...journal, entries }));
}

it("initializes without domain migrations, and accepts a generated empty journal", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const missingDirectory = join(workspace.root, "no-migrations");
  applyMigrations({ db: connection.db, migrationsDirectory: missingDirectory });
  expect(existsSync(workspace.filename)).toBe(true);
  expect(existsSync(missingDirectory)).toBe(false);

  const migrationsDirectory = copyMigrations(workspace.root);
  rmSync(join(migrationsDirectory, "0000_foundation-fixture.sql"));
  rmSync(join(migrationsDirectory, "0001_fixture-note.sql"));
  writeJournal(migrationsDirectory, []);
  applyMigrations({ db: connection.db, migrationsDirectory });
  applyMigrations({ db: connection.db, migrationsDirectory });
  expect(connection.db.$client.pragma("table_list")).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "fixture_parents" })]),
  );
});

it("applies a pending generated migration once while retaining existing data", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const migrationsDirectory = copyMigrations(workspace.root);
  rmSync(join(migrationsDirectory, "0001_fixture-note.sql"));
  writeJournal(migrationsDirectory, journal.entries.slice(0, 1));
  applyMigrations({ db: connection.db, migrationsDirectory });
  connection.db.insert(originalParents).values({ id: 1, name: "Keep me" }).run();

  cpSync(fixtureDirectory, migrationsDirectory, { recursive: true });
  applyMigrations({ db: connection.db, migrationsDirectory });
  applyMigrations({ db: connection.db, migrationsDirectory });
  expect(connection.db.select().from(parents).all()).toEqual([
    { id: 1, name: "Keep me", note: null },
  ]);
});

it("rejects lost or changed applied history without losing stored data", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const migrationsDirectory = copyMigrations(workspace.root);
  applyMigrations({ db: connection.db, migrationsDirectory });
  connection.db.insert(parents).values({ id: 1, name: "Keep me" }).run();

  expect(() =>
    applyMigrations({ db: connection.db, migrationsDirectory: join(workspace.root, "missing") }),
  ).toThrow("Missing migration history");
  const migrationPath = join(migrationsDirectory, "0000_foundation-fixture.sql");
  writeFileSync(
    migrationPath,
    `${readFileSync(migrationPath, "utf8")}\n-- changed after application\n`,
  );
  expect(() => applyMigrations({ db: connection.db, migrationsDirectory })).toThrow(
    "missing or changed",
  );
  expect(connection.db.select().from(parents).all()).toEqual([
    { id: 1, name: "Keep me", note: null },
  ]);
});

it("rejects new source history inserted before an already applied migration", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const migrationsDirectory = copyMigrations(workspace.root);
  applyMigrations({ db: connection.db, migrationsDirectory });
  connection.db.insert(parents).values({ id: 1, name: "Keep me" }).run();

  const tag = "inserted-before-existing";
  writeFileSync(join(migrationsDirectory, `${tag}.sql`), "-- An out-of-order migration\n");
  writeJournal(migrationsDirectory, [
    {
      idx: 0,
      version: "6",
      when: Math.min(...journal.entries.map((entry) => entry.when)) - 1,
      tag,
      breakpoints: true,
    },
    ...journal.entries.map((entry) => ({ ...entry, idx: entry.idx + 1 })),
  ]);

  expect(() => applyMigrations({ db: connection.db, migrationsDirectory })).toThrow(
    "missing or changed",
  );
  expect(connection.db.select().from(parents).all()).toEqual([
    { id: 1, name: "Keep me", note: null },
  ]);
});

it("reports the failed migration and rolls back the pending batch", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const migrationsDirectory = copyMigrations(workspace.root);
  rmSync(join(migrationsDirectory, "0001_fixture-note.sql"));
  writeJournal(migrationsDirectory, journal.entries.slice(0, 1));
  applyMigrations({ db: connection.db, migrationsDirectory });
  connection.db.insert(originalParents).values({ id: 1, name: "Keep me" }).run();

  cpSync(fixtureDirectory, migrationsDirectory, { recursive: true });
  const tag = "0002_broken";
  writeFileSync(join(migrationsDirectory, `${tag}.sql`), "INVALID MIGRATION SQL;");
  writeJournal(migrationsDirectory, [
    ...journal.entries,
    {
      idx: journal.entries.length,
      version: "6",
      when: Math.max(...journal.entries.map((entry) => entry.when)) + 1,
      tag,
      breakpoints: true,
    },
  ]);

  expect(() => applyMigrations({ db: connection.db, migrationsDirectory })).toThrow(tag);
  expect(connection.db.$client.pragma("table_info(fixture_parents)")).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "note" })]),
  );

  rmSync(join(migrationsDirectory, `${tag}.sql`));
  writeJournal(migrationsDirectory, journal.entries);
  applyMigrations({ db: connection.db, migrationsDirectory });
  expect(connection.db.select().from(parents).all()).toEqual([
    { id: 1, name: "Keep me", note: null },
  ]);
});

it.each([
  { damage: "invalid-json", expected: "Unexpected token" },
  { damage: "missing-sql", expected: "No file" },
  { damage: "orphan-sql", expected: "missing from" },
])("rejects incomplete source history: $damage", ({ damage, expected }) => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const migrationsDirectory = copyMigrations(workspace.root);
  if (damage === "invalid-json")
    writeFileSync(join(migrationsDirectory, "meta", "_journal.json"), "not json");
  if (damage === "missing-sql") rmSync(join(migrationsDirectory, "0000_foundation-fixture.sql"));
  if (damage === "orphan-sql") writeJournal(migrationsDirectory, []);

  expect(() => applyMigrations({ db: connection.db, migrationsDirectory })).toThrow(expected);
});
