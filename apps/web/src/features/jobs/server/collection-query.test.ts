import { expect, it, vi } from "vitest";
import { boards, postings } from "@job-board/db/schema";
import { eq } from "drizzle-orm";

import { normalizedJob } from "../../../../../../packages/job-boards/test/fixtures/postings";
import { beginRefresh, indexingStorage, initialTime } from "../../../../test/indexing";
import type { CollectionFilterItem } from "@/components/collection/query-schema";
import { jobListInputSchema } from "../schemas";
import { reconcileSnapshot } from "./reconcile";
import { listJobs } from "./service";

vi.mock("server-only", () => ({}));

const text = (
  id: string,
  value: string,
  operator: CollectionFilterItem["operator"] = "iLike",
): CollectionFilterItem => ({ id, value, operator, variant: "text", filterId: `${id}-${value}` });
const select = (id: string, value: string): CollectionFilterItem => ({
  ...text(id, value, "eq"),
  variant: "select",
});

function fixture() {
  const { db, addBoard } = indexingStorage();
  const alpha = addBoard("https://jobs.ashbyhq.com/alpha");
  const beta = addBoard("https://jobs.lever.co/beta");
  for (const [board, count] of [
    [alpha, 24],
    [beta, 4],
  ] as const) {
    reconcileSnapshot({
      db,
      claim: beginRefresh(db, board.id),
      now: initialTime,
      snapshot: {
        postings: Array.from({ length: count }, (_, index) =>
          normalizedJob(`${board.id}-${index}`, {
            title: `Role ${String(index).padStart(2, "0")}`,
            workplaceType: board.id === alpha.id && index % 2 === 0 ? "remote" : "on-site",
          }),
        ),
      },
    });
  }
  return { db, alpha, beta };
}

it("applies compound conditions and all sorting before counting and paginating", () => {
  const { db } = fixture();
  const result = listJobs({
    db,
    input: {
      view: "open",
      page: 2,
      pageSize: 10,
      filters: [text("title", "Role"), select("workplaceType", "remote")],
      sort: [{ id: "title", desc: false }],
      join: "and",
    },
  });
  expect(result).toMatchObject({ total: 12, page: 2 });
  expect(result.jobs.map((job) => job.title)).toEqual(["Role 20", "Role 22"]);
  const multiSort = listJobs({
    db,
    input: {
      view: "open",
      page: 1,
      pageSize: 10,
      sort: [
        { id: "company", desc: true },
        { id: "title", desc: false },
      ],
    },
  });
  expect(multiSort.jobs.slice(0, 4).map((job) => [job.company, job.title])).toEqual([
    ["beta", "Role 00"],
    ["beta", "Role 01"],
    ["beta", "Role 02"],
    ["beta", "Role 03"],
  ]);
  expect(multiSort.jobs[4]?.title).toBe("Role 00");
});

it("combines OR conditions within the collection scope and ignores disabled and unfinished conditions", () => {
  const { db, alpha } = fixture();
  const result = listJobs({
    db,
    input: {
      view: "unread",
      boardId: alpha.id,
      page: 1,
      join: "or",
      filters: [
        text("title", "Role 00", "eq"),
        text("title", "Role 01", "eq"),
        { ...select("provider", "lever"), disabled: true },
        text("company", ""),
      ],
    },
  });
  expect(result.total).toBe(2);
  expect(result.jobs.every((job) => job.boardId === alpha.id && job.readAt === null)).toBe(true);
  expect(
    listJobs({
      db,
      input: {
        view: "open",
        page: 1,
        filters: [{ ...text("title", "never matches"), disabled: true }],
      },
    }).total,
  ).toBe(28);
});

it("filters availability before pagination and allows it to be paused, removed or combined with OR", () => {
  const { db, alpha, beta } = fixture();
  const [missing, superseded] = listJobs({
    db,
    input: { view: "open", boardId: alpha.id, page: 1 },
  }).jobs;
  if (!missing || !superseded) throw new Error("Missing postings.");
  for (const [job, reason] of [
    [missing, "missing"],
    [superseded, "superseded"],
  ] as const) {
    db.update(postings)
      .set({ unavailableAt: initialTime, unavailableReason: reason })
      .where(eq(postings.id, job.id))
      .run();
  }
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, beta.id)).run();
  const open = select("availability", "open");
  const history = select("availability", "history");
  const read = (filters: CollectionFilterItem[], join: "and" | "or" = "and") =>
    listJobs({ db, input: { view: "all", page: 1, pageSize: 10, filters, join } });
  expect(read([open])).toMatchObject({ total: 22, pageSize: 10 });
  expect(read([open]).jobs).toHaveLength(10);
  expect(read([history]).total).toBe(6);
  expect(read([{ ...open, operator: "ne" }]).total).toBe(6);
  expect(read([{ ...open, disabled: true }]).total).toBe(28);
  expect(read([]).total).toBe(28);
  expect(read([open, select("provider", "lever")], "or").total).toBe(26);
  expect(read([open, select("provider", "lever")]).total).toBe(0);
  expect(listJobs({ db, input: { view: "unread", page: 1, filters: [history] } }).total).toBe(0);
});

it("treats wildcard characters as literal text and supports location and empty-value conditions", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    now: initialTime,
    snapshot: {
      postings: [
        normalizedJob("literal", { title: "100%_! reliability", locations: [] }),
        normalizedJob("wildcard", { title: "100 percent reliability" }),
      ],
    },
  });
  const read = (filters: CollectionFilterItem[]) =>
    listJobs({ db, input: { view: "open", page: 1, filters } });
  expect(read([text("title", "%_!")]).jobs.map((job) => job.title)).toEqual(["100%_! reliability"]);
  expect(read([text("title", "%_!", "notILike")]).jobs.map((job) => job.title)).toEqual([
    "100 percent reliability",
  ]);
  expect(read([text("locations", "", "isEmpty")]).total).toBe(1);
  expect(read([text("locations", "Spain")]).total).toBe(1);
  expect(read([text("title", "100%_! RELIABILITY", "eq")]).total).toBe(1);
});

it("keeps equal sort values stable across page boundaries", () => {
  const { db } = fixture();
  const input = {
    view: "open",
    page: 1,
    pageSize: 10,
    sort: [{ id: "provider", desc: false }],
  } as const;
  const first = listJobs({ db, input: { ...input, sort: [...input.sort] } });
  const second = listJobs({ db, input: { ...input, page: 2, sort: [...input.sort] } });
  expect(new Set([...first.jobs, ...second.jobs].map((job) => job.id)).size).toBe(20);
  expect(listJobs({ db, input: { ...input, sort: [...input.sort] } }).jobs).toEqual(first.jobs);
});

it("filters source-backed geography and departments before totals and bounded pages", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    now: initialTime,
    snapshot: {
      postings: [
        ...Array.from({ length: 24 }, (_, index) =>
          normalizedJob(`es-${index}`, {
            title: `Role ${String(index).padStart(2, "0")}`,
            department: index % 2 ? "Software Engineering" : "Product Marketing",
            workplaceType: "remote",
          }),
        ),
        normalizedJob("eu", { locations: [{ text: "Remote (EU)", country: null, address: null }] }),
        normalizedJob("exclusions", {
          locations: [{ text: "Europe excluding Spain and Germany", country: null, address: null }],
        }),
        normalizedJob("city", {
          title: "Marketing lead",
          locations: [{ text: "Barcelona", country: null, address: null }],
          department: null,
        }),
        normalizedJob("unknown", { locations: [], department: null, team: null }),
        normalizedJob("other", {
          locations: [{ text: "Tokyo", country: "JP", address: null }],
          department: "Unfamiliar group",
          team: "Engineering",
        }),
        normalizedJob("team", {
          locations: [{ text: "Germany", country: null, address: null }],
          department: null,
          team: "Engineering",
        }),
      ],
    },
  });
  const before = db.select().from(postings).all();
  const read = (filters: CollectionFilterItem[], page = 1, join: "and" | "or" = "and") =>
    listJobs({
      db,
      input: {
        view: "all",
        page,
        pageSize: 10,
        filters,
        join,
        sort: [{ id: "title", desc: false }],
      },
    });
  const country = select("country", "ES");
  const engineering = select("department", "engineering");
  const result = read([country, engineering, select("workplaceType", "remote")], 2);
  expect(result).toMatchObject({ total: 12, page: 2, pageSize: 10 });
  expect(result.jobs.map((job) => job.title)).toEqual(["Role 21", "Role 23"]);
  expect(result.jobs[0]?.department).toBe("Software Engineering");
  expect(read([select("region", "europe")]).total).toBe(27);
  expect(read([select("country", "unknown")]).total).toBe(4);
  expect(read([{ ...country, operator: "isEmpty", value: "" }]).total).toBe(4);
  expect(read([{ ...country, operator: "isNotEmpty", value: "" }]).total).toBe(26);
  expect(read([{ ...country, operator: "ne" }]).total).toBe(6);
  expect(read([{ ...country, value: ["ES", "DE"] }]).total).toBe(25);
  expect(read([{ ...country, value: ["ES", "unknown"] }]).total).toBe(28);
  expect(read([{ ...country, value: ["ES", "unknown"], operator: "ne" }]).total).toBe(2);
  expect(read([select("department", "unknown")]).total).toBe(2);
  expect(read([select("department", "other")]).total).toBe(1);
  expect(read([country, engineering], 1, "or").total).toBe(27);
  expect(read([country, { ...engineering, disabled: true }]).total).toBe(24);
  expect(read([]).total).toBe(30);
  expect(db.select().from(postings).all()).toEqual(before);
});

it("uses the same discovery predicates for unread, unavailable and archived board records offline", () => {
  const { db, addBoard } = indexingStorage();
  const active = addBoard();
  const archived = addBoard("https://jobs.lever.co/archived");
  for (const board of [active, archived]) {
    reconcileSnapshot({
      db,
      claim: beginRefresh(db, board.id),
      now: initialTime,
      snapshot: { postings: [normalizedJob(`${board.id}-1`), normalizedJob(`${board.id}-2`)] },
    });
  }
  const first = db.select().from(postings).where(eq(postings.boardId, active.id)).get();
  if (!first) throw new Error("Missing posting.");
  db.update(postings)
    .set({ unavailableAt: initialTime, unavailableReason: "missing", readAt: initialTime })
    .where(eq(postings.id, first.id))
    .run();
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, archived.id)).run();
  const before = db.select().from(postings).all();
  const filters = [select("country", "ES"), select("department", "engineering")];
  expect(listJobs({ db, input: { view: "unread", filters, page: 1 } }).total).toBe(1);
  expect(listJobs({ db, input: { view: "history", filters, page: 1 } }).total).toBe(3);
  expect(
    listJobs({ db, input: { view: "all", boardId: archived.id, filters, page: 1 } }).total,
  ).toBe(2);
  expect(db.select().from(postings).all()).toEqual(before);
});

it.each([
  { filters: JSON.stringify([text("sql expression", "value")]) },
  { filters: JSON.stringify([{ ...select("provider", "ashby"), operator: "iLike" }]) },
  {
    filters: JSON.stringify(Array.from({ length: 13 }, (_, index) => text("title", String(index)))),
  },
  { filters: JSON.stringify([text("title", "same"), text("title", "same")]) },
  { sort: JSON.stringify([{ id: "descriptionPlain", desc: false }]) },
  {
    sort: JSON.stringify([
      { id: "title", desc: false },
      { id: "title", desc: true },
    ]),
  },
  { filters: "invalid JSON" },
  { filters: JSON.stringify([select("country", "Atlantis")]) },
  { filters: JSON.stringify([select("region", "arbitrary")]) },
  { filters: JSON.stringify([select("department", "Engineering")]) },
])("rejects unsupported or unbounded query state: %j", (query) => {
  expect(jobListInputSchema.safeParse({ view: "open", page: 1, ...query }).success).toBe(false);
});
