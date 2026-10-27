import {
  boardErrorResponseSchema,
  boardNameSuggestionSchema,
  boardResponseSchema,
  boardsResponseSchema,
  type BoardErrorResponse,
  type CreateBoardInput,
  type PatchBoardInput,
} from "./schemas";

export class BoardApiError extends Error {
  readonly detail: BoardErrorResponse["error"];

  constructor(detail: BoardErrorResponse["error"]) {
    super(detail.message);
    this.name = "BoardApiError";
    this.detail = detail;
  }
}

async function readResponse(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const result = boardErrorResponseSchema.safeParse(body);
    if (result.success) throw new BoardApiError(result.data.error);
    throw new Error("The local app returned an unexpected response. Try again.");
  }
  return body;
}

export async function listBoards({ signal }: { signal: AbortSignal }) {
  const response = await fetch("/api/boards", { cache: "no-store", signal });
  const result = boardsResponseSchema.safeParse(await readResponse(response));
  if (!result.success) throw new Error("The saved boards could not be read. Try again.");
  return result.data.boards;
}

export async function suggestBoardName({ url, signal }: { url: string; signal: AbortSignal }) {
  const response = await fetch("/api/boards/name-suggestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    cache: "no-store",
    signal,
  });
  return boardNameSuggestionSchema.parse(await readResponse(response));
}

export async function createBoard(input: CreateBoardInput) {
  const response = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = boardResponseSchema.safeParse(await readResponse(response));
  if (!result.success) throw new Error("The saved board could not be read. Try again.");
  return result.data.board;
}

export async function updateBoard({ id, input }: { id: string; input: PatchBoardInput }) {
  const response = await fetch(`/api/boards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = boardResponseSchema.safeParse(await readResponse(response));
  if (!result.success) throw new Error("The updated board could not be read. Try again.");
  return result.data.board;
}

export function boardErrorMessage(error: unknown) {
  return error instanceof BoardApiError
    ? error.message
    : "Couldn’t reach the local app. Check that it is running, then try again.";
}

export function boardFieldErrors(error: unknown) {
  return error instanceof BoardApiError && error.detail.code !== "DUPLICATE_BOARD"
    ? error.detail.fieldErrors
    : undefined;
}
