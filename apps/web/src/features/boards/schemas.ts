import { identifyBoardUrl } from "@job-board/job-boards";
import { z } from "zod";

export const boardIdSchema = z.uuid();

export const boardDisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a company name.")
  .max(120, "Use 120 characters or fewer for the company name.");

export const boardUrlSchema = z
  .string()
  .max(2048, "Use a board URL with 2048 characters or fewer.")
  .superRefine((value, context) => {
    const result = identifyBoardUrl(value);
    if (!result.success) {
      context.addIssue({ code: "custom", message: result.message });
    }
  });

export const boardCreateSchema = z.strictObject({
  displayName: boardDisplayNameSchema,
  url: boardUrlSchema,
});

export const boardNameRequestSchema = z.strictObject({ url: boardUrlSchema });
export const boardNameSuggestionSchema = z.strictObject({
  displayName: boardDisplayNameSchema,
  source: z.enum(["metadata", "slug"]),
});

export const boardPatchSchema = z
  .strictObject({
    displayName: boardDisplayNameSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine((input) => input.displayName !== undefined || input.archived !== undefined, {
    message: "Provide a company name or archive state.",
  });

export const boardSchema = z
  .strictObject({
    id: boardIdSchema,
    provider: z.enum(["ashby", "lever"]),
    sourceHost: z.enum(["jobs.ashbyhq.com", "jobs.lever.co", "jobs.eu.lever.co"]),
    boardKey: z.string().min(1),
    canonicalUrl: z.string(),
    displayName: boardDisplayNameSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    archivedAt: z.iso.datetime().nullable(),
  })
  .refine((board) => {
    const result = identifyBoardUrl(board.canonicalUrl);
    return (
      result.success &&
      result.source.canonicalUrl === board.canonicalUrl &&
      result.source.provider === board.provider &&
      result.source.sourceHost === board.sourceHost &&
      result.source.boardKey === board.boardKey
    );
  }, "The board source is invalid.");

export const boardsResponseSchema = z.strictObject({ boards: z.array(boardSchema) });
export const boardResponseSchema = z.strictObject({ board: boardSchema });

const fieldErrorsSchema = z.strictObject({
  displayName: z.array(z.string()).optional(),
  url: z.array(z.string()).optional(),
});

export const boardErrorResponseSchema = z.strictObject({
  error: z.discriminatedUnion("code", [
    z.strictObject({
      code: z.literal("DUPLICATE_BOARD"),
      message: z.string(),
      existingBoard: z.strictObject({ id: boardIdSchema, archived: z.boolean() }),
    }),
    z.strictObject({
      code: z.enum([
        "INVALID_INPUT",
        "INVALID_JSON",
        "FORBIDDEN",
        "UNSUPPORTED_MEDIA_TYPE",
        "NOT_FOUND",
        "STORAGE_NOT_READY",
        "STORAGE_ERROR",
      ]),
      message: z.string(),
      fieldErrors: fieldErrorsSchema.optional(),
    }),
  ]),
});

export type Board = z.infer<typeof boardSchema>;
export type CreateBoardInput = z.infer<typeof boardCreateSchema>;
export type PatchBoardInput = z.infer<typeof boardPatchSchema>;
export type BoardErrorResponse = z.infer<typeof boardErrorResponseSchema>;
export type BoardNameSuggestion = z.infer<typeof boardNameSuggestionSchema>;
