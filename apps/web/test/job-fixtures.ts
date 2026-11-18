import { normalizedJob } from "../../../packages/job-boards/test/fixtures/postings.ts";
import { jobDetailSchema } from "../src/features/jobs/schemas";
import { boardSchema } from "../src/features/boards/schemas";

export const postingId = "11111111-1111-4111-8111-111111111111";
export const boardId = "22222222-2222-4222-8222-222222222222";
export const fixtureTime = "2026-10-27T10:00:00.000Z";
export const boardFixture = boardSchema.parse({
  id: boardId,
  provider: "ashby",
  sourceHost: "jobs.ashbyhq.com",
  boardKey: "example",
  canonicalUrl: "https://jobs.ashbyhq.com/example",
  displayName: "Example",
  createdAt: fixtureTime,
  updatedAt: fixtureTime,
  archivedAt: null,
  lastSuccessfulRefreshAt: fixtureTime,
  refreshGeneration: 1,
});
export const detailFixture = jobDetailSchema.parse({
  ...normalizedJob(),
  id: postingId,
  boardId,
  company: "Example",
  provider: "ashby",
  sourceHost: "jobs.ashbyhq.com",
  canonicalUrl: "https://jobs.ashbyhq.com/example",
  firstSeenAt: fixtureTime,
  readAt: null,
  lastSeenAt: fixtureTime,
  boardArchivedAt: null,
  unavailableAt: null,
  unavailableReason: null,
});
export function listFixture(jobs = [detailFixture], page = 1, total = jobs.length) {
  return { jobs, page, total, pageSize: 50, boardCount: 1, indexedBoardCount: 1 };
}
