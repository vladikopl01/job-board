import "server-only";

import { randomUUID } from "node:crypto";
import { boards } from "@job-board/db/schema";
import { identifyBoardUrl } from "@job-board/job-boards";
import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/server/database";

import { boardCreateSchema, boardIdSchema, boardPatchSchema, type Board } from "../schemas";
import { BoardRequestError, errorCauses, invalidInput } from "./errors";

export function listBoards(): Board[] {
  return getDatabase().select().from(boards).orderBy(desc(boards.createdAt), desc(boards.id)).all();
}

export function createBoard(input: unknown): Board {
  const parsed = boardCreateSchema.safeParse(input);
  if (!parsed.success) throw invalidInput(parsed.error);

  // Normalize on the server even when the caller already validated the form.
  const identified = identifyBoardUrl(parsed.data.url);
  if (!identified.success) {
    throw new BoardRequestError({
      status: 400,
      error: {
        code: "INVALID_INPUT",
        message: identified.message,
        fieldErrors: { url: [identified.message] },
      },
    });
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  try {
    const board = db
      .insert(boards)
      .values({
        id: randomUUID(),
        ...identified.source,
        displayName: parsed.data.displayName,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      })
      .returning()
      .get();
    if (!board) throw new Error("Board creation did not return the saved record.");
    return board;
  } catch (cause) {
    // Only this exact constraint is a duplicate; other write failures must remain failures.
    const duplicate = [...errorCauses(cause)].some(
      (error) =>
        "code" in error &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE" &&
        error.message ===
          "UNIQUE constraint failed: boards.provider, boards.source_host, boards.board_key",
    );
    if (duplicate) {
      const existing = db
        .select()
        .from(boards)
        .where(
          and(
            eq(boards.provider, identified.source.provider),
            eq(boards.sourceHost, identified.source.sourceHost),
            eq(boards.boardKey, identified.source.boardKey),
          ),
        )
        .get();
      if (existing) {
        throw new BoardRequestError({
          status: 409,
          error: {
            code: "DUPLICATE_BOARD",
            message: existing.archivedAt
              ? "This board is already saved in your archive. Restore it to track it again."
              : "This board is already in your tracking list.",
            existingBoard: { id: existing.id, archived: existing.archivedAt !== null },
          },
        });
      }
    }
    throw cause;
  }
}

export function updateBoard({ id, input }: { id: string; input: unknown }): Board {
  const parsedId = boardIdSchema.safeParse(id);
  if (!parsedId.success) throw invalidInput(parsedId.error);
  const parsed = boardPatchSchema.safeParse(input);
  if (!parsed.success) throw invalidInput(parsed.error);

  return getDatabase().transaction(
    (transaction) => {
      const current = transaction.select().from(boards).where(eq(boards.id, parsedId.data)).get();
      if (!current) {
        throw new BoardRequestError({
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: "This board was not found. Reload the list and retry.",
          },
        });
      }

      const displayName = parsed.data.displayName ?? current.displayName;
      const archived = parsed.data.archived ?? current.archivedAt !== null;
      if (displayName === current.displayName && archived === (current.archivedAt !== null)) {
        return current;
      }

      const now = new Date().toISOString();
      const archivedAt = archived ? (current.archivedAt ?? now) : null;
      const board = transaction
        .update(boards)
        .set({ displayName, archivedAt, updatedAt: now })
        .where(eq(boards.id, current.id))
        .returning()
        .get();
      if (!board) throw new Error("Board update did not return the saved record.");
      return board;
    },
    { behavior: "immediate" },
  );
}
