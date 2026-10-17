import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findWorkspaceRoot(startDirectory = process.cwd()): string {
  let directory = resolve(startDirectory);

  while (!existsSync(join(directory, "pnpm-workspace.yaml"))) {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(
        `Cannot find pnpm-workspace.yaml above ${startDirectory}. Run from this repository or a workspace directory.`,
      );
    }
    directory = parent;
  }

  return directory;
}

export function resolveDatabasePaths({
  workspaceRoot = findWorkspaceRoot(),
  dataDirectory = process.env.JOB_BOARD_DATA_DIR,
}: {
  workspaceRoot?: string;
  dataDirectory?: string;
} = {}) {
  if (dataDirectory !== undefined && (!dataDirectory.trim() || dataDirectory.includes("\0"))) {
    throw new Error("JOB_BOARD_DATA_DIR must be a non-empty directory path.");
  }

  const dataRoot = resolve(workspaceRoot, dataDirectory ?? ".data");

  return {
    dataDirectory: dataRoot,
    databasePath: join(dataRoot, "job-board.sqlite"),
    migrationsDirectory: join(workspaceRoot, "packages", "db", "drizzle"),
  };
}
