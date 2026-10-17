import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { asc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import type { DatabaseConnection } from "./connection.ts";

const journalSchema = z.object({
  version: z.literal("7"),
  dialect: z.literal("sqlite"),
  entries: z.array(
    z.object({
      idx: z.int().nonnegative(),
      version: z.string().regex(/^\d+$/),
      when: z.int().nonnegative(),
      tag: z.string().regex(/^[\w-]+$/),
      breakpoints: z.boolean(),
    }),
  ),
});

// Read Drizzle's existing ledger without creating a second migration history.
const sqliteCatalog = sqliteTable("sqlite_master", { name: text("name").notNull() });
const migrationLog = sqliteTable("__drizzle_migrations", {
  hash: text("hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export function applyMigrations({
  db,
  migrationsDirectory,
}: {
  db: DatabaseConnection["db"];
  migrationsDirectory: string;
}) {
  const hasLog = db
    .select()
    .from(sqliteCatalog)
    .where(eq(sqliteCatalog.name, "__drizzle_migrations"))
    .get();
  const applied = hasLog
    ? db.select().from(migrationLog).orderBy(asc(migrationLog.createdAt)).all()
    : [];
  const journalPath = join(migrationsDirectory, "meta", "_journal.json");
  const files = existsSync(migrationsDirectory) ? readdirSync(migrationsDirectory) : [];

  if (!existsSync(journalPath)) {
    if (applied.length > 0 || files.length > 0) {
      throw new Error(
        `Missing migration history at ${journalPath}. Restore the committed migration files; the database has not been reset.`,
      );
    }
    return;
  }

  const content: unknown = JSON.parse(readFileSync(journalPath, "utf8"));
  const journal = journalSchema.parse(content);
  for (const [index, entry] of journal.entries.entries()) {
    const previous = journal.entries[index - 1];
    if (entry.idx !== index || (previous && entry.when <= previous.when)) {
      throw new Error(`Invalid migration order at ${entry.tag} in ${journalPath}.`);
    }
  }

  const expectedFiles = new Set(journal.entries.map((entry) => `${entry.tag}.sql`));
  const orphan = files.find((file) => file.endsWith(".sql") && !expectedFiles.has(file));
  if (orphan) {
    throw new Error(`Migration ${orphan} is missing from ${journalPath}.`);
  }

  const migrations = readMigrationFiles({ migrationsFolder: migrationsDirectory });
  for (const [index, entry] of applied.entries()) {
    const migration = migrations[index];
    if (migration?.folderMillis !== entry.createdAt || migration.hash !== entry.hash) {
      throw new Error(
        `Applied migration at ${entry.createdAt} is missing or changed in ${migrationsDirectory}. Restore its original source before continuing.`,
      );
    }
  }

  try {
    migrate(db, { migrationsFolder: migrationsDirectory });
  } catch (cause) {
    // Drizzle reports failing SQL; attach its source migration for local diagnostics.
    const index = migrations.findIndex((migration) =>
      migration.sql.some(
        (statement) =>
          cause instanceof Error && cause.message === `Failed to run the query '${statement}'`,
      ),
    );
    const source = journal.entries[index]?.tag ?? migrationsDirectory;
    throw new Error(
      `Migration ${source} failed. ${cause instanceof Error ? cause.message : "Unknown database error"}`,
      { cause },
    );
  }
}
