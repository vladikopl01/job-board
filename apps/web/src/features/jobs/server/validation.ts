import "server-only";

import type { z } from "zod";

import { IndexRequestError } from "./errors";

export function validated<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new IndexRequestError(
      400,
      "INVALID_INPUT",
      "Check the requested identifier or values and retry.",
    );
  return parsed.data;
}
