import type { z } from "zod";

import { indexingErrorSchema } from "./schemas";

export class IndexApiError extends Error {
  readonly code: string;
  readonly retryAt: string | null;
  constructor(detail: z.infer<typeof indexingErrorSchema>["error"]) {
    super(detail.message);
    this.code = detail.code;
    this.retryAt = detail.retryAt ?? null;
  }
}

export async function localRequest<T>(
  schema: z.ZodType<T>,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = indexingErrorSchema.safeParse(body);
    if (error.success) throw new IndexApiError(error.data.error);
    throw new Error("The local app returned an unexpected response.");
  }
  return schema.parse(body);
}

export function jsonMutation() {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
}

export function indexErrorMessage(error: unknown) {
  return error instanceof IndexApiError
    ? error.message
    : "Couldn’t reach the local app. Check that it is running, then retry.";
}
