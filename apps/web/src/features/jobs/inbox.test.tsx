// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { StrictMode, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  chooseFilter,
  chooseLayout,
  setupCollectionControls,
} from "../../../test/collection-controls";

import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppNav } from "@/components/app-nav";

import { deferred, inboxApi, inboxJobs } from "../../../test/inbox-browser";
import { localRequest } from "./api";
import { JobDetailsClient } from "./job-details-client";
import { JobVisitProvider } from "./job-visit-provider";
import { JobsClient } from "./jobs-client";
import {
  jobListInputSchema,
  jobResponseSchema,
  readStateInputSchema,
  type JobDetail,
} from "./schemas";

const route = vi.hoisted(() => ({ pathname: "/jobs" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useRouter: () => ({ push: vi.fn<(url: string) => void>() }),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

function workspace(children: ReactNode, { pathname = "/jobs", searchParams = "layout=list" } = {}) {
  setupCollectionControls();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    })),
  );
  route.pathname = pathname;
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, networkMode: "always" },
      mutations: { retry: false, networkMode: "always" },
    },
  });
  const urlUpdates = vi.fn<OnUrlUpdateFunction>();
  const tree = (content: ReactNode) => (
    <StrictMode>
      <NuqsTestingAdapter hasMemory searchParams={searchParams} onUrlUpdate={urlUpdates}>
        <QueryClientProvider client={client}>
          <JobVisitProvider>
            <TooltipProvider>
              <SidebarProvider>
                <AppNav />
              </SidebarProvider>
              {content}
            </TooltipProvider>
          </JobVisitProvider>
        </QueryClientProvider>
      </NuqsTestingAdapter>
    </StrictMode>
  );
  const view = render(tree(children));
  return {
    client,
    urlUpdates,
    visit(path: string, content: ReactNode) {
      route.pathname = path;
      view.rerender(tree(content));
    },
  };
}

it.each(["jobs", "inbox"] as const)("defaults the %s collection to Table", async (mode) => {
  inboxApi(inboxJobs(1));
  workspace(<JobsClient mode={mode} />, {
    pathname: mode === "inbox" ? "/inbox" : "/jobs",
    searchParams: "",
  });
  const table = await screen.findByRole("table", {
    name: mode === "inbox" ? "Unread jobs" : "Open jobs",
  });
  expect(screen.getByRole("button", { name: "Job layouts: Table" })).toHaveTextContent("Table");
  expect(within(table).getByRole("link", { name: "Role 1" })).toBeInTheDocument();
});

it("marks only actual full-detail visits and keeps manual unread through refetch, remount and Strict Mode replay", async () => {
  const api = inboxApi(inboxJobs(1));
  const job = api.state.jobs[0];
  if (!job) throw new Error("Missing fixture posting.");
  const view = workspace(<JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: job.title });
  expect(screen.getByRole("region", { name: "Inbox jobs" })).toBeInTheDocument();
  await act(async () => {
    await view.client.prefetchQuery({
      queryKey: ["jobs", "detail", job.id],
      queryFn: () => localRequest(jobResponseSchema, `/api/jobs/${job.id}`),
    });
  });
  view.visit("/jobs", <JobDetailsClient id={job.id} />);
  await screen.findByRole("heading", { name: job.title });
  expect(api.writes()).toHaveLength(0);

  view.visit(`/jobs/${job.id}`, <JobDetailsClient id={job.id} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Mark unread" })).toBeEnabled());
  expect(api.writes()).toHaveLength(1);
  expect(screen.getByLabelText("0 unread jobs")).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Mark unread" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Mark read" })).toBeEnabled());
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs"] });
  });
  view.visit(`/jobs/${job.id}`, null);
  view.visit(`/jobs/${job.id}`, <JobDetailsClient id={job.id} />);
  await screen.findByRole("heading", { name: job.title });
  expect(api.writes()).toHaveLength(2);
  expect(api.state.jobs[0]?.readAt).toBeNull();
  expect(screen.getByLabelText("1 unread job")).toBeInTheDocument();

  view.visit("/inbox", <JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: job.title });
  view.visit(`/jobs/${job.id}`, <JobDetailsClient id={job.id} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Mark unread" })).toBeEnabled());
  expect(api.writes()).toHaveLength(3);
});

it("does not mark loading, failed, missing, or late details after a route exit", async () => {
  const api = inboxApi(inboxJobs(1));
  const job = api.state.jobs[0];
  if (!job) throw new Error("Missing fixture posting.");
  const pending = deferred();
  api.state.detailGate = pending.promise;
  const view = workspace(<JobDetailsClient id={job.id} />, { pathname: `/jobs/${job.id}` });
  expect(screen.getByRole("status", { name: "Loading posting" })).toBeInTheDocument();
  expect(api.writes()).toHaveLength(0);
  view.visit("/boards", <p>Boards route</p>);
  await act(async () => pending.resolve());
  expect(api.writes()).toHaveLength(0);
  api.state.detailGate = undefined;
  api.state.failDetails = true;
  view.visit(`/jobs/${job.id}`, <JobDetailsClient id={job.id} />);
  await screen.findByText("Local storage is unavailable.");
  expect(api.writes()).toHaveLength(0);
  api.state.failDetails = false;
  view.visit("/jobs/missing", <JobDetailsClient id={crypto.randomUUID()} />);
  await screen.findByRole("heading", { name: "Posting not found" });
  expect(api.writes()).toHaveLength(0);
});

it("retains usable historical details after an automatic write failure and retries only explicitly", async () => {
  const jobs = inboxJobs(1).map<JobDetail>((job) => ({
    ...job,
    unavailableAt: job.lastSeenAt,
    unavailableReason: "missing",
  }));
  const api = inboxApi(jobs);
  const job = api.state.jobs[0];
  if (!job) throw new Error("Missing fixture posting.");
  api.state.failWrites = true;
  const view = workspace(<JobDetailsClient id={job.id} />, { pathname: `/jobs/${job.id}` });
  await screen.findByRole("button", { name: "Retry read change" });
  expect(screen.getByRole("region", { name: "Job description" })).toBeInTheDocument();
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.getByLabelText("0 unread jobs")).toBeInTheDocument();
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs"] });
  });
  expect(api.writes()).toHaveLength(1);
  api.state.failWrites = false;
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry read change" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Mark unread" })).toBeEnabled());
  expect(api.writes()).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Retry read change" })).not.toBeInTheDocument();
});

it("keeps one navigation count query and preserves the last count on failure", async () => {
  const api = inboxApi();
  const view = workspace(<JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getAllByLabelText("3 unread jobs")).toHaveLength(1);
  expect(view.client.getQueryCache().findAll({ queryKey: ["jobs", "unread-count"] })).toHaveLength(
    1,
  );
  // Strict Mode cancels its first mount's request; all mounted badges share the live one.
  expect(
    api.fetcher.mock.calls.filter(
      ([input, init]) => input === "/api/jobs/unread-count" && !init?.signal?.aborted,
    ),
  ).toHaveLength(1);
  api.state.failCounts = true;
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs", "unread-count"] });
  });
  await waitFor(() =>
    expect(screen.getAllByLabelText("3 unread jobs (last known; count unavailable)")).toHaveLength(
      1,
    ),
  );
  expect(screen.getByRole("link", { name: "Role 1" })).toBeInTheDocument();
  api.state.failCounts = false;
  const retry = screen.getAllByRole("button", { name: "Retry unread count" })[0];
  if (!retry) throw new Error("Missing count retry action.");
  await userEvent.setup().click(retry);
  await waitFor(() => expect(screen.getAllByLabelText("3 unread jobs")).toHaveLength(1));
  api.state.jobs = api.state.jobs.map((job) => ({ ...job, readAt: job.lastSeenAt }));
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs"] });
  });
  await waitFor(() => expect(screen.getAllByLabelText("0 unread jobs")).toHaveLength(1));
  expect(screen.getByRole("heading", { name: "No unread jobs" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Browse open jobs" })).toHaveAttribute(
    "href",
    "/jobs?view=open",
  );
});

it("hides an unknown count and keeps a retry available after an initial failure", async () => {
  const api = inboxApi();
  const count = deferred();
  api.state.countGate = count.promise;
  api.state.failCounts = true;
  workspace(<JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.queryByLabelText(/unread jobs/u)).not.toBeInTheDocument();
  await act(async () => count.resolve());
  await screen.findByRole("button", { name: "Retry unread count" });
  expect(screen.queryByLabelText("Unread count unavailable")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("0 unread jobs")).not.toBeInTheDocument();
});

it("keeps card navigation and read controls in place through rapid selection toggles", async () => {
  const api = inboxApi(inboxJobs(2));
  workspace(<JobsClient mode="inbox" />);
  const title = await screen.findByRole("link", { name: "Role 1" });
  const article = title.closest("article");
  if (!article) throw new Error("Missing fixture card.");
  const readAction = within(article).getByRole("button", { name: "Mark read" });
  const mode = screen.getByRole("button", { name: "Select" });
  const user = userEvent.setup();
  for (let i = 0; i < 3; i++) {
    await user.dblClick(mode);
    expect(screen.getByRole("link", { name: "Role 1" })).toBe(title);
    expect(within(article).getByRole("button", { name: "Mark read" })).toBe(readAction);
    expect(mode).toHaveAttribute("aria-pressed", "false");
  }
  await user.click(mode);
  expect(screen.getByRole("link", { name: "Role 1" })).toBe(title);
  expect(within(article).getByRole("button", { name: "Mark read" })).toBe(readAction);
  expect(readAction.closest("[inert], [aria-hidden=true]")).toBeNull();
  expect(api.writes()).toHaveLength(0);
});

it("enters and leaves explicit selection mode with keyboard and touch without visiting or marking jobs", async () => {
  const api = inboxApi(inboxJobs(2));
  workspace(<JobsClient mode="inbox" />);
  const first = await screen.findByRole("link", { name: "Role 1" });
  const firstArticle = first.closest("article");
  if (!firstArticle) throw new Error("Missing fixture card.");
  const readControl = within(firstArticle).getByRole("button", { name: "Mark read" });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Mark read for selected jobs" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("toolbar", { name: "Selected jobs" })).not.toBeInTheDocument();
  const user = userEvent.setup();
  const mode = screen.getByRole("button", { name: "Select" });
  mode.focus();
  await user.keyboard("{Enter}");
  expect(mode).toHaveFocus();
  expect(mode).toHaveAccessibleName("Done");
  expect(mode).toHaveAttribute("aria-pressed", "true");
  const dock = screen.getByRole("toolbar", { name: "Selected jobs" });
  const card = screen.getByRole("button", { name: "Select Role 1 at Example" });
  const article = card.closest("article");
  if (!article) throw new Error("Missing fixture card.");
  expect(first).toBeInTheDocument();
  expect(within(article).getByRole("button", { name: "Mark read" })).toBe(readControl);
  expect(readControl.closest("[inert], [aria-hidden=true]")).toBeNull();
  expect(card).not.toContainElement(first);
  expect(card).not.toContainElement(readControl);
  expect(card).not.toContainElement(within(article).getByRole("link", { name: "Example" }));
  card.focus();
  await user.keyboard("{Enter}");
  expect(card).toHaveAttribute("aria-pressed", "true");
  await user.keyboard(" ");
  expect(card).toHaveAttribute("aria-pressed", "false");
  await user.pointer([{ keys: "[TouchA>]", target: card }, { keys: "[/TouchA]" }]);
  expect(card).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("1 selected")).toBeInTheDocument();
  await user.click(within(dock).getByRole("button", { name: "Done" }));
  expect(screen.getByRole("button", { name: "Select" })).toHaveFocus();
  expect(screen.getByRole("link", { name: "Role 1" })).toBeInTheDocument();
  expect(within(firstArticle).getByRole("button", { name: "Mark read" })).toBe(readControl);
  expect(dock).toBeInTheDocument();
  expect(dock).toHaveAttribute("inert");
  expect(dock).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select Role 1 at Example" }));
  await user.keyboard("{Escape}");
  expect(mode).toHaveFocus();
  expect(mode).toHaveAccessibleName("Select");
  expect(screen.queryByRole("toolbar", { name: "Selected jobs" })).not.toBeInTheDocument();
  expect(api.writes()).toHaveLength(0);
  expect(
    api.fetcher.mock.calls.every(([input]) => !String(input).includes("/api/jobs/10000000")),
  ).toBe(true);
});

it("shows legacy board and read-status URL values in advanced controls", async () => {
  const api = inboxApi(inboxJobs(1).map((job) => ({ ...job, readAt: job.lastSeenAt })));
  const boardId = api.state.jobs[0]?.boardId;
  workspace(<JobsClient />, { searchParams: `boardId=${boardId}&readStatus=read` });
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Filter 3" }));
  expect(screen.getByRole("button", { name: "Board filter value" })).toHaveTextContent("Example");
  expect(screen.getByRole("button", { name: "Read status filter value" })).toHaveTextContent(
    "Read",
  );
  expect(api.writes()).toHaveLength(0);
});

it("clears without leaving selection, navigates dock actions, and keeps bulk unread usable when results disappear", async () => {
  const api = inboxApi(inboxJobs(2).map((job) => ({ ...job, readAt: job.lastSeenAt })));
  workspace(<JobsClient />, { searchParams: "view=open&readStatus=read&layout=list" });
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  const mode = screen.getByRole("button", { name: "Select" });
  await user.click(mode);
  const dock = screen.getByRole("toolbar", { name: "Selected jobs" });
  const clear = within(dock).getByRole("button", { name: "Clear selection" });
  const selectPage = within(dock).getByRole("button", { name: "Select all jobs on this page" });
  const markRead = within(dock).getByRole("button", { name: "Mark read for selected jobs" });
  const markUnread = within(dock).getByRole("button", { name: "Mark unread for selected jobs" });
  const done = within(dock).getByRole("button", { name: "Done" });
  selectPage.focus();
  await user.keyboard("{ArrowRight}");
  expect(markRead).toHaveFocus();
  expect(markRead).toHaveAttribute("aria-disabled", "true");
  await user.keyboard("{ArrowRight}");
  expect(markUnread).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(done).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(clear).toHaveFocus();
  expect(clear).toHaveAttribute("aria-disabled", "true");
  await user.keyboard("{ArrowRight}{Enter}");
  expect(selectPage).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  await user.keyboard("{ArrowLeft}{Enter}");
  expect(selectPage).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  expect(screen.getByRole("toolbar", { name: "Selected jobs" })).toBe(dock);
  expect(mode).toHaveAttribute("aria-pressed", "true");
  expect(within(dock).getByRole("button", { name: "Mark unread for selected jobs" })).toBe(
    markUnread,
  );
  await user.keyboard("{ArrowRight}{Enter}{ArrowRight}{ArrowRight}{Enter}");
  await screen.findByRole("heading", { name: "No read jobs in Open" });
  expect(markUnread).toHaveFocus();
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  expect(api.state.jobs.every((job) => job.readAt === null)).toBe(true);
  expect(api.writes()).toHaveLength(1);
  // The successful write leaves focus on a disabled action, which must still allow Escape.
  await user.keyboard("{Escape}");
  expect(screen.getByRole("heading", { name: "No read jobs in Open" })).toHaveFocus();
  expect(screen.queryByRole("toolbar", { name: "Selected jobs" })).not.toBeInTheDocument();
});

it("keeps individual read actions usable in selection mode without clearing other selected jobs", async () => {
  const api = inboxApi(inboxJobs(2));
  workspace(<JobsClient />, { searchParams: "view=open&layout=list" });
  const second = await screen.findByRole("link", { name: "Role 2" });
  const article = second.closest("article");
  if (!article) throw new Error("Missing fixture card.");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Select" }));
  const firstSelection = screen.getByRole("button", { name: "Select Role 1 at Example" });
  const secondSelection = screen.getByRole("button", { name: "Select Role 2 at Example" });
  await user.click(firstSelection);
  await user.click(within(article).getByRole("button", { name: "Mark read" }));
  await waitFor(() =>
    expect(within(article).getByRole("button", { name: "Mark unread" })).toBeEnabled(),
  );
  expect(screen.getByText("1 selected")).toBeInTheDocument();
  expect(firstSelection).toHaveAttribute("aria-pressed", "true");
  expect(secondSelection).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  await user.click(within(article).getByRole("button", { name: "Mark unread" }));
  await waitFor(() =>
    expect(within(article).getByRole("button", { name: "Mark read" })).toBeEnabled(),
  );
  expect(screen.getByText("1 selected")).toBeInTheDocument();
  expect(firstSelection).toHaveAttribute("aria-pressed", "true");
  expect(secondSelection).toHaveAttribute("aria-pressed", "false");
  expect(api.writes()).toHaveLength(2);
  for (const [, request] of api.writes()) {
    expect(readStateInputSchema.parse(JSON.parse(String(request?.body))).ids).toEqual([
      api.state.jobs[1]?.id,
    ]);
  }
});

it("restores Open's read filter and keeps results mounted with writes disabled while filters resolve", async () => {
  const api = inboxApi(
    inboxJobs(6).map((job, i) => ({
      ...job,
      readAt: i % 2 === 1 ? job.lastSeenAt : null,
    })),
  );
  const view = workspace(<JobsClient />, {
    searchParams: "view=open&readStatus=read&page=2&layout=list",
  });
  await screen.findByRole("link", { name: "Role 6" });
  expect(screen.getByRole("button", { name: "Filter 2" })).toBeInTheDocument();
  expect(screen.getByLabelText("Page 2 of 2")).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Select" }));
  await user.click(screen.getByRole("button", { name: "Select Role 6 at Example" }));
  await chooseFilter(user, "Read status", "Unread");
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getByRole("link", { name: "Role 3" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.get("filters")).toContain(
    '"value":"unread"',
  );
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.has("page")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("link", { name: "Role 5" });
  const pending = deferred();
  api.state.listGate = pending.promise;
  await chooseFilter(user, "Read status", "Read");
  expect(screen.queryByRole("status", { name: "Loading jobs" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Role 5" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Open jobs" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("button", { name: "Mark read" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
  await act(async () => pending.resolve());
  await screen.findByRole("link", { name: "Role 2" });
  expect(screen.getByRole("link", { name: "Role 4" })).toBeInTheDocument();
  expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();
  await chooseFilter(user, "Availability", "History");
  await screen.findByRole("heading", { name: "No jobs match these filters" });
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.has("readStatus")).toBe(false);
  await chooseFilter(user, "Availability", "Open");
  await screen.findByRole("link", { name: "Role 2" });
  expect(screen.queryByRole("link", { name: "Role 1" })).not.toBeInTheDocument();
  await chooseFilter(user, "Read status", "All");
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getByRole("link", { name: "Role 2" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Read status is /u })).not.toBeInTheDocument();
  expect(screen.getByLabelText("3 unread jobs")).toBeInTheDocument();
  expect(api.writes()).toHaveLength(0);
});

it("ignores Open's filter in Unread and offers a way back from an empty read filter", async () => {
  const api = inboxApi(inboxJobs(2));
  const view = workspace(<JobsClient mode="inbox" />, {
    searchParams: "readStatus=read&layout=list",
  });
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.queryByRole("button", { name: /^Read status is /u })).not.toBeInTheDocument();
  const user = userEvent.setup();
  view.visit("/jobs", <JobsClient />);
  await screen.findByRole("button", { name: "Filter 2" });
  await screen.findByRole("heading", { name: "No read jobs in Open" });
  expect(
    screen.queryByRole("heading", { name: "No open jobs in your index" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show all open jobs" }));
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getByRole("link", { name: "Role 2" })).toBeInTheDocument();
  expect(screen.getByLabelText("2 unread jobs")).toBeInTheDocument();
  expect(api.writes()).toHaveLength(0);
});

it("keeps selected results and counts during a pending or failed bulk write, then updates only the submitted page", async () => {
  const api = inboxApi();
  workspace(<JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Select" }));
  await user.click(screen.getByRole("button", { name: "Select Role 1 at Example" }));
  expect(screen.getByRole("button", { name: "Select all jobs on this page" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  const pending = deferred();
  api.state.writeGate = pending.promise;
  api.state.failWrites = true;
  const bulk = screen.getByRole("button", { name: "Mark read for selected jobs" });
  await user.click(bulk);
  expect(bulk).toHaveAttribute("aria-disabled", "true");
  const dock = screen.getByRole("toolbar", { name: "Selected jobs" });
  expect(within(dock).getByRole("button", { name: "Clear selection" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(
    within(dock).getByRole("button", { name: "Select all jobs on this page" }),
  ).toHaveAttribute("aria-disabled", "true");
  expect(within(dock).getByRole("button", { name: "Done" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await user.keyboard("{Escape}");
  expect(screen.getByRole("toolbar", { name: "Selected jobs" })).toBe(dock);
  expect(screen.getByRole("heading", { name: "Role 1" })).toBeInTheDocument();
  expect(screen.getAllByLabelText("3 unread jobs")).toHaveLength(1);
  await act(async () => pending.resolve());
  await screen.findByRole("button", { name: "Retry read change" });
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Role 1" })).toBeInTheDocument();
  api.state.failWrites = false;
  await user.click(screen.getByRole("button", { name: "Retry read change" }));
  await screen.findByRole("heading", { name: "Role 3" });
  await waitFor(() => expect(screen.getByText("0 selected")).toBeInTheDocument());
  const [, request] = api.writes()[0] ?? [];
  expect(readStateInputSchema.parse(JSON.parse(String(request?.body)))).toEqual({
    ids: api.state.jobs.slice(0, 2).map((job) => job.id),
    read: true,
  });
  expect(api.state.jobs[2]?.readAt).toBeNull();
  expect(screen.getAllByLabelText("1 unread job")).toHaveLength(1);
});

it("clears selection across pages and views and never includes arriving or hidden jobs", async () => {
  const api = inboxApi();
  const view = workspace(<JobsClient mode="inbox" />);
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Select" }));
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("link", { name: "Role 3" });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  view.visit("/jobs", <JobsClient />);
  await screen.findByRole("link", { name: "Role 3" });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: "Previous" }));
  await screen.findByRole("link", { name: "Role 1" });
  await user.click(screen.getByRole("button", { name: "Select" }));
  expect(screen.getByText("0 selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  const arrival = inboxJobs(4)[3];
  if (!arrival) throw new Error("Missing fixture posting.");
  api.state.jobs.unshift({ ...arrival, firstSeenAt: "2026-11-08T12:00:00.000Z" });
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs"] });
  });
  await screen.findByRole("heading", { name: "Role 4" });
  expect(screen.getByRole("button", { name: "Select Role 4 at Example" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(screen.getByRole("button", { name: "Select Role 1 at Example" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("1 selected")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Mark read for selected jobs" }));
  await waitFor(() => expect(screen.getByText("0 selected")).toBeInTheDocument());
  const [, request] = api.writes()[0] ?? [];
  expect(readStateInputSchema.parse(JSON.parse(String(request?.body))).ids).toEqual([
    inboxJobs(1)[0]?.id,
  ]);
});

it("keeps card controls separate from links and moves focus when the focused unread card disappears", async () => {
  const api = inboxApi(inboxJobs(2));
  workspace(<JobsClient mode="inbox" />);
  const first = await screen.findByRole("link", { name: "Role 1" });
  const card = first.closest("article");
  if (!card) throw new Error("Missing fixture card.");
  const button = within(card).getByRole("button", { name: "Mark read" });
  expect(first).not.toContainElement(button);
  expect(within(card).queryByRole("checkbox")).not.toBeInTheDocument();
  const user = userEvent.setup();
  button.focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(screen.getByRole("link", { name: "Role 2" })).toHaveFocus());
  expect(screen.queryByRole("link", { name: "Role 1" })).not.toBeInTheDocument();
  const lastCard = screen.getByRole("link", { name: "Role 2" }).closest("article");
  if (!lastCard) throw new Error("Missing fixture card.");
  await userEvent.setup().click(within(lastCard).getByRole("button", { name: "Mark read" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "No unread jobs" })).toHaveFocus(),
  );
  expect(api.writes()).toHaveLength(2);
});

it("serializes a card write and a subsequent detail visit and completes cache updates after list unmount", async () => {
  const api = inboxApi(inboxJobs(2));
  const view = workspace(<JobsClient mode="inbox" />);
  const first = await screen.findByRole("link", { name: "Role 1" });
  const card = first.closest("article");
  const second = api.state.jobs[1];
  if (!card || !second) throw new Error("Missing fixture posting.");
  const pending = deferred();
  api.state.writeGate = pending.promise;
  await userEvent.setup().click(within(card).getByRole("button", { name: "Mark read" }));
  view.visit(`/jobs/${second.id}`, <JobDetailsClient id={second.id} />);
  await screen.findByRole("heading", { name: second.title });
  expect(api.writes()).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Mark read" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await act(async () => pending.resolve());
  await waitFor(() => expect(screen.getByRole("button", { name: "Mark unread" })).toBeEnabled());
  expect(api.writes()).toHaveLength(2);
  expect(api.state.jobs.every((job) => job.readAt !== null)).toBe(true);
  expect(screen.getByLabelText("0 unread jobs")).toBeInTheDocument();
});

it("keeps the review page stable while reading, preserves manual unread, and reconciles on close", async () => {
  const scrollTo = vi.fn<() => void>();
  setupCollectionControls();
  const api = inboxApi();
  const view = workspace(
    <div data-workspace-scroll>
      <JobsClient mode="inbox" />
    </div>,
    { pathname: "/inbox" },
  );
  const scroll = document.querySelector<HTMLElement>("[data-workspace-scroll]");
  if (!scroll) throw new Error("Missing workspace scroller.");
  scroll.scrollTop = 420;
  scroll.scrollTo = scrollTo;
  const user = userEvent.setup();
  const first = await screen.findByRole("link", { name: "Role 1" });
  const second = screen.getByRole("link", { name: "Role 2" });
  await user.click(first);
  const reader = await screen.findByRole("dialog", { name: "Posting reader" });
  await within(reader).findByRole("heading", { name: "Role 1" });
  await waitFor(() =>
    expect(within(reader).getByRole("button", { name: "Mark unread" })).toBeEnabled(),
  );
  expect(api.writes()).toHaveLength(1);
  expect(first).toBeInTheDocument();
  expect(second).toBeInTheDocument();
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.get("job")).toBe(api.state.jobs[0]?.id);
  expect(within(reader).getByRole("button", { name: "Previous posting" })).toBeDisabled();
  await user.click(within(reader).getByRole("button", { name: "Mark unread" }));
  await waitFor(() =>
    expect(within(reader).getByRole("button", { name: "Mark read" })).toBeEnabled(),
  );
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["jobs"] });
  });
  expect(api.writes()).toHaveLength(2);
  expect(api.state.jobs[0]?.readAt).toBeNull();
  await user.click(within(reader).getByRole("button", { name: "Next posting" }));
  const nextReader = await screen.findByRole("dialog", { name: "Posting reader" });
  await within(nextReader).findByRole("heading", { name: "Role 2" });
  await waitFor(() =>
    expect(within(nextReader).getByRole("button", { name: "Mark unread" })).toBeEnabled(),
  );
  expect(api.writes()).toHaveLength(3);
  expect(second).toBeInTheDocument();
  expect(within(nextReader).getByRole("button", { name: "Next posting" })).toBeDisabled();
  await user.click(
    within(nextReader).getByRole("button", { name: "Close reader and return to Inbox" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Posting reader" })).not.toBeInTheDocument(),
  );
  await screen.findByRole("link", { name: "Role 3" });
  expect(screen.queryByRole("link", { name: "Role 2" })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("link", { name: "Role 1" })).toHaveFocus());
  expect(scrollTo).toHaveBeenCalledWith({ top: 420, left: 0, behavior: "instant" });
});

it("keeps table headers and links mounted when opening and navigating the reader", async () => {
  inboxApi();
  workspace(<JobsClient mode="inbox" />, {
    pathname: "/inbox",
    searchParams: "?layout=table",
  });
  const first = await screen.findByRole("link", { name: "Role 1" });
  const table = screen.getByRole("table", { name: "Unread jobs" });
  const header = within(table).getByRole("button", { name: "Job" });
  const user = userEvent.setup();
  await user.click(first);
  const reader = await screen.findByRole("dialog", { name: "Posting reader" });
  await waitFor(() =>
    expect(within(reader).getByRole("button", { name: "Mark unread" })).toBeEnabled(),
  );
  expect(header).toBeInTheDocument();
  expect(first).toBeInTheDocument();
  await user.click(within(reader).getByRole("button", { name: "Next posting" }));
  await within(reader).findByRole("heading", { name: "Role 2" });
  expect(header).toBeInTheDocument();
  expect(first).toBeInTheDocument();
});

it("retains table elements during sorting and disables stale-row writes until the new results arrive", async () => {
  const api = inboxApi(
    inboxJobs(3).map((job, index) => ({
      ...job,
      title: ["Gamma", "Beta", "Alpha"][index] ?? job.title,
    })),
  );
  workspace(<JobsClient />, { searchParams: "?layout=table" });
  const first = await screen.findByRole("link", { name: "Gamma" });
  const second = screen.getByRole("link", { name: "Beta" });
  const table = screen.getByRole("table", { name: "Open jobs" });
  const header = within(table).getByRole("button", { name: "Job" });
  const pending = deferred();
  api.state.listGate = pending.promise;
  await userEvent.setup().click(header);
  expect(first).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading jobs" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
  expect(within(table).getAllByRole("button", { name: "Mark read" })[0]).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await act(async () => pending.resolve());
  await screen.findByRole("link", { name: "Alpha" });
  expect(first).not.toBeInTheDocument();
  expect(second).toBeInTheDocument();
  expect(header).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Open jobs" })).toBe(table);
});

it("selects table rows with checkboxes and exposes compact read actions through tooltips", async () => {
  inboxApi();
  workspace(<JobsClient />, { searchParams: "?layout=table" });
  await screen.findByRole("link", { name: "Role 1" });
  const table = screen.getByRole("table", { name: "Open jobs" });
  const user = userEvent.setup();
  const read = within(table).getAllByRole("button", { name: "Mark read" })[0];
  if (!read) throw new Error("Missing read action.");
  expect(read).toHaveTextContent("");
  await user.hover(read);
  expect(
    await screen.findByText("Mark read", { selector: "[data-slot=tooltip-content]" }),
  ).toBeVisible();
  await user.unhover(read);
  const first = within(table).getByRole("checkbox", { name: "Select Role 1 at Example" });
  const all = within(table).getByRole("checkbox", { name: "Select all jobs on this page" });
  await user.click(first);
  expect(first).toBeChecked();
  expect(all).toHaveAttribute("aria-checked", "mixed");
  expect(screen.getByRole("button", { name: "Done", pressed: true })).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: "Posting reader" })).not.toBeInTheDocument();
  await user.click(all);
  expect(all).toBeChecked();
  expect(within(table).getByRole("checkbox", { name: "Select Role 2 at Example" })).toBeChecked();
  await user.click(all);
  expect(first).not.toBeChecked();
  expect(all).not.toBeChecked();
});

it.each(["list", "cards", "table"])(
  "opens the direct application link independently of reading and selection in %s layout",
  async (layout) => {
    const api = inboxApi(inboxJobs(1));
    workspace(<JobsClient />, { searchParams: `?layout=${layout}` });
    await screen.findByRole("link", { name: "Role 1" });
    const apply = screen.getByRole("link", { name: "Apply (opens in a new tab)" });
    const read = screen.getByRole("button", { name: "Mark read" });
    expect(apply).toHaveAttribute("href", api.state.jobs[0]?.applyUrl);
    expect(apply).toHaveAttribute("target", "_blank");
    expect(apply).toHaveAttribute("rel", "noopener noreferrer");
    expect(apply.parentElement).toContainElement(read);
    expect(apply.textContent).toBe(layout === "list" ? "Apply" : "");
    // Prevent native navigation in JSDOM while exercising the real row/card handler.
    apply.addEventListener("click", (event) => event.preventDefault());
    const user = userEvent.setup();
    await user.click(apply);
    expect(screen.queryByRole("dialog", { name: "Posting reader" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(apply);
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(api.writes()).toHaveLength(0);
  },
);

it("uses Availability as a removable and pausable property filter over open and historical jobs", async () => {
  const jobs = inboxJobs(3);
  inboxApi(
    jobs.map((job, index) => ({
      ...job,
      unavailableAt: index === 1 ? job.firstSeenAt : null,
      unavailableReason: index === 1 ? "missing" : null,
      boardArchivedAt: index === 2 ? job.firstSeenAt : null,
    })),
  );
  const view = workspace(<JobsClient />, { searchParams: "?pageSize=10&layout=list" });
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.queryByRole("link", { name: "Role 2" })).not.toBeInTheDocument();
  const user = userEvent.setup();
  await chooseFilter(user, "Availability", "All");
  await screen.findByRole("link", { name: "Role 2" });
  expect(screen.getByRole("link", { name: "Role 3" })).toBeInTheDocument();
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.get("filters")).toBe("[]");
  await chooseFilter(user, "Availability", "History");
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "Role 1" })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("link", { name: "Role 2" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Filter 1" }));
  expect(screen.queryByRole("group", { name: "Availability" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Disable Availability filter" }));
  await user.keyboard("{Escape}");
  await screen.findByRole("link", { name: "Role 1" });
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.get("filters")).toContain(
    '"disabled":true',
  );
});

it.each(["jobs", "inbox"] as const)(
  "restores geography from the URL and combines department narrowing across %s layouts",
  async (mode) => {
    const jobs = inboxJobs(4).map((job, index) => ({
      ...job,
      department: index === 0 || index === 2 ? "Software Engineering" : "Marketing",
      locations: [
        {
          text: index === 2 ? "Remote (EU)" : index === 3 ? "Germany" : "Spain",
          country: null,
          address: null,
        },
      ],
    }));
    const api = inboxApi(jobs);
    const filters = [
      {
        id: "region",
        filterId: "region-restored",
        variant: "select",
        operator: "eq",
        value: "europe",
      },
    ];
    const searchParams = new URLSearchParams({
      filters: JSON.stringify(filters),
      pageSize: "10",
    }).toString();
    const view = workspace(<JobsClient mode={mode} />, {
      pathname: mode === "inbox" ? "/inbox" : "/jobs",
      searchParams,
    });
    await screen.findByRole("link", { name: "Role 1" });
    const user = userEvent.setup();
    await chooseFilter(user, "Country", "Spain");
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Role 3" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: "Role 4" })).not.toBeInTheDocument();
    await chooseFilter(user, "Department", "Engineering");
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Role 2" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Role 1" })).toBeInTheDocument();
    const restored = jobListInputSchema.parse(
      Object.fromEntries(view.urlUpdates.mock.lastCall?.[0].searchParams ?? []),
    );
    expect(restored.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "region", value: "europe" }),
        expect.objectContaining({ id: "country", value: "ES" }),
        expect.objectContaining({ id: "department", value: "engineering" }),
      ]),
    );
    for (const layout of ["Table", "Cards", "List"]) {
      await chooseLayout(user, "Job", layout);
      expect(screen.getByRole("link", { name: "Role 1" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Role 2" })).not.toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Filter 3" }));
    expect(screen.getByRole("button", { name: "Region filter value" })).toHaveTextContent("Europe");
    await user.click(screen.getByRole("button", { name: "Disable Country filter" }));
    await user.keyboard("{Escape}");
    await screen.findByRole("link", { name: "Role 3" });
    expect(api.writes()).toHaveLength(0);
  },
);

it("keeps reader failure recovery focused and does not mark failed details read", async () => {
  const api = inboxApi();
  api.state.failDetails = true;
  workspace(<JobsClient mode="inbox" />, { pathname: "/inbox" });
  await userEvent.setup().click(await screen.findByRole("link", { name: "Role 1" }));
  const reader = await screen.findByRole("dialog", { name: "Posting reader" });
  await within(reader).findByRole("button", { name: "Try again" });
  await waitFor(() =>
    expect(
      within(reader).getByRole("button", { name: "Close reader and return to Inbox" }),
    ).toHaveFocus(),
  );
  expect(api.writes()).toHaveLength(0);
});

it("restores search and board filters, clears selection on search, and offers recovery from no matches", async () => {
  const api = inboxApi();
  const view = workspace(<JobsClient />, {
    searchParams: `q=Role&boardId=${api.state.jobs[0]?.boardId}&layout=list`,
  });
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  expect(screen.getByRole("searchbox", { name: "Search jobs" })).toHaveValue("Role");
  expect(screen.getByRole("button", { name: "Filter 2" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Select" }));
  await user.click(screen.getByRole("button", { name: "Select all jobs on this page" }));
  await user.clear(screen.getByRole("searchbox", { name: "Search jobs" }));
  await user.type(screen.getByRole("searchbox", { name: "Search jobs" }), "nothing matches");
  await screen.findByRole("heading", { name: "No jobs match these filters" });
  expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false");
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.get("q")).toBe("nothing matches");
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getByRole("searchbox", { name: "Search jobs" })).toHaveValue("");
  expect(screen.queryByRole("button", { name: /^Board is /u })).not.toBeInTheDocument();
  expect(api.writes()).toHaveLength(0);
});

it("clears read status together with search and board filters", async () => {
  const api = inboxApi();
  const view = workspace(<JobsClient />, {
    searchParams: `q=missing&readStatus=read&boardId=${api.state.jobs[0]?.boardId}&layout=list`,
  });
  await screen.findByRole("heading", { name: "No jobs match these filters" });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Clear filters" }));
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.queryByRole("button", { name: /^Read status is /u })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Board is /u })).not.toBeInTheDocument();
  expect(view.urlUpdates.mock.lastCall?.[0].searchParams.has("readStatus")).toBe(false);
  expect(screen.getByRole("searchbox", { name: "Search jobs" })).toHaveValue("");
  expect(api.writes()).toHaveLength(0);
});

it("moves focus to new results only after an explicit page request resolves", async () => {
  setupCollectionControls();
  const api = inboxApi(inboxJobs(6));
  workspace(<JobsClient />);
  await screen.findByRole("link", { name: "Role 1" });
  const user = userEvent.setup();
  const pending = deferred();
  api.state.listGate = pending.promise;
  const next = screen.getByRole("button", { name: "Next" });
  await user.click(next);
  expect(next).toHaveFocus();
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  await act(async () => pending.resolve());
  await screen.findByRole("link", { name: "Role 3" });
  expect(screen.getByRole("region", { name: "Open jobs" })).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    block: "start",
    behavior: "instant",
  });
  const search = screen.getByRole("searchbox", { name: "Search jobs" });
  await user.type(search, "Role 5");
  await screen.findByRole("link", { name: "Role 5" });
  expect(search).toHaveFocus();
});

it("shares filters and selection across layouts, and resets the page scope on page-size changes", async () => {
  const api = inboxApi(inboxJobs(30));
  const view = workspace(<JobsClient />, { searchParams: "q=Role&page=2&pageSize=10&layout=list" });
  await screen.findByRole("link", { name: "Role 11" });
  const user = userEvent.setup();
  const requestCount = api.fetcher.mock.calls.filter(([input]) =>
    String(input).startsWith("/api/jobs?"),
  ).length;
  const mode = screen.getByRole("button", { name: "Select" });
  await user.click(mode);
  await user.click(screen.getByRole("button", { name: "Select Role 11 at Example" }));
  const dock = screen.getByRole("toolbar", { name: "Selected jobs" });
  expect(dock.parentElement?.tagName).toBe("FOOTER");
  expect(dock.parentElement).toContainElement(
    screen.getByRole("navigation", { name: "Jobs pages" }),
  );
  expect(mode).toHaveAccessibleName("Done");
  await chooseLayout(user, "Job", "Table");
  const table = screen.getByRole("table", { name: "Open jobs" });
  expect(within(table).getByRole("link", { name: "Role 11" }).closest("tr")).toHaveAttribute(
    "data-state",
    "selected",
  );
  expect(screen.getByRole("toolbar", { name: "Selected jobs" })).toBe(dock);
  expect(screen.getByRole("button", { name: "Done", pressed: true })).toBe(mode);
  await chooseLayout(user, "Job", "Cards");
  expect(screen.getByRole("button", { name: "Select Role 11 at Example" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    api.fetcher.mock.calls.filter(([input]) => String(input).startsWith("/api/jobs?")),
  ).toHaveLength(requestCount);
  setupCollectionControls();
  await user.click(screen.getByRole("combobox", { name: "Jobs per page" }));
  await user.click(await screen.findByRole("option", { name: "25 rows" }));
  await screen.findByRole("link", { name: "Role 1" });
  expect(screen.getByRole("link", { name: "Role 25" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Role 26" })).not.toBeInTheDocument();
  expect(screen.queryByRole("toolbar", { name: "Selected jobs" })).not.toBeInTheDocument();
  expect(mode).toHaveAccessibleName("Select");
  const params = view.urlUpdates.mock.lastCall?.[0].searchParams;
  expect(params?.get("q")).toBe("Role");
  expect(params?.get("layout")).toBe("cards");
  expect(params?.get("pageSize")).toBe("25");
  expect(params?.has("page")).toBe(false);
  expect(api.writes()).toHaveLength(0);
});
