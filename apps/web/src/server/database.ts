import "server-only";

import { openDatabase, type DatabaseConnection } from "@job-board/db";
import { resolveDatabasePaths } from "@job-board/db/paths";

declare global {
  // Preserve one lazy connection across development module reloads.
  var jobBoardDatabase: DatabaseConnection | undefined;
}

export function getDatabase() {
  globalThis.jobBoardDatabase ??= openDatabase({
    filename: resolveDatabasePaths().databasePath,
  });

  return globalThis.jobBoardDatabase.db;
}
