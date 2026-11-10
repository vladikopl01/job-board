import { z } from "zod";

import type { BoardSource } from "./index.ts";
import { leverDescription, leverDescriptionSchema } from "./description.ts";
import { htmlToText } from "./html.ts";
import {
  employerUrlSchema,
  jsonValueSchema,
  normalizedPostingSchema,
  type NormalizedPosting,
  type PostingLocation,
} from "./posting.ts";
import { FeedError, type FeedSession } from "./transport.ts";

const optionalText = z.string().nullish();
const rawSchema = z.record(z.string(), jsonValueSchema);
const addressSchema = z.looseObject({
  addressCountry: optionalText,
  postalAddress: z.looseObject({ addressCountry: optionalText }).nullish(),
});

function location(text: string, address: unknown, country: string | null = null): PostingLocation {
  const parsed = address == null ? null : addressSchema.parse(address);
  return {
    text,
    country: country ?? parsed?.postalAddress?.addressCountry ?? parsed?.addressCountry ?? null,
    address: address == null ? null : jsonValueSchema.parse(address),
  };
}

const ashbySchema = z.looseObject({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1),
  location: optionalText,
  secondaryLocations: z
    .array(z.looseObject({ location: z.string(), address: jsonValueSchema.nullish() }))
    .nullish(),
  address: jsonValueSchema.nullish(),
  isListed: z.boolean().optional(),
  isRemote: z.boolean().nullish(),
  workplaceType: z.enum(["Remote", "Hybrid", "OnSite"]).nullish(),
  department: optionalText,
  team: optionalText,
  employmentType: optionalText,
  descriptionPlain: optionalText,
  descriptionHtml: optionalText,
  jobUrl: employerUrlSchema,
  applyUrl: employerUrlSchema,
  publishedAt: z.iso.datetime({ offset: true }).nullish(),
  compensation: jsonValueSchema.nullish(),
});

function ashbyPosting(input: unknown, source: BoardSource): NormalizedPosting | null {
  const visibility = z.object({ isListed: z.boolean().optional() }).parse(input);
  if (visibility.isListed === false) return null;
  const job = ashbySchema.parse(input);
  const url = new URL(job.jobUrl);
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const urlReference =
    url.hostname === "jobs.ashbyhq.com" && parts.length === 2 && parts[0] === source.boardKey
      ? parts[1]
      : undefined;
  if ((job.id && urlReference && job.id !== urlReference) || (!job.id && !urlReference)) {
    throw new FeedError("INVALID_FEED", "An Ashby posting has an ambiguous source reference.");
  }
  return normalizedPostingSchema.parse({
    externalReference: job.id ?? urlReference,
    title: job.title,
    descriptionPlain: job.descriptionPlain?.trim() || htmlToText(job.descriptionHtml ?? ""),
    descriptionHtml: job.descriptionHtml ?? null,
    jobUrl: job.jobUrl,
    applyUrl: job.applyUrl,
    locations: [
      ...(job.location == null ? [] : [location(job.location, job.address)]),
      ...(job.secondaryLocations ?? []).map((item) => location(item.location, item.address)),
    ],
    workplaceType:
      job.workplaceType === "Remote"
        ? "remote"
        : job.workplaceType === "Hybrid"
          ? "hybrid"
          : job.workplaceType === "OnSite"
            ? "on-site"
            : "unknown",
    department: job.department ?? null,
    team: job.team ?? null,
    employmentType: job.employmentType ?? null,
    compensation: job.compensation ?? null,
    publishedAt: job.publishedAt ?? null,
    raw: rawSchema.parse(input),
  });
}

const leverSchema = z.looseObject({
  ...leverDescriptionSchema.shape,
  id: z.string().min(1),
  text: z.string().trim().min(1),
  categories: z
    .looseObject({
      location: optionalText,
      allLocations: z.array(z.string()).nullish(),
      department: optionalText,
      team: optionalText,
      commitment: optionalText,
    })
    .optional(),
  country: optionalText,
  workplaceType: z
    .enum(["remote", "hybrid", "on-site", "onsite", "unspecified"])
    .transform((value) => (value === "onsite" ? "on-site" : value))
    .nullish(),
  salaryRange: z
    .looseObject({
      min: z.number().nullish(),
      max: z.number().nullish(),
      currency: optionalText,
      interval: optionalText,
    })
    .nullish(),
  hostedUrl: employerUrlSchema,
  applyUrl: employerUrlSchema,
  createdAt: z.number().int().nonnegative().nullish(),
});

function leverPosting(input: unknown): NormalizedPosting {
  const job = leverSchema.parse(input);
  const description = leverDescription(job);
  const salaryText = job.salaryDescriptionPlain?.trim() || htmlToText(job.salaryDescription ?? "");
  const locations = new Set(
    [job.categories?.location, ...(job.categories?.allLocations ?? [])].filter(
      (text) => typeof text === "string",
    ),
  );
  return normalizedPostingSchema.parse({
    externalReference: job.id,
    title: job.text,
    ...description,
    jobUrl: job.hostedUrl,
    applyUrl: job.applyUrl,
    locations: [...locations].map((text) => location(text, null, job.country ?? null)),
    workplaceType:
      job.workplaceType === "unspecified" || job.workplaceType == null
        ? "unknown"
        : job.workplaceType,
    department: job.categories?.department ?? null,
    team: job.categories?.team ?? null,
    employmentType: job.categories?.commitment ?? null,
    compensation:
      job.salaryRange == null && !salaryText
        ? null
        : {
            range: job.salaryRange == null ? null : jsonValueSchema.parse(job.salaryRange),
            description: salaryText || null,
          },
    publishedAt: job.createdAt == null ? null : new Date(job.createdAt).toISOString(),
    raw: rawSchema.parse(input),
  });
}

export async function fetchSnapshot(source: BoardSource, session: FeedSession) {
  try {
    const postings: NormalizedPosting[] = [];
    const seen = new Set<string>();
    function append(posting: NormalizedPosting | null) {
      if (!posting) return;
      if (seen.has(posting.externalReference))
        throw new FeedError("INVALID_FEED", "The board returned duplicate posting references.");
      seen.add(posting.externalReference);
      postings.push(posting);
      if (postings.length > session.limits.postings)
        throw new FeedError("LIMIT", "The board exceeded its posting limit.");
    }
    if (source.provider === "ashby") {
      const url = new URL(
        `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.boardKey)}`,
      );
      url.searchParams.set("includeCompensation", "true");
      const data = z
        .object({ apiVersion: z.literal("1"), jobs: z.array(z.unknown()) })
        .parse(await session.read(url));
      for (const input of data.jobs) append(ashbyPosting(input, source));
    } else {
      const origin =
        source.sourceHost === "jobs.eu.lever.co"
          ? "https://api.eu.lever.co"
          : "https://api.lever.co";
      let skip = 0;
      while (true) {
        const url = new URL(`${origin}/v0/postings/${encodeURIComponent(source.boardKey)}`);
        url.search = new URLSearchParams({
          mode: "json",
          limit: "100",
          skip: String(skip),
        }).toString();
        const page = z.array(z.unknown()).parse(await session.read(url));
        if (page.length === 0) break;
        for (const input of page) append(leverPosting(input));
        skip += page.length;
      }
    }
    session.signal.throwIfAborted();
    return { postings };
  } catch (cause) {
    if (cause instanceof FeedError) throw cause;
    throw new FeedError(
      "INVALID_FEED",
      "The provider returned an invalid or unsupported posting. Your saved jobs are unchanged.",
    );
  }
}
