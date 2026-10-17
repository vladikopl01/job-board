import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.ts";

export function openDatabase({
  filename,
  busyTimeoutMs = 5_000,
}: {
  filename: string;
  busyTimeoutMs?: number;
}) {
  if (!Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 0) {
    throw new RangeError("Database busy timeout must be a non-negative integer.");
  }

  mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new Sqlite(filename, { timeout: busyTimeoutMs });

  try {
    sqlite.pragma("foreign_keys = ON");
    const journalMode: unknown = sqlite.pragma("journal_mode = WAL", { simple: true });
    if (journalMode !== "wal") {
      throw new Error(
        `Cannot enable WAL journaling for ${filename}. Use a writable local data directory.`,
      );
    }

    return {
      db: drizzle(sqlite, { schema }),
      close() {
        sqlite.close();
      },
    };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

export type DatabaseConnection = ReturnType<typeof openDatabase>;
