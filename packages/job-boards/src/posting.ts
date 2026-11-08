import { z } from "zod";

export const jsonValueSchema = z.json();
export type JsonValue = z.infer<typeof jsonValueSchema>;

export const employerUrlSchema = z.url().refine((input) => {
  const url = new URL(input);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Expected an HTTPS employer URL without credentials.");

export const postingLocationSchema = z.object({
  text: z.string(),
  country: z.string().nullable(),
  address: jsonValueSchema.nullable(),
});

export const normalizedPostingSchema = z.object({
  externalReference: z.string().min(1),
  title: z.string().trim().min(1),
  descriptionPlain: z.string(),
  descriptionHtml: z.string().nullable(),
  jobUrl: employerUrlSchema,
  applyUrl: employerUrlSchema,
  locations: z.array(postingLocationSchema),
  workplaceType: z.enum(["remote", "hybrid", "on-site", "unknown"]),
  department: z.string().nullable(),
  team: z.string().nullable(),
  employmentType: z.string().nullable(),
  compensation: jsonValueSchema.nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  raw: z.record(z.string(), jsonValueSchema),
});

export type NormalizedPosting = z.infer<typeof normalizedPostingSchema>;
export type PostingLocation = z.infer<typeof postingLocationSchema>;
export type PostingSnapshot = { postings: NormalizedPosting[] };
