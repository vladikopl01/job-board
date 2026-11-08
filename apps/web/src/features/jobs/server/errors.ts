import "server-only";

import { errorResponse as storageErrorResponse, jsonResponse } from "@/features/boards/server/http";

export class IndexRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAt: string | null;

  constructor(status: number, code: string, message: string, retryAt: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAt = retryAt;
  }
}

export function indexingErrorResponse(cause: unknown) {
  if (!(cause instanceof IndexRequestError)) return storageErrorResponse(cause);
  const response = jsonResponse(
    { error: { code: cause.code, message: cause.message, retryAt: cause.retryAt } },
    cause.status,
  );
  if (cause.status === 429 && cause.retryAt) {
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil((Date.parse(cause.retryAt) - Date.now()) / 1000))),
    );
  }
  return response;
}
