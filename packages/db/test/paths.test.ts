import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";

import { findWorkspaceRoot, resolveDatabasePaths } from "../src/paths.ts";
import { temporaryWorkspace } from "./helpers.ts";

afterEach(() => vi.unstubAllEnvs());

it("resolves the same default path from root and workspace directories without creating data", () => {
  vi.stubEnv("JOB_BOARD_DATA_DIR", undefined);
  const { root } = temporaryWorkspace();
  const expected = join(root, ".data", "job-board.sqlite");

  for (const relative of [".", "apps/web", "packages/db"]) {
    const directory = join(root, relative);
    mkdirSync(directory, { recursive: true });
    const workspaceRoot = findWorkspaceRoot(directory);
    expect(resolveDatabasePaths({ workspaceRoot }).databasePath).toBe(expected);
  }

  expect(existsSync(join(root, ".data"))).toBe(false);
});

it("anchors relative overrides to the workspace and preserves absolute paths with spaces", () => {
  const { root } = temporaryWorkspace();
  const relative = "alternate local data";
  const absolute = join(root, "absolute local data");

  expect(resolveDatabasePaths({ workspaceRoot: root, dataDirectory: relative }).databasePath).toBe(
    join(root, relative, "job-board.sqlite"),
  );
  expect(resolveDatabasePaths({ workspaceRoot: root, dataDirectory: absolute }).databasePath).toBe(
    join(absolute, "job-board.sqlite"),
  );

  vi.stubEnv("JOB_BOARD_DATA_DIR", relative);
  expect(resolveDatabasePaths({ workspaceRoot: root }).databasePath).toBe(
    join(root, relative, "job-board.sqlite"),
  );
});

it.each(["", "   ", "bad\0path"])(
  "rejects an invalid explicit data directory %j",
  (dataDirectory) => {
    const { root } = temporaryWorkspace();
    expect(() => resolveDatabasePaths({ workspaceRoot: root, dataDirectory })).toThrow(
      "JOB_BOARD_DATA_DIR",
    );
  },
);

it("fails instead of silently choosing a root outside a workspace", () => {
  const { root } = temporaryWorkspace();
  expect(() => findWorkspaceRoot(join(root, ".."))).toThrow("Cannot find pnpm-workspace.yaml");
});
