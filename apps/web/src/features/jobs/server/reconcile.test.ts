import { boards, postings, refreshTasks } from "@job-board/db/schema";
import { eq, isNull } from "drizzle-orm";
import { expect, it, vi } from "vitest";

import { normalizedJob } from "../../../../../../packages/job-boards/test/fixtures/postings.ts";
import { beginRefresh, indexingStorage, initialTime } from "../../../../test/indexing.ts";
import { failClaim, latestRefreshes } from "@/features/refresh/server/store";

import { reconcileSnapshot, replacePosting } from "./reconcile";
import { jobDetails, listJobs } from "./service";

vi.mock("server-only", () => ({}));

it("reconciles content, additions and absences atomically with independent UUID incarnations", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob("one"), normalizedJob("two")] },
    now: initialTime,
  });
  const original = db.select().from(postings).all();
  const later = "2026-10-27T10:00:10.000Z";
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id, later),
    snapshot: {
      postings: [normalizedJob("one", { title: "Updated title" }), normalizedJob("three")],
    },
    now: later,
  });
  expect(
    db.select().from(postings).where(eq(postings.externalReference, "one")).get(),
  ).toMatchObject({
    id: original.find((job) => job.externalReference === "one")?.id,
    title: "Updated title",
    contentUpdatedAt: later,
  });
  expect(
    db.select().from(postings).where(eq(postings.externalReference, "two")).get(),
  ).toMatchObject({ unavailableAt: later, lastSeenAt: initialTime, unavailableReason: "missing" });
  const newest = "2026-10-27T10:00:20.000Z";
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id, newest),
    snapshot: { postings: [normalizedJob("two", { title: "Different opening" })] },
    now: newest,
  });
  const incarnations = db
    .select()
    .from(postings)
    .where(eq(postings.externalReference, "two"))
    .all();
  expect(incarnations).toHaveLength(2);
  expect(new Set(incarnations.map((job) => job.id)).size).toBe(2);
  expect(incarnations.filter((job) => job.unavailableAt === null)).toHaveLength(1);
  expect(db.select().from(boards).get()?.lastSuccessfulRefreshAt).toBe(newest);
});

it("keeps content timestamps stable across raw-only changes and isolates references by board", () => {
  const { db, addBoard } = indexingStorage();
  const first = addBoard();
  const second = addBoard("https://jobs.ashbyhq.com/other");
  for (const board of [first, second])
    reconcileSnapshot({
      db,
      claim: beginRefresh(db, board.id),
      snapshot: { postings: [normalizedJob()] },
      now: initialTime,
    });
  const later = "2026-10-27T10:00:10.000Z";
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, first.id, later),
    snapshot: { postings: [normalizedJob("source-one", { raw: { futureField: true } })] },
    now: later,
  });
  expect(db.select().from(postings).where(eq(postings.boardId, first.id)).get()).toMatchObject({
    contentUpdatedAt: initialTime,
    lastSeenAt: later,
    raw: { futureField: true },
  });
  expect(db.select().from(postings).where(eq(postings.boardId, second.id)).get()).toMatchObject({
    lastSeenAt: initialTime,
    unavailableAt: null,
  });
});

it("reports cached current postings when a successful refresh makes no listing changes", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  for (const [index, snapshot] of [
    { postings: [normalizedJob("one"), normalizedJob("two")] },
    { postings: [normalizedJob("one")] },
    { postings: [normalizedJob("one")] },
  ].entries()) {
    const now = new Date(Date.parse(initialTime) + index * 10_000).toISOString();
    reconcileSnapshot({ db, claim: beginRefresh(db, board.id, now), snapshot, now });
  }
  expect(latestRefreshes(db)[0]).toMatchObject({
    state: "succeeded",
    newCount: 0,
    updatedCount: 0,
    unavailableCount: 0,
    cachedCount: 1,
  });
});

it("rolls back all changes on a real uniqueness failure and preserves the last success", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const before = db.select().from(postings).all();
  const claim = beginRefresh(db, board.id);
  expect(() =>
    reconcileSnapshot({
      db,
      claim,
      snapshot: {
        postings: [
          normalizedJob("source-one", { title: "Must roll back" }),
          normalizedJob("new"),
          normalizedJob("new"),
        ],
      },
      now: initialTime,
    }),
  ).toThrow(/constraint|Failed query/i);
  expect(db.select().from(postings).all()).toEqual(before);
  expect(db.select().from(refreshTasks).where(eq(refreshTasks.id, claim.taskId)).get()?.state).toBe(
    "running",
  );
  expect(
    failClaim({ db, claim, code: "STORAGE", message: "Could not save.", now: initialTime }),
  ).toBe(true);
  expect(db.select().from(boards).get()?.lastSuccessfulRefreshAt).toBe(initialTime);
});

it("accepts a complete empty snapshot and retains offline history and details", () => {
  const { db, addBoard, connection, workspace } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const original = db.select().from(postings).get();
  if (!original) throw new Error("Missing fixture posting.");
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [] },
    now: initialTime,
  });
  expect(listJobs({ db, input: { view: "open", page: 1 } }).total).toBe(0);
  expect(listJobs({ db, input: { view: "history", page: 1 } }).total).toBe(1);
  connection.close();
  expect(jobDetails({ db: workspace.connect().db, id: original.id })).toMatchObject({
    descriptionPlain: original.descriptionPlain,
    unavailableReason: "missing",
  });
});

it("replaces only the targeted current incarnation and lets an overlapping refresh resolve the new mapping", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const original = db.select().from(postings).get();
  if (!original) throw new Error("Missing fixture posting.");
  const claim = beginRefresh(db, board.id);
  const newId = replacePosting({ db, id: original.id, now: "2026-10-27T10:00:01.000Z" });
  expect(newId).not.toBe(original.id);
  expect(jobDetails({ db, id: original.id }).unavailableReason).toBe("superseded");
  expect(jobDetails({ db, id: newId }).lastSeenAt).toBe(initialTime);
  expect(() => replacePosting({ db, id: original.id })).toThrow(
    expect.objectContaining({ status: 409 }),
  );
  reconcileSnapshot({
    db,
    claim,
    snapshot: { postings: [normalizedJob("source-one", { title: "Newest content" })] },
    now: "2026-10-27T10:00:02.000Z",
  });
  expect(db.select().from(postings).where(isNull(postings.unavailableAt)).get()).toMatchObject({
    id: newId,
    title: "Newest content",
  });
});

it("paginates local history consistently and clamps out-of-range pages", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: Array.from({ length: 52 }, (_, i) => normalizedJob(String(i))) },
    now: initialTime,
  });
  const first = listJobs({ db, input: { view: "open", page: 1 } });
  const last = listJobs({ db, input: { view: "open", page: 900 } });
  expect(first.jobs).toHaveLength(50);
  expect(last).toMatchObject({ total: 52, page: 2, jobs: expect.any(Array) });
  expect(last.jobs).toHaveLength(2);
  expect(new Set([...first.jobs, ...last.jobs].map((job) => job.id)).size).toBe(52);
  expect(first.jobs[0]).not.toHaveProperty("raw");
  expect(first.jobs[0]).not.toHaveProperty("descriptionPlain");
});
