import { vi } from "vitest";
import { departmentsFor, geographyForLocations } from "@job-board/job-boards";
import { isActiveFilter } from "../src/components/collection/query-schema";
import type { CollectionFilterItem } from "../src/components/collection/query-schema";
import { matchesFilter } from "../src/lib/data-table-filters";

import {
  jobListInputSchema,
  readStateInputSchema,
  type JobDetail,
} from "../src/features/jobs/schemas";
import { boardFixture, detailFixture, fixtureTime } from "./job-fixtures";

export function inboxJobs(count: number): JobDetail[] {
  return Array.from({ length: count }, (_, i) => ({
    ...detailFixture,
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    title: `Role ${i + 1}`,
    firstSeenAt: new Date(Date.parse(fixtureTime) - i * 1000).toISOString(),
  }));
}

export function deferred() {
  let resolve: () => void = () => {
    throw new Error("Deferred response was not initialized.");
  };
  const promise = new Promise<void>((release) => {
    resolve = release;
  });
  return { promise, resolve };
}

export function inboxApi(jobs = inboxJobs(3)) {
  const state: {
    jobs: JobDetail[];
    failWrites: boolean;
    failCounts: boolean;
    failDetails: boolean;
    writeGate: Promise<void> | undefined;
    detailGate: Promise<void> | undefined;
    countGate: Promise<void> | undefined;
    listGate: Promise<void> | undefined;
  } = {
    jobs,
    failWrites: false,
    failCounts: false,
    failDetails: false,
    writeGate: undefined,
    detailGate: undefined,
    countGate: undefined,
    listGate: undefined,
  };
  const failure = () =>
    Response.json(
      { error: { code: "STORAGE_ERROR", message: "Local storage is unavailable." } },
      { status: 500 },
    );
  const current = (job: JobDetail) => job.unavailableAt === null && job.boardArchivedAt === null;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/jobs/read-state" && init?.method === "POST") {
      const change = readStateInputSchema.parse(JSON.parse(String(init.body)));
      await state.writeGate;
      if (state.failWrites) return failure();
      state.jobs = state.jobs.map((job) =>
        change.ids.includes(job.id)
          ? { ...job, readAt: change.read ? (job.readAt ?? fixtureTime) : null }
          : job,
      );
      return Response.json({
        postings: state.jobs
          .filter((job) => change.ids.includes(job.id))
          .map(({ id, readAt }) => ({ id, readAt })),
      });
    }
    if (url.pathname === "/api/boards") return Response.json({ boards: [boardFixture] });
    if (url.pathname === "/api/jobs/unread-count") {
      await state.countGate;
      if (state.failCounts) return failure();
      return Response.json({
        unreadCount: state.jobs.filter((job) => current(job) && job.readAt === null).length,
      });
    }
    if (url.pathname === "/api/jobs") {
      await state.listGate;
      init?.signal?.throwIfAborted();
      const {
        view,
        readStatus,
        filters = [],
        sort = [],
        join = "and",
        page: requested,
        q,
        boardId,
        pageSize: requestedSize,
      } = jobListInputSchema.parse(Object.fromEntries(url.searchParams));
      function value(job: JobDetail, field: string) {
        if (field === "readStatus") return job.readAt ? "read" : "unread";
        if (field === "availability") return current(job) ? "open" : "history";
        if (field === "locations") return job.locations.map((place) => place.text).join(", ");
        if (field === "title") return job.title;
        if (field === "company") return job.company;
        if (field === "provider") return job.provider;
        if (field === "workplaceType") return job.workplaceType;
        if (field === "boardId") return job.boardId;
        return job.firstSeenAt;
      }
      const activeFilters = filters.filter(isActiveFilter);
      function matches(job: JobDetail, filter: CollectionFilterItem) {
        const memberships =
          filter.id === "department"
            ? departmentsFor(job)
            : filter.id === "country"
              ? geographyForLocations(job.locations).countries
              : filter.id === "region"
                ? geographyForLocations(job.locations).regions
                : null;
        if (!memberships) return matchesFilter(value(job, filter.id), filter);
        if (filter.operator === "isEmpty") return memberships.length === 0;
        if (filter.operator === "isNotEmpty") return memberships.length > 0;
        const selected = Array.isArray(filter.value) ? filter.value : [filter.value];
        const found = selected.some((value) =>
          value === "unknown" ? memberships.length === 0 : memberships.includes(value),
        );
        return filter.operator === "ne" ? !found : found;
      }
      const filtered = state.jobs
        .filter(
          (job) =>
            (!boardId || job.boardId === boardId) &&
            (!q || `${job.title} ${job.descriptionPlain}`.toLowerCase().includes(q.toLowerCase())),
        )
        .filter((job) =>
          view === "all"
            ? readStatus === "read"
              ? job.readAt !== null
              : readStatus !== "unread" || job.readAt === null
            : view === "history"
              ? !current(job)
              : current(job) &&
                (view === "unread"
                  ? job.readAt === null
                  : readStatus === "read"
                    ? job.readAt !== null
                    : readStatus !== "unread" || job.readAt === null),
        )
        .filter(
          (job) =>
            !activeFilters.length ||
            (join === "or"
              ? activeFilters.some((filter) => matches(job, filter))
              : activeFilters.every((filter) => matches(job, filter))),
        )
        .sort((a, b) => {
          for (const item of sort) {
            const compared = value(a, item.id).localeCompare(value(b, item.id), undefined, {
              sensitivity: "base",
            });
            if (compared) return item.desc ? -compared : compared;
          }
          return sort.length
            ? b.id.localeCompare(a.id)
            : b.firstSeenAt.localeCompare(a.firstSeenAt) || b.id.localeCompare(a.id);
        });
      // Small pages exercise selection and pagination without fifty duplicate UI fixtures.
      const pageSize = requestedSize ?? 2;
      const page = Math.min(requested, Math.max(1, Math.ceil(filtered.length / pageSize)));
      return Response.json({
        jobs: filtered.slice((page - 1) * pageSize, page * pageSize),
        page,
        total: filtered.length,
        pageSize,
        boardCount: 1,
        indexedBoardCount: 1,
      });
    }
    if (url.pathname.startsWith("/api/jobs/")) {
      await state.detailGate;
      init?.signal?.throwIfAborted();
      if (state.failDetails) return failure();
      const posting = state.jobs.find((job) => url.pathname === `/api/jobs/${job.id}`);
      return posting
        ? Response.json({ posting })
        : Response.json(
            { error: { code: "NOT_FOUND", message: "This posting was not found." } },
            { status: 404 },
          );
    }
    throw new Error(`Unexpected local request: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return {
    state,
    fetcher,
    writes: () => fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  };
}
