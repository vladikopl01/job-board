import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

import { openDatabase, type DatabaseConnection } from "../src/connection.ts";

export function temporaryWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "job-board-test-"));
  const connections: DatabaseConnection[] = [];
  const filename = join(root, "data", "job-board.sqlite");
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []\n");

  onTestFinished(() => {
    for (const connection of connections) {
      if (connection.db.$client.open) connection.close();
    }
    rmSync(root, { recursive: true, force: true });
  });

  return {
    root,
    filename,
    connect(options: { busyTimeoutMs?: number } = {}) {
      const connection = openDatabase({ filename, ...options });
      connections.push(connection);
      return connection;
    },
  };
}
