// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { BoardDetailsClient } from "@/features/boards/board-details-client";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { JobDetailsClient } from "@/features/jobs/job-details-client";
import { JobsClient } from "@/features/jobs/jobs-client";
import { JobVisitProvider } from "@/features/jobs/job-visit-provider";
import { jobListInputSchema } from "@/features/jobs/schemas";

import { setupCollectionControls } from "../../test/collection-controls";
import { inboxApi, inboxJobs } from "../../test/inbox-browser";
import { boardFixture, fixtureTime } from "../../test/job-fixtures";
import { AppShell } from "./app-shell";

const route = vi.hoisted(() => ({ pathname: "/inbox" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ push: vi.fn<() => void>() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function workspace(content: ReactNode) {
  setupCollectionControls();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    })),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  });
  const tree = (children: ReactNode) => (
    <NuqsTestingAdapter hasMemory>
      <QueryClientProvider client={client}>
        <JobVisitProvider>{children}</JobVisitProvider>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
  const view = render(tree(content));
  return { rerender: (children: ReactNode) => view.rerender(tree(children)) };
}

it("keeps inset navigation, active destinations, and keyboard focus across route changes", async () => {
  const api = inboxApi();
  route.pathname = "/inbox";
  const view = workspace(
    <AppShell>
      <h1>Daily review</h1>
    </AppShell>,
  );
  const nav = screen.getByRole("navigation", { name: "Main navigation" });
  expect(within(nav).getAllByRole("link")).toHaveLength(4);
  expect(within(nav).getByRole("link", { name: /Inbox/u })).toHaveAttribute("aria-current", "page");
  await screen.findByLabelText("3 unread jobs");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
    "data-state",
    "collapsed",
  );
  expect(document.cookie).toContain("sidebar_state=false");
  route.pathname = `/boards/${boardFixture.id}`;
  view.rerender(
    <AppShell>
      <h1>Company details</h1>
    </AppShell>,
  );
  expect(within(nav).getByRole("link", { name: "Boards" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).getByRole("link", { name: /Inbox/u })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("main")).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
  expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded");
  expect(document.cookie).toContain("sidebar_state=true");
  expect(api.writes()).toHaveLength(0);
});

it("places pagination and selection actions below the workspace scroller", async () => {
  const api = inboxApi();
  route.pathname = "/inbox";
  workspace(
    <AppShell>
      <JobsClient mode="inbox" />
    </AppShell>,
  );
  await screen.findByRole("link", { name: "Role 1" });
  const pager = screen.getByRole("navigation", { name: "Jobs pages" });
  const footer = pager.closest("[data-workspace-footer]");
  const scroller = document.querySelector("[data-workspace-scroll]");
  expect(footer).toContainElement(pager);
  expect(scroller).not.toContainElement(pager);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Select" }));
  const actions = screen.getByRole("toolbar", { name: "Selected jobs" });
  expect(footer).toContainElement(actions);
  expect(actions.parentElement).toBe(pager.closest("footer"));
  await user.click(screen.getByRole("checkbox", { name: "Select Role 1 at Example" }));
  expect(within(actions).getByText("1 selected")).toBeInTheDocument();
  await user.click(within(actions).getByRole("button", { name: "Done" }));
  expect(screen.getByRole("button", { name: "Select" })).toHaveFocus();
  expect(screen.getByRole("navigation", { name: "Jobs pages" })).toBe(pager);
  expect(api.writes()).toHaveLength(0);
});

it("opens archived board details on retained history with management and board-scoped results", async () => {
  const api = inboxApi(inboxJobs(2).map((job) => ({ ...job, boardArchivedAt: fixtureTime })));
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input, init) =>
      input === "/api/boards"
        ? Promise.resolve(Response.json({ boards: [{ ...boardFixture, archivedAt: fixtureTime }] }))
        : api.fetcher(input, init),
    ),
  );
  route.pathname = `/boards/${boardFixture.id}`;
  workspace(
    <AppShell>
      <BoardDetailsClient id={boardFixture.id} />
    </AppShell>,
  );
  await screen.findByRole("heading", { level: 1, name: "Example" });
  expect(screen.getByRole("button", { name: "Restore Example" })).toBeEnabled();
  const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
  expect(screen.getAllByRole("navigation", { name: "breadcrumb" })).toHaveLength(1);
  expect(within(breadcrumb).getByRole("link", { name: "Boards" })).toHaveAttribute(
    "href",
    "/boards?view=archived",
  );
  expect(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u })).toBeInTheDocument();
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.queryByRole("combobox", { name: "Board" })).not.toBeInTheDocument();
  const lists = api.fetcher.mock.calls.filter(([input]) => String(input).startsWith("/api/jobs?"));
  expect(lists).toHaveLength(1);
  const params = new URL(String(lists[0]?.[0]), "http://localhost").searchParams;
  expect(params.get("boardId")).toBe(boardFixture.id);
  const input = jobListInputSchema.parse(Object.fromEntries(params));
  expect(input.view).toBe("all");
  expect(input.filters).toContainEqual(
    expect.objectContaining({ id: "availability", operator: "eq", value: "history" }),
  );
  expect(api.writes()).toHaveLength(0);
});

it("uses one shell breadcrumb for posting details and a plain label for top-level destinations", async () => {
  const api = inboxApi(inboxJobs(1));
  const posting = api.state.jobs[0];
  if (!posting) throw new Error("Missing fixture posting.");
  route.pathname = "/jobs";
  const view = workspace(
    <AppShell>
      <h1>Jobs</h1>
    </AppShell>,
  );
  expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
  expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
  route.pathname = `/jobs/${posting.id}`;
  view.rerender(
    <AppShell>
      <JobDetailsClient id={posting.id} />
    </AppShell>,
  );
  await screen.findByRole("heading", { level: 1, name: posting.title });
  const breadcrumb = screen.getByRole("navigation", { name: "breadcrumb" });
  expect(screen.getAllByRole("navigation", { name: "breadcrumb" })).toHaveLength(1);
  expect(within(breadcrumb).getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  expect(within(breadcrumb).getByText(posting.title)).toHaveAttribute("aria-current", "page");
  expect(api.writes()).toHaveLength(1);
});

it("keeps Dashboard sources usable when the unread query fails and retries only that information", async () => {
  let failCount = true;
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    if (input === "/api/boards") return Response.json({ boards: [boardFixture] });
    if (input === "/api/jobs/unread-count")
      return failCount
        ? Response.json(
            { error: { code: "STORAGE_ERROR", message: "Count unavailable." } },
            { status: 500 },
          )
        : Response.json({ unreadCount: 5 });
    if (input === "/api/refreshes")
      return Response.json({
        refreshes: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            boardId: boardFixture.id,
            state: "failed",
            phase: "finished",
            createdAt: fixtureTime,
            startedAt: fixtureTime,
            finishedAt: fixtureTime,
            newCount: null,
            updatedCount: null,
            unavailableCount: null,
            cachedCount: null,
            lastSuccessfulResult: null,
            errorCode: "PROVIDER_ERROR",
            errorMessage: "The provider is temporarily unavailable.",
            retryAt: null,
          },
        ],
      });
    throw new Error(`Unexpected overview request: ${String(input)}`);
  });
  vi.stubGlobal("fetch", fetcher);
  workspace(<DashboardClient />);
  await screen.findByRole("button", { name: "Retry unread count" });
  expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
    "href",
    `/boards/${boardFixture.id}`,
  );
  expect(screen.getByText("The provider is temporarily unavailable.")).toBeInTheDocument();
  expect(
    screen.queryByText("No refresh failures reported for your active boards."),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Previously read jobs" })).toHaveAttribute(
    "href",
    "/jobs?readStatus=read",
  );
  failCount = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry unread count" }));
  await screen.findByText("5");
  expect(fetcher.mock.calls.filter(([input]) => input === "/api/boards")).toHaveLength(1);
  expect(fetcher.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
});
