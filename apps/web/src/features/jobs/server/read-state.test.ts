import { boards } from "@job-board/db/schema";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";

import { normalizedJob } from "../../../../../../packages/job-boards/test/fixtures/postings.ts";
import { beginRefresh, indexingStorage, initialTime } from "../../../../test/indexing";
import { failClaim } from "@/features/refresh/server/store";

import { setReadState } from "./read-state";
import { reconcileSnapshot, replacePosting } from "./reconcile";
import { jobDetails, listJobs, unreadCount } from "./service";

vi.mock("server-only", () => ({}));

it("retains 21 unread across edits, failed refreshes, archival, restoration and reopening SQLite", () => {
  const { db, addBoard, connection, workspace } = indexingStorage();
  const board = addBoard();
  const first = Array.from({ length: 10 }, (_, i) => normalizedJob(String(i)));
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: first },
    now: initialTime,
  });
  const ids = listJobs({ db, input: { view: "unread", page: 1 } })
    .jobs.slice(0, 4)
    .map((job) => job.id);
  setReadState({ db, input: { ids, read: true }, now: initialTime });
  expect(unreadCount(db).unreadCount).toBe(6);
  const all = Array.from({ length: 25 }, (_, i) =>
    normalizedJob(String(i), { title: "Edited role" }),
  );
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: all },
    now: initialTime,
  });
  expect(unreadCount(db).unreadCount).toBe(21);
  expect(listJobs({ db, input: { view: "open", page: 1 } }).total).toBe(25);
  failClaim({
    db,
    claim: beginRefresh(db, board.id),
    code: "TRANSPORT",
    message: "Offline",
    now: initialTime,
  });
  expect(unreadCount(db).unreadCount).toBe(21);
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, board.id)).run();
  expect(unreadCount(db).unreadCount).toBe(0);
  expect(listJobs({ db, input: { view: "history", page: 1 } }).total).toBe(25);
  expect(jobDetails({ db, id: ids[0] ?? "" }).readAt).toBe(initialTime);
  db.update(boards).set({ archivedAt: null }).where(eq(boards.id, board.id)).run();
  connection.close();
  const reopened = workspace.connect().db;
  expect(unreadCount(reopened).unreadCount).toBe(21);
  expect(listJobs({ db: reopened, input: { view: "unread", page: 1 } }).total).toBe(21);
  expect(jobDetails({ db: reopened, id: ids[0] ?? "" }).readAt).toBe(initialTime);
});

it("retains old read state while replacements and observed reappearances start unread", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  const importJobs = (references: string[]) =>
    reconcileSnapshot({
      db,
      claim: beginRefresh(db, board.id),
      snapshot: { postings: references.map((id) => normalizedJob(id)) },
      now: initialTime,
    });
  importJobs(["one"]);
  const original = listJobs({ db, input: { view: "open", page: 1 } }).jobs[0];
  if (!original) throw new Error("Missing fixture posting.");
  setReadState({ db, input: { ids: [original.id], read: true }, now: initialTime });
  const replacement = replacePosting({ db, id: original.id, now: initialTime });
  expect(jobDetails({ db, id: original.id }).readAt).toBe(initialTime);
  expect(jobDetails({ db, id: replacement }).readAt).toBeNull();
  setReadState({ db, input: { ids: [replacement], read: true }, now: initialTime });
  importJobs([]);
  expect(unreadCount(db).unreadCount).toBe(0);
  importJobs(["one"]);
  const current = listJobs({ db, input: { view: "unread", page: 1 } }).jobs[0];
  expect(current).toMatchObject({ readAt: null });
  expect(current?.id).not.toBe(replacement);
  expect(jobDetails({ db, id: replacement }).readAt).toBe(initialTime);
  setReadState({ db, input: { ids: [original.id], read: false } });
  expect(unreadCount(db).unreadCount).toBe(1);
});

it("sets explicit states idempotently and rolls the whole selection back on missing targets or storage failure", () => {
  const { db, addBoard } = indexingStorage();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, addBoard().id),
    snapshot: { postings: [normalizedJob("one"), normalizedJob("two"), normalizedJob("three")] },
    now: initialTime,
  });
  const jobs = listJobs({ db, input: { view: "open", page: 1 } }).jobs;
  const ids = jobs.slice(0, 2).map((job) => job.id);
  expect(() =>
    setReadState({ db, input: { ids: [...ids, crypto.randomUUID()], read: true } }),
  ).toThrow(expect.objectContaining({ status: 404 }));
  expect(unreadCount(db).unreadCount).toBe(3);
  // A real SQLite abort verifies transaction rollback rather than mocking the ORM.
  db.$client.exec(`CREATE TRIGGER reject_read BEFORE UPDATE OF read_at ON postings
    WHEN OLD.external_reference = 'two' AND NEW.read_at IS NOT NULL
    BEGIN SELECT RAISE(ABORT, 'fixture write failure'); END`);
  expect(() => setReadState({ db, input: { ids: jobs.map((job) => job.id), read: true } })).toThrow(
    "fixture write failure",
  );
  expect(unreadCount(db).unreadCount).toBe(3);
  db.$client.exec("DROP TRIGGER reject_read");
  setReadState({ db, input: { ids, read: true }, now: initialTime });
  setReadState({ db, input: { ids, read: true }, now: "2026-11-08T12:00:00.000Z" });
  expect(
    jobs.filter((job) => ids.includes(job.id)).map((job) => jobDetails({ db, id: job.id }).readAt),
  ).toEqual([initialTime, initialTime]);
  expect(unreadCount(db).unreadCount).toBe(1);
  setReadState({ db, input: { ids, read: false } });
  expect(unreadCount(db).unreadCount).toBe(3);
});

it("filters read state before Open totals and pagination while keeping Unread and History independent", () => {
  const { db, addBoard } = indexingStorage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: Array.from({ length: 53 }, (_, i) => normalizedJob(String(i))) },
    now: initialTime,
  });
  const first = listJobs({ db, input: { view: "unread", page: 1 } });
  const last = listJobs({ db, input: { view: "unread", page: 2 } });
  expect(first.jobs).toHaveLength(50);
  expect(last.jobs).toHaveLength(3);
  expect(new Set([...first.jobs, ...last.jobs].map((job) => job.id)).size).toBe(53);
  setReadState({ db, input: { ids: last.jobs.map((job) => job.id), read: true } });
  expect(listJobs({ db, input: { view: "unread", page: 2 } })).toMatchObject({
    page: 1,
    total: 50,
    jobs: first.jobs,
  });
  const read = listJobs({ db, input: { view: "open", readStatus: "read", page: 2 } });
  expect(read).toMatchObject({ page: 1, total: 3 });
  expect(read.jobs.map((job) => job.id)).toEqual(last.jobs.map((job) => job.id));
  expect(read.jobs.every((job) => job.readAt !== null)).toBe(true);
  expect(listJobs({ db, input: { view: "open", readStatus: "unread", page: 1 } })).toMatchObject({
    total: 50,
    jobs: first.jobs,
  });
  expect(listJobs({ db, input: { view: "open", page: 1 } }).total).toBe(53);
  expect(listJobs({ db, input: { view: "unread", readStatus: "read", page: 1 } }).total).toBe(50);
  expect(listJobs({ db, input: { view: "history", page: 1 } }).total).toBe(0);
  expect(unreadCount(db).unreadCount).toBe(50);
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, board.id)).run();
  expect(listJobs({ db, input: { view: "open", readStatus: "read", page: 1 } }).total).toBe(0);
  expect(listJobs({ db, input: { view: "history", readStatus: "read", page: 1 } }).total).toBe(53);
  expect(unreadCount(db).unreadCount).toBe(0);
});
