import "server-only";

import type { z } from "zod";

import type { BoardErrorResponse } from "../schemas";

export class BoardRequestError extends Error {
  readonly status: number;
  readonly error: BoardErrorResponse["error"];

  constructor({ status, error }: { status: number; error: BoardErrorResponse["error"] }) {
    super(error.message);
    this.status = status;
    this.error = error;
  }
}

export function invalidInput(error: z.ZodError) {
  const messages = (field: string) =>
    error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
  const displayName = messages("displayName");
  const url = messages("url");

  return new BoardRequestError({
    status: 400,
    error: {
      code: "INVALID_INPUT",
      message: "Check the submitted board information and try again.",
      fieldErrors: {
        ...(displayName.length ? { displayName } : {}),
        ...(url.length ? { url } : {}),
      },
    },
  });
}

export function* errorCauses(error: unknown): Generator<Error> {
  const seen = new Set<Error>();
  while (error instanceof Error && !seen.has(error)) {
    seen.add(error);
    yield error;
    error = error.cause;
  }
}
