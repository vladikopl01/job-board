import { normalizedPostingSchema } from "@job-board/job-boards";
import { z } from "zod";

export const internalIdSchema = z.uuid();
export const emptyMutationSchema = z.strictObject({});
export const jobListInputSchema = z.object({
  view: z.enum(["open", "history"]).default("open"),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
});
export const jobListItemSchema = z.object({
  id: internalIdSchema,
  boardId: internalIdSchema,
  company: z.string(),
  provider: z.enum(["ashby", "lever"]),
  sourceHost: z.string(),
  canonicalUrl: z.url(),
  boardArchivedAt: z.iso.datetime().nullable(),
  title: z.string(),
  locations: normalizedPostingSchema.shape.locations,
  workplaceType: normalizedPostingSchema.shape.workplaceType,
  firstSeenAt: z.iso.datetime(),
  unavailableAt: z.iso.datetime().nullable(),
  unavailableReason: z.enum(["missing", "superseded"]).nullable(),
});
export const jobListResponseSchema = z.object({
  jobs: z.array(jobListItemSchema),
  total: z.int().nonnegative(),
  page: z.int().positive(),
  pageSize: z.int().positive(),
  boardCount: z.int().nonnegative(),
  indexedBoardCount: z.int().nonnegative(),
});
export const jobDetailSchema = jobListItemSchema.extend({
  externalReference: z.string(),
  descriptionPlain: z.string(),
  descriptionHtml: z.string().nullable(),
  jobUrl: normalizedPostingSchema.shape.jobUrl,
  applyUrl: normalizedPostingSchema.shape.applyUrl,
  department: normalizedPostingSchema.shape.department,
  team: normalizedPostingSchema.shape.team,
  employmentType: normalizedPostingSchema.shape.employmentType,
  compensation: normalizedPostingSchema.shape.compensation,
  publishedAt: normalizedPostingSchema.shape.publishedAt,
  lastSeenAt: z.iso.datetime(),
});
export const jobResponseSchema = z.object({ posting: jobDetailSchema });
export const replacementResponseSchema = z.object({ id: internalIdSchema });
export const indexingErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryAt: z.iso.datetime().nullable().optional(),
  }),
});
export type JobListItem = z.infer<typeof jobListItemSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type JobListInput = z.infer<typeof jobListInputSchema>;

export function jobAvailability(job: Pick<JobListItem, "unavailableReason" | "boardArchivedAt">) {
  return job.unavailableReason === "superseded"
    ? "Superseded"
    : job.unavailableReason === "missing"
      ? "Unavailable"
      : job.boardArchivedAt
        ? "Board archived"
        : "Open";
}
