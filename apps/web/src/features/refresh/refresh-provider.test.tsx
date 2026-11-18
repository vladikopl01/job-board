// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { chooseFilter } from "../../../test/collection-controls";

import { QueryProvider } from "@/components/query-provider";
import { BoardsClient } from "@/features/boards/boards-client";
import { JobsClient } from "@/features/jobs/jobs-client";
import { UnreadCount } from "@/features/jobs/unread-count";

import {
  boardId,
  detailFixture,
  fixtureTime,
  listFixture,
  postingId,
} from "../../../test/job-fixtures";
import { RefreshNotice, RefreshProvider } from "./refresh-provider";
import { refreshesQueryKey } from "./queries";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("requests one refresh per document under Strict Mode while preserving local jobs on scheduling failure", async () => {
  let fail = true;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (String(input).startsWith("/api/jobs")) return Response.json(listFixture());
    if (init?.method === "POST")
      return fail
        ? Response.json(
            { error: { code: "STORAGE_ERROR", message: "Could not start refreshes." } },
            { status: 500 },
          )
        : Response.json({ results: [] });
    return Response.json({ refreshes: [] });
  });
  vi.stubGlobal("fetch", fetcher);
  function App({ route }: { route: string }) {
    return (
      <StrictMode>
        <NuqsTestingAdapter>
          <QueryProvider>
            <RefreshProvider>
              <RefreshNotice />
              <span>{route}</span>
              <JobsClient />
            </RefreshProvider>
          </QueryProvider>
        </NuqsTestingAdapter>
      </StrictMode>
    );
  }
  const rendered = render(<App route="first route" />);
  await screen.findByRole("link", { name: "Software Engineer" });
  await screen.findByText("Could not start refreshes.");
  rendered.rerender(<App route="next route" />);
  await act(async () => {
    fireEvent(window, new Event("focus"));
    fireEvent(window, new Event("online"));
  });
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  fail = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() =>
    expect(screen.queryByText("Could not start refreshes.")).not.toBeInTheDocument(),
  );
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Software Engineer" })).toBeInTheDocument();
});

it("polls pending tasks and updates board feedback without hiding confirmed cards", async () => {
  let finished = false;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (input === "/api/jobs/unread-count") return Response.json({ unreadCount: finished ? 3 : 1 });
    if (input === "/api/boards")
      return Response.json({
        boards: [
          {
            id: boardId,
            provider: "ashby",
            sourceHost: "jobs.ashbyhq.com",
            boardKey: "example",
            canonicalUrl: "https://jobs.ashbyhq.com/example",
            displayName: "Example",
            createdAt: fixtureTime,
            updatedAt: fixtureTime,
            archivedAt: null,
            refreshGeneration: 0,
            lastSuccessfulRefreshAt: finished ? fixtureTime : null,
          },
        ],
      });
    if (init?.method === "POST")
      return Response.json({ results: [{ kind: "accepted", boardId, taskId: postingId }] });
    return Response.json({
      refreshes: [
        {
          id: postingId,
          boardId,
          state: finished ? "succeeded" : "running",
          phase: finished ? "finished" : "fetching",
          createdAt: fixtureTime,
          startedAt: fixtureTime,
          finishedAt: finished ? fixtureTime : null,
          newCount: finished ? 0 : null,
          updatedCount: finished ? 0 : null,
          unavailableCount: finished ? 0 : null,
          cachedCount: finished ? 3 : null,
          lastSuccessfulResult: finished
            ? {
                id: postingId,
                finishedAt: fixtureTime,
                newCount: 0,
                updatedCount: 0,
                unavailableCount: 0,
                cachedCount: 3,
              }
            : null,
          errorCode: null,
          errorMessage: null,
          retryAt: null,
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <NuqsTestingAdapter hasMemory searchParams="?layout=list">
      <QueryProvider>
        <RefreshProvider>
          <UnreadCount />
          <BoardsClient />
        </RefreshProvider>
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await screen.findByRole("heading", { name: "Example" });
  expect(await screen.findByLabelText("1 unread job")).toBeInTheDocument();
  const refresh = screen.getByRole("button", { name: "Refresh" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Refresh Example" })).toBeDisabled(),
  );
  expect(refresh).toHaveAttribute("aria-busy", "true");
  expect(refresh.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  expect(screen.getByText("Example: Refreshing…")).toHaveAttribute("aria-live", "polite");
  await act(async () => {
    finished = true;
  });
  await screen.findByText("Up to date · 3 cached", {}, { timeout: 3000 });
  expect(await screen.findByLabelText("3 unread jobs")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Refresh Example" })).toBeEnabled(),
  );
  expect(screen.getByText(/Last refreshed/)).toBeInTheDocument();
  expect(screen.queryByText("Refreshing boards…")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Example" })).toBeInTheDocument();
});

it("keeps single-board progress in its button after a batch and reveals an unchanged result again", async () => {
  let id = postingId;
  let finished = true;
  const singleId = "44444444-4444-4444-8444-444444444444";
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (input === "/api/boards")
      return Response.json({
        boards: [
          {
            id: boardId,
            provider: "ashby",
            sourceHost: "jobs.ashbyhq.com",
            boardKey: "example",
            canonicalUrl: detailFixture.canonicalUrl,
            displayName: "Example",
            createdAt: fixtureTime,
            updatedAt: fixtureTime,
            archivedAt: null,
            refreshGeneration: 0,
            lastSuccessfulRefreshAt: fixtureTime,
          },
        ],
      });
    if (init?.method === "POST" && input === `/api/boards/${boardId}/refresh`) {
      id = singleId;
      finished = false;
      return Response.json({ taskId: id });
    }
    if (init?.method === "POST")
      return Response.json({ results: [{ kind: "accepted", boardId, taskId: postingId }] });
    return Response.json({
      refreshes: [
        {
          id,
          boardId,
          state: finished ? "succeeded" : "running",
          phase: finished ? "finished" : "fetching",
          createdAt: fixtureTime,
          startedAt: fixtureTime,
          finishedAt: finished ? fixtureTime : null,
          newCount: finished ? 0 : null,
          updatedCount: finished ? 0 : null,
          unavailableCount: finished ? 0 : null,
          cachedCount: finished ? 3 : null,
          lastSuccessfulResult: {
            id: finished ? id : postingId,
            finishedAt: fixtureTime,
            newCount: 0,
            updatedCount: 0,
            unavailableCount: 0,
            cachedCount: 3,
          },
          errorCode: null,
          errorMessage: null,
          retryAt: null,
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <NuqsTestingAdapter hasMemory searchParams="?layout=list">
      <QueryClientProvider client={client}>
        <RefreshProvider>
          <BoardsClient />
        </RefreshProvider>
      </QueryClientProvider>
    </NuqsTestingAdapter>,
  );
  const firstResult = await screen.findByText("Up to date · 3 cached");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
  const refresh = screen.getByRole("button", { name: "Refresh Example" });
  await userEvent.setup().click(refresh);
  await waitFor(() =>
    expect(client.getQueryData(refreshesQueryKey)).toMatchObject({
      refreshes: [{ id: singleId, state: "running" }],
    }),
  );
  expect(refresh).toBeDisabled();
  expect(firstResult).toBeInTheDocument();
  expect(screen.queryByText("Refreshing boards…")).not.toBeInTheDocument();
  expect(refresh).toHaveAttribute("aria-busy", "true");
  expect(refresh.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  await act(async () => {
    finished = true;
    await client.invalidateQueries({ queryKey: refreshesQueryKey });
  });
  const nextResult = await screen.findByText("Up to date · 3 cached");
  expect(nextResult).toBe(firstResult);
  expect(nextResult).toHaveAttribute("data-slot", "refreshed-text");
  expect(screen.queryByText("Refreshing boards…")).not.toBeInTheDocument();
});

it.each(["failed", "deferred"] as const)(
  "reports a %s Refresh all outcome from the Archived view with a retry path",
  async (outcome) => {
    let requested = false;
    let finished = false;
    const retryAt = "2026-10-28T11:00:00.000Z";
    const board = {
      id: boardId,
      provider: "ashby",
      sourceHost: "jobs.ashbyhq.com",
      boardKey: "example",
      canonicalUrl: "https://jobs.ashbyhq.com/example",
      displayName: "Example",
      createdAt: fixtureTime,
      updatedAt: fixtureTime,
      archivedAt: null,
      refreshGeneration: 0,
      lastSuccessfulRefreshAt: fixtureTime,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        if (input === "/api/boards")
          return Response.json({
            boards: [
              board,
              {
                ...board,
                id: "55555555-5555-4555-8555-555555555555",
                displayName: "Archived company",
                archivedAt: fixtureTime,
              },
            ],
          });
        if (init?.method === "POST") {
          if (init.body !== JSON.stringify({ source: "manual" }))
            return Response.json({ results: [] });
          requested = true;
          return Response.json({
            results: [
              outcome === "deferred"
                ? { kind: "deferred", boardId, retryAt }
                : { kind: "accepted", boardId, taskId: postingId },
            ],
          });
        }
        return Response.json({
          refreshes:
            requested && outcome === "failed"
              ? [
                  {
                    id: postingId,
                    boardId,
                    state: finished ? "failed" : "running",
                    phase: finished ? "finished" : "fetching",
                    createdAt: fixtureTime,
                    startedAt: fixtureTime,
                    finishedAt: finished ? fixtureTime : null,
                    newCount: null,
                    updatedCount: null,
                    unavailableCount: null,
                    cachedCount: null,
                    lastSuccessfulResult: null,
                    errorCode: finished ? "PROVIDER_ERROR" : null,
                    errorMessage: finished ? "The provider is unavailable." : null,
                    retryAt: null,
                  },
                ]
              : [],
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <NuqsTestingAdapter hasMemory searchParams="?layout=list">
        <QueryClientProvider client={client}>
          <RefreshProvider>
            <BoardsClient />
          </RefreshProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>,
    );
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Example" });
    await chooseFilter(user, "Status", "Archived");
    await screen.findByRole("heading", { name: "Archived company" });
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    if (outcome === "failed") {
      await screen.findByRole("button", { name: "Refresh", busy: true });
      await act(async () => {
        finished = true;
        await client.invalidateQueries({ queryKey: refreshesQueryKey });
      });
    }
    const summary = await screen.findByText(
      outcome === "failed" ? "1 board failed to refresh." : "1 board waiting to retry.",
    );
    expect(summary.closest("output")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText(
        outcome === "failed"
          ? "Use Refresh on an active board to retry."
          : /Next retry available after/u,
      ),
    ).toBeInTheDocument();
    expect(
      document.querySelector(`time[datetime="${retryAt}"]`)?.getAttribute("datetime") ?? null,
    ).toBe(outcome === "deferred" ? retryAt : null);
    expect(screen.queryByText("Refreshing boards…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Archived company" })).toBeInTheDocument();
    if (outcome === "failed") {
      await user.click(screen.getByRole("button", { name: "View active boards" }));
      await screen.findByRole("heading", { name: "Example" });
      await screen.findByText(/The provider is unavailable/u);
    }
  },
);
