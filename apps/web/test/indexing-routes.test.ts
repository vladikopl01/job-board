import { boards, postings, refreshTasks } from "@job-board/db/schema";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  ashbyJob,
  leverJob,
  normalizedJob,
} from "../../../packages/job-boards/test/fixtures/postings.ts";
import { POST as registerBoard } from "../src/app/api/boards/route";
import { POST as manualRefresh } from "../src/app/api/boards/[id]/refresh/route";
import { GET as details } from "../src/app/api/jobs/[id]/route";
import { POST as replace } from "../src/app/api/jobs/[id]/replace/route";
import { GET as jobs } from "../src/app/api/jobs/route";
import { GET as status, POST as visit } from "../src/app/api/refreshes/route";
import { boardResponseSchema } from "../src/features/boards/schemas";
import { jobResponseSchema, replacementResponseSchema } from "../src/features/jobs/schemas";
import { reconcileSnapshot } from "../src/features/jobs/server/reconcile";
import type { Database } from "../src/features/refresh/server/store";
import { beginRefresh, indexingStorage, initialTime } from "./indexing";

vi.mock("server-only", () => ({}));
const getDatabase = vi.hoisted(() => vi.fn<() => Database>());
const after = vi.hoisted(() => vi.fn<(callback: () => Promise<void>) => void>());
vi.mock("@/server/database", () => ({ getDatabase }));
vi.mock("next/server", () => ({ after }));
const providerFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  getDatabase.mockReset();
  after.mockReset();
  providerFetch.mockReset();
  vi.stubGlobal("fetch", providerFetch);
});
afterEach(() => vi.unstubAllGlobals());

function request(path: string, body = "{}", headers: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    body,
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
  });
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}
function storage() {
  const fixture = indexingStorage();
  getDatabase.mockReturnValue(fixture.db);
  return fixture;
}

it.each([
  { provider: "Ashby", url: "https://jobs.ashbyhq.com/example", requests: 1 },
  { provider: "Lever", url: "https://jobs.lever.co/example", requests: 2 },
])(
  "indexes a newly registered $provider board after responding without a manual refresh",
  async ({ url, requests }) => {
    const { db } = storage();
    providerFetch.mockImplementation(async (input) => {
      const target = new URL(String(input));
      return Response.json(
        target.hostname === "api.ashbyhq.com"
          ? { apiVersion: "1", jobs: [ashbyJob()] }
          : target.searchParams.get("skip") === "0"
            ? [leverJob()]
            : [],
      );
    });
    const response = await registerBoard(
      request("/api/boards", JSON.stringify({ displayName: "Example", url })),
    );
    expect(response.status).toBe(201);
    const { board } = boardResponseSchema.parse(await response.json());
    expect(db.select().from(refreshTasks).all()).toMatchObject([
      { boardId: board.id, state: "queued", requestSource: "manual" },
    ]);
    expect(after).toHaveBeenCalledTimes(1);
    expect(providerFetch).not.toHaveBeenCalled();

    const duplicate = await registerBoard(
      request("/api/boards", JSON.stringify({ displayName: "Another name", url })),
    );
    expect(duplicate.status).toBe(409);
    expect(db.select().from(refreshTasks).all()).toHaveLength(1);
    expect(after).toHaveBeenCalledTimes(1);

    const callback = after.mock.calls[0]?.[0];
    if (!callback) throw new Error("Missing post-response indexing callback.");
    await callback();
    expect(providerFetch).toHaveBeenCalledTimes(requests);
    expect(db.select().from(refreshTasks).get()).toMatchObject({
      boardId: board.id,
      state: "succeeded",
      newCount: 1,
    });
    expect(db.select().from(postings).get()?.boardId).toBe(board.id);
    expect(db.select().from(boards).get()?.lastSuccessfulRefreshAt).not.toBeNull();
  },
);

it("retains an offline registration and reports its first indexing failure for manual retry", async () => {
  const { db } = storage();
  providerFetch.mockRejectedValue(new TypeError("Offline"));
  const response = await registerBoard(
    request(
      "/api/boards",
      JSON.stringify({ displayName: "Example", url: "https://jobs.ashbyhq.com/example" }),
    ),
  );
  expect(response.status).toBe(201);
  const { board } = boardResponseSchema.parse(await response.json());
  const callback = after.mock.calls[0]?.[0];
  if (!callback) throw new Error("Missing post-response indexing callback.");
  await callback();
  expect(db.select().from(boards).get()).toMatchObject({
    id: board.id,
    lastSuccessfulRefreshAt: null,
  });
  expect(db.select().from(postings).all()).toEqual([]);
  expect(db.select().from(refreshTasks).get()).toMatchObject({
    boardId: board.id,
    state: "failed",
    errorCode: "TRANSPORT",
  });
  expect(providerFetch).toHaveBeenCalledTimes(1);
  expect(
    (await manualRefresh(request(`/api/boards/${board.id}/refresh`), params(board.id))).status,
  ).toBe(202);
});

it.each([
  {
    body: '{"displayName":"Example","url":"https://jobs.ashbyhq.com/example"}',
    headers: { origin: "https://attacker.test" },
  },
  { body: "{", headers: {} },
  { body: '{"displayName":"Example","url":"https://unsupported.test/example"}', headers: {} },
  { body: '{"displayName":"","url":"https://jobs.ashbyhq.com/example"}', headers: {} },
])("does not save or queue a rejected registration: $body $headers", async ({ body, headers }) => {
  const response = await registerBoard(request("/api/boards", body, headers));
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(getDatabase).not.toHaveBeenCalled();
  expect(after).not.toHaveBeenCalled();
  expect(providerFetch).not.toHaveBeenCalled();
});

it("persists and coalesces accepted work before the awaited after callback executes", async () => {
  const { db, addBoard } = storage();
  const board = addBoard();
  const first = await manualRefresh(request(`/api/boards/${board.id}/refresh`), params(board.id));
  const second = await manualRefresh(request(`/api/boards/${board.id}/refresh`), params(board.id));
  expect(first.status).toBe(202);
  expect(await second.json()).toEqual(await first.json());
  expect(db.select().from(refreshTasks).all()).toHaveLength(1);
  expect(db.select().from(refreshTasks).get()?.state).toBe("queued");
  expect(after).toHaveBeenCalledTimes(2);
  expect(providerFetch).not.toHaveBeenCalled();
  after.mockClear();
  expect(status().status).toBe(200);
  const result = jobs(new Request("http://localhost:3000/api/jobs"));
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(after).not.toHaveBeenCalled();
  expect(providerFetch).not.toHaveBeenCalled();
});

it.each([
  ["{}", { origin: "https://attacker.test" }],
  ["{}", { host: "attacker.test:3000", origin: "http://attacker.test:3000" }],
  ["{}", { "content-type": "text/plain" }],
  ["{", {}],
  ['{"url":"http://localhost/private"}', {}],
])("rejects unsafe refresh mutations before database access: %s %j", async (body, headers) => {
  const response = await visit(request("/api/refreshes", body, headers));
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(getDatabase).not.toHaveBeenCalled();
  expect(after).not.toHaveBeenCalled();
  expect(providerFetch).not.toHaveBeenCalled();
});

it("rejects malformed and missing/archived board targets without scheduling", async () => {
  const { db, addBoard } = storage();
  const board = addBoard();
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, board.id)).run();
  expect((await manualRefresh(request("/api/boards/bad/refresh"), params("bad"))).status).toBe(400);
  expect(
    (await manualRefresh(request(`/api/boards/${board.id}/refresh`), params(board.id))).status,
  ).toBe(409);
  expect(
    (await manualRefresh(request("/api/boards/missing/refresh"), params(crypto.randomUUID())))
      .status,
  ).toBe(404);
  expect(db.select().from(refreshTasks).all()).toEqual([]);
  expect(after).not.toHaveBeenCalled();
});

it("schedules only active boards and reports empty visits accurately", async () => {
  const { db, addBoard } = storage();
  expect(await (await visit(request("/api/refreshes"))).json()).toEqual({ results: [] });
  const active = addBoard();
  const archived = addBoard("https://jobs.lever.co/archived");
  db.update(boards).set({ archivedAt: initialTime }).where(eq(boards.id, archived.id)).run();
  const response = await visit(request("/api/refreshes", JSON.stringify({ source: "manual" })));
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({
    results: [{ kind: "accepted", boardId: active.id, taskId: expect.any(String) }],
  });
  expect(db.select().from(refreshTasks).get()?.requestSource).toBe("manual");
  expect(providerFetch).not.toHaveBeenCalled();
});

it("keeps local detail/query errors read-only and does not expose raw data or ownership", async () => {
  const { db, addBoard } = storage();
  const board = addBoard();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const posting = db.select().from(postings).get();
  if (!posting) throw new Error("Missing posting.");
  expect(jobs(new Request("http://localhost:3000/api/jobs?page=0")).status).toBe(400);
  expect(
    (await details(new Request("http://localhost:3000/api/jobs/bad"), params("bad"))).status,
  ).toBe(400);
  expect(
    (
      await details(
        new Request("http://localhost:3000/api/jobs/missing"),
        params(crypto.randomUUID()),
      )
    ).status,
  ).toBe(404);
  const result = await details(
    new Request(`http://localhost:3000/api/jobs/${posting.id}`),
    params(posting.id),
  );
  expect(await result.json()).not.toHaveProperty("posting.raw");
  const tasks = await status().json();
  expect(tasks).not.toHaveProperty("refreshes.0.ownerToken");
  expect(after).not.toHaveBeenCalled();
  expect(providerFetch).not.toHaveBeenCalled();
});

it("guards confirmed local replacements and returns conflicts for repeated old targets", async () => {
  const { db, addBoard } = storage();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, addBoard().id),
    snapshot: { postings: [normalizedJob()] },
    now: initialTime,
  });
  const original = db.select().from(postings).get();
  if (!original) throw new Error("Missing posting.");
  expect(
    (
      await replace(
        request(`/api/jobs/${original.id}/replace`, "{}", { origin: "https://attacker.test" }),
        params(original.id),
      )
    ).status,
  ).toBe(403);
  expect(db.select().from(postings).all()).toHaveLength(1);
  const saved = await replace(request(`/api/jobs/${original.id}/replace`), params(original.id));
  expect(saved.status).toBe(201);
  expect(replacementResponseSchema.parse(await saved.json()).id).not.toBe(original.id);
  expect(
    (await replace(request(`/api/jobs/${original.id}/replace`), params(original.id))).status,
  ).toBe(409);
  expect(db.select().from(postings).all()).toHaveLength(2);
  expect(providerFetch).not.toHaveBeenCalled();
});

it("returns formatted descriptions with safe links while removing active markup at the API boundary", async () => {
  const { db, addBoard } = storage();
  const html =
    '<h1 onclick="alert(1)" style="color:red">About us</h1><p>Build <strong>well</strong>.</p><a href="/values">Values</a><a href="jav&#x61;script:alert(1)">Unsafe</a><a href="https://user:secret@example.com">Credentials</a><script>alert(1)</script><img src="https://example.com/pixel"><iframe src="https://example.com">hidden</iframe><svg><a href="https://example.com">svg</a></svg>';
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, addBoard().id),
    snapshot: { postings: [normalizedJob("one", { descriptionHtml: html })] },
    now: initialTime,
  });
  const posting = db.select().from(postings).get();
  if (!posting) throw new Error("Missing posting.");
  const response = await details(
    new Request(`http://localhost:3000/api/jobs/${posting.id}`),
    params(posting.id),
  );
  const result = jobResponseSchema.parse(await response.json()).posting;
  expect(result.descriptionHtml).toContain("<h2>About us</h2><p>Build <strong>well</strong>.</p>");
  expect(result.descriptionHtml).toContain(
    '<a href="https://jobs.ashbyhq.com/values" target="_blank" rel="noopener noreferrer">Values</a>',
  );
  expect(result.descriptionHtml).toContain("<a>Unsafe</a><a>Credentials</a>");
  expect(result.descriptionHtml).not.toMatch(
    /script|onclick|style=|<img|<iframe|<svg|user:secret/u,
  );
  expect(db.select().from(postings).get()?.descriptionHtml).toBe(html);
  expect(providerFetch).not.toHaveBeenCalled();
});

it("restores Lever section titles from retained raw data without refreshing or modifying history", async () => {
  const { db, addBoard } = storage();
  const board = addBoard("https://jobs.lever.co/example");
  const raw = leverJob();
  reconcileSnapshot({
    db,
    claim: beginRefresh(db, board.id),
    snapshot: { postings: [normalizedJob("one", { raw, descriptionHtml: "<li>TypeScript</li>" })] },
    now: initialTime,
  });
  const posting = db.select().from(postings).get();
  if (!posting) throw new Error("Missing posting.");
  const response = await details(
    new Request(`http://localhost:3000/api/jobs/${posting.id}`),
    params(posting.id),
  );
  const result = jobResponseSchema.parse(await response.json()).posting;
  expect(result.descriptionHtml).toContain("<h2>Requirements</h2><ul><li>TypeScript</li></ul>");
  expect(result.descriptionHtml).toContain("EUR 80,000 per year");
  expect(db.select().from(postings).get()?.descriptionHtml).toBe("<li>TypeScript</li>");
  expect(providerFetch).not.toHaveBeenCalled();
});
