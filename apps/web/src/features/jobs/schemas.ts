import { normalizedPostingSchema } from "@job-board/job-boards";
import { z } from "zod";
import { jsonQuery, joinOperatorSchema } from "@/components/collection/query-schema";
import { jobFiltersSchema, jobSortsSchema } from "./collection-schema";

export const internalIdSchema = z.uuid();
export const emptyMutationSchema = z.strictObject({});
export const readStatusFilterSchema = z.enum(["all", "unread", "read"]);
export const jobListInputSchema = z.object({
  view: z.enum(["unread", "open", "history", "all"]).default("unread"),
  readStatus: readStatusFilterSchema.optional(),
  q: z.string().trim().max(200).optional(),
  boardId: internalIdSchema.optional(),
  filters: jsonQuery(jobFiltersSchema).optional(),
  sort: jsonQuery(jobSortsSchema).optional(),
  join: joinOperatorSchema.optional(),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
    .optional(),
});
export const jobListItemSchema = z.object({
  id: internalIdSchema,
  boardId: internalIdSchema,
  company: z.string(),
  provider: z.enum(["ashby", "lever"]),
  sourceHost: z.string(),
  canonicalUrl: z.url(),
  applyUrl: normalizedPostingSchema.shape.applyUrl,
  boardArchivedAt: z.iso.datetime().nullable(),
  title: z.string(),
  locations: normalizedPostingSchema.shape.locations,
  workplaceType: normalizedPostingSchema.shape.workplaceType,
  department: normalizedPostingSchema.shape.department.default(null),
  team: normalizedPostingSchema.shape.team.default(null),
  firstSeenAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
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
  employmentType: normalizedPostingSchema.shape.employmentType,
  compensation: normalizedPostingSchema.shape.compensation,
  publishedAt: normalizedPostingSchema.shape.publishedAt,
  lastSeenAt: z.iso.datetime(),
});
export const jobResponseSchema = z.object({ posting: jobDetailSchema });
export const replacementResponseSchema = z.object({ id: internalIdSchema });
export const readStateInputSchema = z.strictObject({
  ids: z
    .array(internalIdSchema)
    .min(1)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length),
  read: z.boolean(),
});
export const readStateResponseSchema = z.object({
  postings: z.array(z.object({ id: internalIdSchema, readAt: z.iso.datetime().nullable() })),
});
export const unreadCountSchema = z.object({ unreadCount: z.int().nonnegative() });
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
export type ReadStateInput = z.infer<typeof readStateInputSchema>;

export function jobAvailability(job: Pick<JobListItem, "unavailableReason" | "boardArchivedAt">) {
  return job.unavailableReason === "superseded"
    ? "Superseded"
    : job.unavailableReason === "missing"
      ? "Unavailable"
      : job.boardArchivedAt
        ? "Board archived"
        : "Open";
}
