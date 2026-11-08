import { normalizedPostingSchema } from "../../src/posting.ts";

export function ashbyJob(id = "source-one", extra: Record<string, unknown> = {}) {
  return {
    id,
    title: "Software Engineer",
    location: "Spain",
    isListed: true,
    isRemote: true,
    workplaceType: "Hybrid",
    descriptionHtml: "<p>Build useful software.</p>",
    jobUrl: `https://jobs.ashbyhq.com/example/${id}`,
    applyUrl: `https://jobs.ashbyhq.com/example/${id}/application`,
    ...extra,
  };
}

export function leverJob(id = "source-one", extra: Record<string, unknown> = {}) {
  return {
    id,
    text: "Frontend Engineer",
    categories: { location: "Europe", allLocations: ["Europe", "Spain"], team: "Engineering" },
    workplaceType: "remote",
    description: "<p>Opening</p><p>Body</p>",
    opening: "<p>Opening</p>",
    descriptionBody: "<p>Body</p>",
    lists: [{ text: "Requirements", content: "<ul><li>TypeScript</li></ul>" }],
    additional: "<p>Benefits</p>",
    salaryDescriptionPlain: "EUR 80,000 per year",
    salaryRange: { min: 80000, max: 100000, currency: "EUR", interval: "per-year-salary" },
    hostedUrl: `https://jobs.lever.co/example/${id}`,
    applyUrl: `https://jobs.lever.co/example/${id}/apply`,
    ...extra,
  };
}

export function normalizedJob(id = "source-one", extra: Record<string, unknown> = {}) {
  return normalizedPostingSchema.parse({
    externalReference: id,
    title: "Software Engineer",
    descriptionPlain: "Build useful software.",
    descriptionHtml: "<p>Build useful software.</p>",
    jobUrl: `https://jobs.ashbyhq.com/example/${id}`,
    applyUrl: `https://jobs.ashbyhq.com/example/${id}/application`,
    locations: [{ text: "Spain", country: "ESP", address: null }],
    workplaceType: "hybrid",
    department: "Engineering",
    team: null,
    employmentType: null,
    compensation: null,
    publishedAt: null,
    raw: { source: "fixture" },
    ...extra,
  });
}
