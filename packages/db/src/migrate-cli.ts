import { openDatabase, type DatabaseConnection } from "./connection.ts";
import { applyMigrations } from "./migrations.ts";
import { resolveDatabasePaths } from "./paths.ts";

let connection: DatabaseConnection | undefined;
let filename: string | undefined;

try {
  const paths = resolveDatabasePaths();
  filename = paths.databasePath;
  connection = openDatabase({ filename });
  applyMigrations({ db: connection.db, migrationsDirectory: paths.migrationsDirectory });
  process.stdout.write(`Local database ready: ${filename}\n`);
} catch (error) {
  process.stderr.write(
    `Database setup failed${filename ? ` at ${filename}` : ""}: ${error instanceof Error ? error.message : "Unknown error"}\n`,
  );
  process.exitCode = 1;
} finally {
  connection?.close();
}
