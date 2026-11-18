import { boards } from "@job-board/db/schema";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";

import { normalizedJob } from "../../../../../../packages/job-boards/test/fixtures/postings.ts";
import { beginRefresh, indexingStorage, initialTime } from "../../../../test/indexing";
import { jobListInputSchema } from "../schemas";
import { setReadState } from "./read-state";
import { reconcileSnapshot } from "./reconcile";
import { listJobs, unreadCount } from "./service";

vi.mock("server-only", () => ({}));

it("combines literal text, board, and read filtering before counting and paginating", () => {
  const { db, addBoard } = indexingStorage();
  const first = addBoard();
  const second = addBoard("https://jobs.ashbyhq.com/other");
  for (const board of [first, second]) {
    reconcileSnapshot({
      db,
      claim: beginRefresh(db, board.id),
      now: initialTime,
      snapshot: {
        postings: Array.from({ length: 53 }, (_, i) => ({
          ...normalizedJob(String(i)),
          title: i === 0 ? "Platform engineer: 100%_!" : "Platform engineer",
          descriptionPlain: i === 1 ? "Specialist in accessible interfaces" : "General role",
        })),
      },
    });
  }
  const all = listJobs({ db, input: { view: "open", boardId: first.id, page: 1 } });
  expect(all.total).toBe(53);
  expect(all.jobs).toHaveLength(50);
  const smaller = listJobs({
    db,
    input: { view: "open", boardId: first.id, page: 2, pageSize: 10 },
  });
  expect(smaller).toMatchObject({ total: 53, page: 2, pageSize: 10 });
  expect(smaller.jobs.map((job) => job.id)).toEqual(all.jobs.slice(10, 20).map((job) => job.id));
  expect(
    listJobs({ db, input: { view: "open", boardId: first.id, page: 99, pageSize: 25 } }),
  ).toMatchObject({ page: 3, pageSize: 25, total: 53 });
  const byDescription = listJobs({
    db,
    input: { view: "open", boardId: first.id, q: "accessible interfaces", page: 99 },
  });
  expect(byDescription).toMatchObject({ total: 1, page: 1, jobs: [{ boardId: first.id }] });
  const id = byDescription.jobs[0]?.id;
  if (!id) throw new Error("Missing filtered posting.");
  setReadState({ db, input: { ids: [id], read: true }, now: initialTime });
  expect(
    listJobs({
      db,
      input: { view: "open", boardId: first.id, q: "accessible", readStatus: "read", page: 1 },
    }).jobs.map((job) => job.id),
  ).toEqual([id]);
  expect(
    listJobs({ db, input: { view: "unread", boardId: first.id, q: "accessible", page: 1 } }).total,
  ).toBe(0);
  expect(listJobs({ db, input: { view: "open", q: "100%_!", page: 1 } }).total).toBe(2);
  expect(listJobs({ db, input: { view: "open", q: "%", page: 1 } }).total).toBe(2);
  expect(listJobs({ db, input: { view: "open", q: "' OR 1=1 --", page: 1 } }).total).toBe(0);
  expect(unreadCount(db).unreadCount).toBe(105);
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, first.id)).run();
  expect(
    listJobs({
      db,
      input: { view: "history", boardId: first.id, q: "accessible", page: 1 },
    }).jobs.map((job) => job.id),
  ).toEqual([id]);
  expect(unreadCount(db).unreadCount).toBe(53);
});

it("bounds and validates discovery input without inventing a search language", () => {
  expect(jobListInputSchema.parse({ q: "  TypeScript  " }).q).toBe("TypeScript");
  expect(jobListInputSchema.safeParse({ q: "x".repeat(201) }).success).toBe(false);
  expect(jobListInputSchema.safeParse({ boardId: "not-a-board" }).success).toBe(false);
  for (const pageSize of ["0", "11", "51", "1000000", "bad"])
    expect(jobListInputSchema.safeParse({ pageSize }).success).toBe(false);
  for (const pageSize of ["10", "25", "50"])
    expect(jobListInputSchema.parse({ pageSize }).pageSize).toBe(Number(pageSize));
});
