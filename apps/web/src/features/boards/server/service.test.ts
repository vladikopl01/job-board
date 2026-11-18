import { fileURLToPath } from "node:url";
import type { DatabaseConnection } from "@job-board/db";
import { boards, refreshTasks } from "@job-board/db/schema";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { applyMigrations } from "../../../../../../packages/db/src/migrations.ts";
import { temporaryWorkspace } from "../../../../../../packages/db/test/helpers.ts";
import { boardSchema } from "../schemas";
import { BoardRequestError } from "./errors";
import { createBoard, listBoards, updateBoard } from "./service";

vi.mock("server-only", () => ({}));
const getDatabase = vi.hoisted(() => vi.fn<() => DatabaseConnection["db"]>());
vi.mock("@/server/database", () => ({ getDatabase }));

const migrationsDirectory = fileURLToPath(
  new URL("../../../../../../packages/db/drizzle", import.meta.url),
);
const ramp = { displayName: "Ramp", url: "https://jobs.ashbyhq.com/ramp" };

beforeEach(() => getDatabase.mockReset());
afterEach(() => vi.useRealTimers());

function storage() {
  const workspace = temporaryWorkspace();
  const connection = workspace.connect();
  applyMigrations({ db: connection.db, migrationsDirectory });
  getDatabase.mockReturnValue(connection.db);
  return { workspace, connection };
}

it("normalizes a saved source, uses a UUID, trims labels and survives reopen", () => {
  const { workspace, connection } = storage();
  const saved = createBoard({
    displayName: " Ramp ",
    url: " https://JOBS.ASHBYHQ.COM/%72amp/?ref=x#jobs ",
  });
  expect(saved).toMatchObject({
    displayName: "Ramp",
    boardKey: "ramp",
    canonicalUrl: ramp.url,
    archivedAt: null,
  });
  expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
  connection.close();
  getDatabase.mockReturnValue(workspace.connect().db);
  expect(listBoards()).toEqual([saved]);
});

it("rolls back registration if its first indexing task cannot be saved", () => {
  const { connection } = storage();
  connection.db.$client.exec(`
    CREATE TRIGGER reject_initial_refresh BEFORE INSERT ON board_refresh_tasks
    BEGIN SELECT RAISE(ABORT, 'Cannot enqueue initial indexing'); END;
  `);
  expect(() => createBoard(ramp)).toThrow("Cannot enqueue initial indexing");
  expect(listBoards()).toEqual([]);
  expect(connection.db.select().from(refreshTasks).all()).toEqual([]);
});

it("persists a spaced board key and treats raw and encoded spaces as the same source", () => {
  const { workspace, connection } = storage();
  const saved = createBoard({
    displayName: "Hyperliquid Labs",
    url: "https://jobs.ashbyhq.com/%48yperliquid%20Labs/?ref=test#jobs",
  });
  expect(saved).toMatchObject({
    boardKey: "Hyperliquid Labs",
    canonicalUrl: "https://jobs.ashbyhq.com/Hyperliquid%20Labs",
  });
  expect(boardSchema.safeParse(saved).success).toBe(true);
  expect(() =>
    createBoard({ displayName: "Another name", url: "https://jobs.ashbyhq.com/Hyperliquid Labs" }),
  ).toThrow(
    expect.objectContaining({
      status: 409,
      error: expect.objectContaining({ existingBoard: { id: saved.id, archived: false } }),
    }),
  );
  connection.close();
  getDatabase.mockReturnValue(workspace.connect().db);
  expect(listBoards()).toEqual([saved]);
});

it("rejects equivalent active and archived duplicates without renaming or restoring them", () => {
  storage();
  const saved = createBoard(ramp);
  const duplicateInput = { displayName: "Another label", url: `${ramp.url}/?ref=new` };
  expect(() => createBoard(duplicateInput)).toThrow(
    expect.objectContaining({
      status: 409,
      error: expect.objectContaining({
        code: "DUPLICATE_BOARD",
        existingBoard: { id: saved.id, archived: false },
      }),
    }),
  );
  const archived = updateBoard({ id: saved.id, input: { archived: true } });
  expect(() => createBoard(duplicateInput)).toThrow(
    expect.objectContaining({
      status: 409,
      error: expect.objectContaining({ existingBoard: { id: saved.id, archived: true } }),
    }),
  );
  expect(listBoards()).toEqual([archived]);
});

it("enforces source uniqueness across separate connections but allows regional, provider and case distinctions", () => {
  const { workspace } = storage();
  const first = createBoard(ramp);
  getDatabase.mockReturnValue(workspace.connect().db);
  expect(() => createBoard(ramp)).toThrow(BoardRequestError);
  const other = [
    "https://jobs.lever.co/ramp",
    "https://jobs.eu.lever.co/ramp",
    "https://jobs.ashbyhq.com/Ramp",
  ].map((url) => createBoard({ displayName: "Ramp", url }));
  expect(new Set([first, ...other].map((board) => board.id)).size).toBe(4);
  expect(listBoards()).toHaveLength(4);
});

it("renames archived boards and preserves identity, creation time and no-op timestamps", () => {
  storage();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T10:00:00Z"));
  const saved = createBoard(ramp);
  expect(updateBoard({ id: saved.id, input: { archived: false, displayName: " Ramp " } })).toEqual(
    saved,
  );

  vi.setSystemTime(new Date("2026-10-27T11:00:00Z"));
  const archived = updateBoard({ id: saved.id, input: { archived: true } });
  expect(archived.archivedAt).toBe("2026-10-27T11:00:00.000Z");
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
  expect(updateBoard({ id: saved.id, input: { archived: true } })).toEqual(archived);
  const renamed = updateBoard({ id: saved.id, input: { displayName: " Ramp careers " } });
  expect(renamed).toEqual({
    ...archived,
    displayName: "Ramp careers",
    updatedAt: "2026-10-27T12:00:00.000Z",
  });

  vi.setSystemTime(new Date("2026-10-27T13:00:00Z"));
  const restored = updateBoard({ id: saved.id, input: { archived: false, displayName: "Ramp" } });
  expect(restored).toEqual({
    ...saved,
    updatedAt: "2026-10-27T13:00:00.000Z",
    refreshGeneration: 2,
  });
  vi.setSystemTime(new Date("2026-10-27T14:00:00Z"));
  expect(updateBoard({ id: saved.id, input: { archived: false } })).toEqual(restored);
});

it.each([
  { displayName: " " },
  { displayName: "x".repeat(121) },
  { canonicalUrl: "https://jobs.lever.co/replacement" },
  { archived: "true" },
  {},
])("rejects invalid patches and preserves the stored row: %j", (input) => {
  storage();
  const saved = createBoard(ramp);
  expect(() => updateBoard({ id: saved.id, input })).toThrow(BoardRequestError);
  expect(listBoards()).toEqual([saved]);
});

it("keeps stored data after a real failed write and does not call it a duplicate", () => {
  const { connection } = storage();
  const saved = createBoard(ramp);
  connection.db.$client.pragma("query_only = ON");
  expect(() =>
    createBoard({ displayName: "MoonPay", url: "https://jobs.lever.co/moonpay" }),
  ).toThrow(/readonly|Failed query/i);
  expect(() => updateBoard({ id: saved.id, input: { displayName: "Cannot save" } })).toThrow(
    /readonly|Failed query/i,
  );
  expect(listBoards()).toEqual([saved]);
});

it("sorts newest first with a deterministic ID tie-breaker", () => {
  const { connection } = storage();
  const first = createBoard(ramp);
  const second = createBoard({ displayName: "MoonPay", url: "https://jobs.lever.co/moonpay" });
  connection.db
    .update(boards)
    .set({ createdAt: first.createdAt })
    .where(eq(boards.id, second.id))
    .run();
  expect(listBoards().map((board) => board.id)).toEqual([first.id, second.id].sort().reverse());
});
