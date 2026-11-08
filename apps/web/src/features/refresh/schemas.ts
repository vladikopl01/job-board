import { z } from "zod";

import { internalIdSchema } from "@/features/jobs/schemas";

export const refreshResultSchema = z.object({
  id: internalIdSchema,
  finishedAt: z.iso.datetime(),
  newCount: z.int().nonnegative(),
  updatedCount: z.int().nonnegative(),
  unavailableCount: z.int().nonnegative(),
  cachedCount: z.int().nonnegative(),
});

export const refreshSummarySchema = z.object({
  id: internalIdSchema,
  boardId: internalIdSchema,
  state: z.enum(["queued", "running", "succeeded", "failed", "interrupted", "cancelled"]),
  phase: z.enum(["queued", "fetching", "confirming", "finished"]),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  newCount: z.int().nonnegative().nullable(),
  updatedCount: z.int().nonnegative().nullable(),
  unavailableCount: z.int().nonnegative().nullable(),
  cachedCount: z.int().nonnegative().nullable(),
  lastSuccessfulResult: refreshResultSchema.nullable(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  retryAt: z.iso.datetime().nullable(),
});
export const refreshBatchInputSchema = z.strictObject({
  source: z.enum(["app-visit", "manual"]).default("app-visit"),
});
export const refreshesResponseSchema = z.object({ refreshes: z.array(refreshSummarySchema) });
export const refreshAcceptedSchema = z.object({ taskId: internalIdSchema });
export const refreshBatchSchema = z.object({
  results: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("accepted"),
        boardId: internalIdSchema,
        taskId: internalIdSchema,
      }),
      z.object({
        kind: z.literal("deferred"),
        boardId: internalIdSchema,
        retryAt: z.iso.datetime().nullable(),
      }),
    ]),
  ),
});
export type RefreshSummary = z.infer<typeof refreshSummarySchema>;
export type RefreshResult = z.infer<typeof refreshResultSchema>;
export type RefreshBatch = z.infer<typeof refreshBatchSchema>;
export function refreshPending(task: RefreshSummary) {
  return task.state === "queued" || task.state === "running";
}
