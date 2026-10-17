import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { applyMigrations } from "../src/migrations.ts";
import { children, parents } from "./fixtures/schema.ts";
import { temporaryWorkspace } from "./helpers.ts";

const migrationsDirectory = fileURLToPath(new URL("./fixtures/migrations", import.meta.url));

it("creates a local WAL database with foreign keys and a finite default timeout", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  const sqlite = connection.db.$client;

  expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
  expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
  expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5_000);
  applyMigrations({ db: connection.db, migrationsDirectory });
  expect(() => connection.db.insert(children).values({ id: 1, parentId: 99 }).run()).toThrow(
    "FOREIGN KEY constraint failed",
  );
  expect(connection.db.select().from(children).all()).toEqual([]);
});

it("bounds a conflicting write and preserves the first transaction's data", () => {
  const workspace = temporaryWorkspace();
  const first = workspace.connect();
  applyMigrations({ db: first.db, migrationsDirectory });
  const second = workspace.connect({ busyTimeoutMs: 50 });

  first.db.transaction((transaction) => {
    transaction.insert(parents).values({ id: 1, name: "Committed" }).run();
    const start = performance.now();
    expect(() => second.db.insert(parents).values({ id: 2, name: "Blocked" }).run()).toThrow(
      "database is locked",
    );
    expect(performance.now() - start).toBeLessThan(2_000);
  });

  expect(first.db.select().from(parents).all()).toEqual([{ id: 1, name: "Committed", note: null }]);
});

it("preserves a corrupt existing file when initialization fails", () => {
  const workspace = temporaryWorkspace();
  const original = Buffer.from("This file is not a SQLite database.");
  mkdirSync(dirname(workspace.filename), { recursive: true });
  writeFileSync(workspace.filename, original);

  expect(() => workspace.connect()).toThrow("file is not a database");
  expect(readFileSync(workspace.filename)).toEqual(original);
});

it("releases native handles on explicit close so the same file can reopen", () => {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  applyMigrations({ db: connection.db, migrationsDirectory });
  connection.db.insert(parents).values({ id: 1, name: "Retained" }).run();
  connection.close();

  expect(connection.db.$client.open).toBe(false);
  const reopened = workspace.connect();
  expect(reopened.db.select().from(parents).all()).toEqual([
    { id: 1, name: "Retained", note: null },
  ]);
});
