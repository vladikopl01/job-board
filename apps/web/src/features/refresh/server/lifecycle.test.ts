import { boards, postings, refreshTasks } from "@job-board/db/schema";
import { expect, it, vi } from "vitest";

import {
  ashbyJob,
  leverJob,
  normalizedJob,
} from "../../../../../../packages/job-boards/test/fixtures/postings.ts";
import { beginRefresh, indexingStorage, initialTime } from "../../../../test/indexing.ts";
import { updateBoard } from "@/features/boards/server/service";
import { reconcileSnapshot } from "@/features/jobs/server/reconcile";
import { listJobs } from "@/features/jobs/server/service";

import { drainRefreshes } from "./coordinator";
import {
  claimNext,
  enqueueActiveBoards,
  enqueueRefresh,
  failClaim,
  latestRefreshes,
  type Database,
} from "./store";

vi.mock("server-only", () => ({}));
const getDatabase = vi.hoisted(() => vi.fn<() => Database>());
vi.mock("@/server/database", () => ({ getDatabase }));

it("coalesces requests across connections and enforces uniqueness at the database boundary", () => {
  const { db, addBoard, workspace } = indexingStorage();
  const board = addBoard();
  const first = enqueueRefresh({
    db,
    boardId: board.id,
    requestSource: "manual",
    now: initialTime,
  });
  const otherDb = workspace.connect().db;
  const second = enqueueRefresh({
    db: otherDb,
    boardId: board.id,
    requestSource: "app-visit",
    now: initialTime,
  });
  expect(second.id).toBe(first.id);
  expect(() =>
    otherDb
      .insert(refreshTasks)
      .values({
        id: crypto.randomUUID(),
        boardId: board.id,
        state: "queued",
        phase: "queued",
        requestSource: "manual",
        createdAt: initialTime,
      })
      .run(),
  ).toThrow(/constraint|Failed query/i);
  expect(claimNext({ db: otherDb, now: initialTime }).kind).toBe("claimed");
  expect(
    enqueueRefresh({ db, boardId: board.id, requestSource: "manual", now: initialTime }).id,
  ).toBe(first.id);
});

it("retains the last successful result while a later attempt queues, runs, or fails", () => {
  const { db, addBoard, workspace } = indexingStorage();
  const board = addBoard();
  const first = beginRefresh(db, board.id);
  reconcileSnapshot({
    db,
    claim: first,
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const priorResult = {
    id: first.taskId,
    finishedAt: initialTime,
    newCount: 1,
    updatedCount: 0,
    unavailableCount: 0,
    cachedCount: 0,
  };
  const now = "2026-10-27T10:00:10.000Z";
  enqueueRefresh({ db, boardId: board.id, requestSource: "manual", now });
  expect(latestRefreshes(workspace.connect().db)[0]).toMatchObject({
    state: "queued",
    lastSuccessfulResult: priorResult,
  });
  const next = claimNext({ db, now });
  if (next.kind !== "claimed") throw new Error("Missing next claim.");
  expect(latestRefreshes(db)[0]).toMatchObject({
    state: "running",
    lastSuccessfulResult: priorResult,
  });
  failClaim({ db, claim: next.claim, code: "TEST", message: "Provider unavailable.", now });
  expect(latestRefreshes(db)[0]).toMatchObject({
    state: "failed",
    lastSuccessfulResult: priorResult,
  });
  const final = beginRefresh(db, board.id, now);
  reconcileSnapshot({ db, claim: final, snapshot: { postings: [normalizedJob()] }, now });
  expect(latestRefreshes(db)[0]).toMatchObject({
    state: "succeeded",
    lastSuccessfulResult: {
      id: final.taskId,
      finishedAt: now,
      newCount: 0,
      updatedCount: 0,
      unavailableCount: 0,
      cachedCount: 1,
    },
  });
});

it("bounds claims to two across coordinators, then frees capacity on terminal outcomes", () => {
  const { db, addBoard, workspace } = indexingStorage();
  for (let i = 0; i < 3; i++)
    enqueueRefresh({
      db,
      boardId: addBoard(`https://jobs.ashbyhq.com/board-${i}`).id,
      requestSource: "manual",
      now: initialTime,
    });
  const first = claimNext({ db, now: initialTime });
  const second = claimNext({ db: workspace.connect().db, now: initialTime });
  expect(first.kind).toBe("claimed");
  expect(second.kind).toBe("claimed");
  expect(claimNext({ db, now: initialTime }).kind).toBe("wait");
  if (first.kind !== "claimed") throw new Error("Missing claim.");
  failClaim({
    db,
    claim: first.claim,
    code: "TEST",
    message: "Provider unavailable.",
    now: initialTime,
  });
  expect(claimNext({ db, now: initialTime }).kind).toBe("claimed");
});

it("does not steal unexpired ownership and fences interrupted or late completions", () => {
  const { db, addBoard } = indexingStorage();
  const claim = beginRefresh(db, addBoard().id);
  expect(claimNext({ db, now: "2026-10-27T10:00:10.000Z" }).kind).toBe("wait");
  expect(claimNext({ db, now: "2026-10-27T10:02:01.000Z" }).kind).toBe("idle");
  expect(latestRefreshes(db)[0]?.state).toBe("interrupted");
  expect(
    reconcileSnapshot({
      db,
      claim,
      snapshot: { postings: [normalizedJob()] },
      now: "2026-10-27T10:02:02.000Z",
    }),
  ).toBe(false);
  expect(
    failClaim({ db, claim, code: "LATE", message: "Late", now: "2026-10-27T10:02:02.000Z" }),
  ).toBe(false);
  expect(db.select().from(postings).all()).toEqual([]);
});

it("fences archive/restore races, preserves jobs and does not enqueue on management actions", () => {
  const { db, addBoard } = indexingStorage();
  getDatabase.mockReturnValue(db);
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const prior = db.select().from(postings).get();
  const claim = beginRefresh(db, board.id);
  updateBoard({ id: board.id, input: { archived: true } });
  expect(listJobs({ db, input: { view: "open", page: 1 } }).total).toBe(0);
  expect(listJobs({ db, input: { view: "history", page: 1 } }).jobs[0]).toMatchObject({
    unavailableAt: null,
    boardArchivedAt: expect.any(String),
  });
  updateBoard({ id: board.id, input: { archived: false } });
  expect(listJobs({ db, input: { view: "open", page: 1 } }).jobs[0]?.id).toBe(prior?.id);
  expect(listJobs({ db, input: { view: "history", page: 1 } }).total).toBe(0);
  expect(latestRefreshes(db)[0]?.state).toBe("cancelled");
  expect(db.select().from(boards).get()).toMatchObject({
    refreshGeneration: 2,
    lastSuccessfulRefreshAt: initialTime,
  });
  expect(reconcileSnapshot({ db, claim, snapshot: { postings: [] }, now: initialTime })).toBe(
    false,
  );
  expect(db.select().from(postings).get()).toEqual(prior);
  expect(db.select().from(refreshTasks).all()).toHaveLength(2);
  const fresh = beginRefresh(db, board.id);
  expect(
    reconcileSnapshot({
      db,
      claim: fresh,
      snapshot: { postings: [normalizedJob()] },
      now: initialTime,
    }),
  ).toBe(true);
  expect(db.select().from(postings).get()?.id).toBe(prior?.id);
});

it("honors provider cooldowns while accepting other active boards without fetching", () => {
  const { db, addBoard } = indexingStorage();
  const first = addBoard();
  const second = addBoard("https://jobs.lever.co/other");
  const claim = beginRefresh(db, first.id);
  failClaim({
    db,
    claim,
    code: "RATE_LIMIT",
    message: "Wait.",
    retryAt: "2026-10-27T10:01:00.000Z",
    now: initialTime,
  });
  expect(() =>
    enqueueRefresh({ db, boardId: first.id, requestSource: "manual", now: initialTime }),
  ).toThrow(expect.objectContaining({ status: 429 }));
  expect(enqueueActiveBoards({ db, now: initialTime })).toEqual(
    expect.arrayContaining([
      { kind: "deferred", boardId: first.id, retryAt: "2026-10-27T10:01:00.000Z" },
      { kind: "accepted", boardId: second.id, taskId: expect.any(String) },
    ]),
  );
  expect(
    enqueueRefresh({
      db,
      boardId: first.id,
      requestSource: "manual",
      now: "2026-10-27T10:01:01.000Z",
    }).state,
  ).toBe("queued");
});

it("drains more than one batch with bounded concurrency and independent failures", async () => {
  const { db, addBoard } = indexingStorage();
  for (let i = 0; i < 5; i++) addBoard(`https://jobs.ashbyhq.com/board-${i}`);
  enqueueActiveBoards({ db, now: initialTime });
  let running = 0;
  let peak = 0;
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    running++;
    peak = Math.max(peak, running);
    await Promise.resolve();
    running--;
    return String(input).includes("board-2")
      ? new Response("failed", { status: 503 })
      : Response.json({ apiVersion: "1", jobs: [ashbyJob()] });
  });
  await drainRefreshes({
    db,
    fetcher,
    clock: () => Date.parse(initialTime),
    sleep: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
    },
  });
  expect(peak).toBeLessThanOrEqual(2);
  expect(fetcher).toHaveBeenCalledTimes(5);
  expect(latestRefreshes(db).filter((task) => task.state === "succeeded")).toHaveLength(4);
  expect(latestRefreshes(db).filter((task) => task.state === "failed")).toHaveLength(1);
  expect(db.select().from(postings).all()).toHaveLength(4);
});

it("confirms Lever removals and keeps the prior index when reference sets change", async () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard("https://jobs.lever.co/example");
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob("old")] },
    now: initialTime,
  });
  enqueueRefresh({ db, boardId: board.id, requestSource: "manual", now: initialTime });
  const unstable = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json([leverJob("new")]))
    .mockResolvedValueOnce(Response.json([]));
  await drainRefreshes({
    db,
    fetcher: unstable,
    clock: () => Date.parse(initialTime),
    sleep: async () => {
      await Promise.resolve();
    },
  });
  expect(latestRefreshes(db)[0]).toMatchObject({ state: "failed", errorCode: "INVALID_FEED" });
  expect(db.select().from(postings).get()).toMatchObject({
    externalReference: "old",
    unavailableAt: null,
  });
  enqueueRefresh({ db, boardId: board.id, requestSource: "manual", now: initialTime });
  const empty = vi.fn<typeof fetch>().mockImplementation(async () => Response.json([]));
  await drainRefreshes({
    db,
    fetcher: empty,
    clock: () => Date.parse(initialTime),
    sleep: async () => {
      await Promise.resolve();
    },
  });
  expect(empty).toHaveBeenCalledTimes(2);
  expect(db.select().from(postings).get()?.unavailableReason).toBe("missing");
  expect(latestRefreshes(db)[0]?.state).toBe("succeeded");
});

it("recovers a prior process conservatively after waiting for its lease without replaying it", async () => {
  const { db, addBoard } = indexingStorage();
  beginRefresh(db, addBoard().id);
  let now = Date.parse(initialTime);
  const fetcher = vi.fn<typeof fetch>();
  await drainRefreshes({
    db,
    fetcher,
    clock: () => now,
    sleep: async () => {
      now += 121_000;
    },
  });
  expect(latestRefreshes(db)[0]?.state).toBe("interrupted");
  expect(fetcher).not.toHaveBeenCalled();
});
