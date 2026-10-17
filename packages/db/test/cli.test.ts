import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { temporaryWorkspace } from "./helpers.ts";

const cli = fileURLToPath(new URL("../src/migrate-cli.ts", import.meta.url));

it("runs with native Node TypeScript from root and app directories using the same data override", () => {
  const workspace = temporaryWorkspace();
  const appDirectory = join(workspace.root, "apps", "web");
  mkdirSync(appDirectory, { recursive: true });
  const dataDirectory = "custom local data";
  const filename = join(workspace.root, dataDirectory, "job-board.sqlite");

  for (const cwd of [workspace.root, appDirectory]) {
    const result = spawnSync(process.execPath, [cli], {
      cwd,
      env: { ...process.env, JOB_BOARD_DATA_DIR: dataDirectory },
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(filename);
  }

  expect(existsSync(filename)).toBe(true);
  expect(existsSync(join(appDirectory, ".data"))).toBe(false);
  expect(existsSync(join(workspace.root, ".data"))).toBe(false);
});

it("exits nonzero for an unusable explicit directory without replacing the file or falling back", () => {
  const workspace = temporaryWorkspace();
  const occupied = join(workspace.root, "occupied");
  writeFileSync(occupied, "Keep this file.");
  const result = spawnSync(process.execPath, [cli], {
    cwd: workspace.root,
    env: { ...process.env, JOB_BOARD_DATA_DIR: occupied },
    encoding: "utf8",
    timeout: 10_000,
  });

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Database setup failed");
  expect(result.stderr).toContain(occupied);
  expect(readFileSync(occupied, "utf8")).toBe("Keep this file.");
  expect(existsSync(join(workspace.root, ".data"))).toBe(false);
});
