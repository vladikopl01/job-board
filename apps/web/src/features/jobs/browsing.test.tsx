// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/components/query-provider";

import { detailFixture, listFixture, postingId } from "../../../test/job-fixtures";
import { JobDetailsClient } from "./job-details-client";
import { JobsClient } from "./jobs-client";

const push = vi.hoisted(() => vi.fn<(url: string) => void>());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
});

it.each([
  { name: "jobs list", element: <JobsClient />, label: "Loading jobs", response: listFixture() },
  {
    name: "job details",
    element: <JobDetailsClient id={postingId} />,
    label: "Loading posting",
    response: { posting: detailFixture },
  },
])("shows skeletons while loading $name", async ({ element, label, response }) => {
  let release: () => void = () => {
    throw new Error("Local response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => {
      await pending;
      return Response.json(response);
    }),
  );
  const { container } = render(
    <NuqsTestingAdapter>
      <QueryProvider>{element}</QueryProvider>
    </NuqsTestingAdapter>,
  );
  expect(screen.getByRole("status", { name: label })).toHaveClass("sr-only");
  expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  await act(async () => release());
  await screen.findByRole("link", { name: "Example" });
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});

it("restores History/page from the URL and updates navigation without provider mutations", async () => {
  const updates = vi.fn<(event: UrlUpdateEvent) => void>();
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input), "http://localhost");
    const history = url.searchParams.get("view") === "history";
    return Response.json(
      listFixture(
        [
          {
            ...detailFixture,
            title: history ? "Historical role" : "Current role",
            unavailableAt: history ? detailFixture.lastSeenAt : null,
            unavailableReason: history ? "missing" : null,
          },
        ],
        Number(url.searchParams.get("page")),
        51,
      ),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <NuqsTestingAdapter hasMemory searchParams="?view=history&page=2" onUrlUpdate={updates}>
      <QueryProvider>
        <JobsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  const user = userEvent.setup();
  const postingLink = await screen.findByRole("link", { name: "Historical role" });
  expect(postingLink).toHaveClass("after:absolute", "after:inset-0");
  const companyLink = screen.getByRole("link", { name: "Example" });
  expect(postingLink).not.toContainElement(companyLink);
  expect(companyLink).toHaveClass("relative", "z-10");
  expect(screen.getByRole("link", { name: "Example" })).toHaveAttribute(
    "href",
    `/boards/${detailFixture.boardId}`,
  );
  expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Previous" }));
  await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument());
  await user.click(screen.getByRole("tab", { name: "Open" }));
  await screen.findByRole("link", { name: "Current role" });
  expect(updates).toHaveBeenCalled();
  expect(fetcher.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
});

it("shows loading inside History until its local results arrive", async () => {
  let releaseHistory: () => void = () => {
    throw new Error("History response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    releaseHistory = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      if (String(input).includes("view=history")) {
        await pending;
        return Response.json(listFixture([], 1, 0));
      }
      return Response.json(listFixture());
    }),
  );
  render(
    <NuqsTestingAdapter hasMemory>
      <QueryProvider>
        <JobsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await screen.findByRole("link", { name: "Software Engineer" });
  await userEvent.setup().click(screen.getByRole("tab", { name: "History" }));
  const panel = await screen.findByRole("tabpanel", { name: "History" });
  expect(await within(panel).findByText("Loading job history…")).toBeInTheDocument();
  expect(panel.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  expect(panel).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("link", { name: "Software Engineer" })).not.toBeInTheDocument();
  expect(screen.queryByText("No posting history yet")).not.toBeInTheDocument();
  await act(async () => releaseHistory());
  await screen.findByText("No posting history yet");
  expect(panel).toHaveAttribute("aria-busy", "false");
  const manage = screen.getByRole("link", { name: "Manage boards" });
  expect(manage).toHaveClass("border-border");
  expect(manage).not.toHaveClass("border-transparent");
});

it("keeps pagination focus and current results until the next local page arrives", async () => {
  let release: () => void = () => {
    throw new Error("Next page response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const page = Number(new URL(String(input), "http://localhost").searchParams.get("page"));
    if (page === 2) await pending;
    return Response.json(
      listFixture([{ ...detailFixture, title: `Role on page ${page}` }], page, 51),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <NuqsTestingAdapter hasMemory>
      <QueryProvider>
        <JobsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await screen.findByRole("link", { name: "Role on page 1" });
  const user = userEvent.setup();
  const next = screen.getByRole("button", { name: "Next" });
  next.focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(next).toHaveAttribute("aria-disabled", "true"));
  expect(next).toHaveFocus();
  expect(screen.getByRole("link", { name: "Role on page 1" })).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading jobs" })).not.toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => release());
  await screen.findByRole("link", { name: "Role on page 2" });
  expect(screen.getByRole("button", { name: "Next" })).toBe(next);
  expect(next).toHaveFocus();
  expect(next).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByRole("status")).toHaveTextContent("Page 2 of 2");
  await user.keyboard("{Enter}");
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("limits card locations to five with an accurate remaining count", async () => {
  const locations = ["London", "Berlin", "Paris", "Madrid", "Rome", "Vienna", "Prague"].map(
    (text) => ({ text, country: null, address: null }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => Response.json(listFixture([{ ...detailFixture, locations }]))),
  );
  render(
    <NuqsTestingAdapter>
      <QueryProvider>
        <JobsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await screen.findByRole("link", { name: detailFixture.title });
  expect(
    screen.getByText(/London, Berlin, Paris, Madrid, Rome, 2 more locations/u),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Vienna|Prague/u)).not.toBeInTheDocument();
});

it("renders descriptions as inert text and requires confirmation before correcting identity", async () => {
  let shouldFail = true;
  const newId = "33333333-3333-4333-8333-333333333333";
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === "POST")
      return shouldFail
        ? Response.json(
            { error: { code: "STORAGE_ERROR", message: "Could not save; retry." } },
            { status: 500 },
          )
        : Response.json({ id: newId });
    return Response.json({
      posting: {
        ...detailFixture,
        descriptionPlain: '<script>alert("unsafe")</script>\n• Build software',
        descriptionHtml: null,
        compensation: { compensationTierSummary: "EUR 80k–100k" },
      },
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const { container } = render(
    <QueryProvider>
      <JobDetailsClient id={postingId} />
    </QueryProvider>,
  );
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: detailFixture.title });
  expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
  expect(container.querySelector("script, img, iframe")).toBeNull();
  expect(screen.getByText("EUR 80k–100k")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Apply/u })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  const trigger = screen.getByRole("button", { name: "Treat as new" });
  trigger.focus();
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog", { name: "Treat this posting as new?" });
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  await user.click(trigger);
  await user.click(screen.getByRole("button", { name: "Create new posting" }));
  await screen.findByText("Could not save; retry.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  shouldFail = false;
  await user.click(screen.getByRole("button", { name: "Create new posting" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith(`/jobs/${newId}`));
});

it("retains historical details without exposing replacement controls", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      Response.json({
        posting: {
          ...detailFixture,
          unavailableAt: detailFixture.lastSeenAt,
          unavailableReason: "superseded",
        },
      }),
    ),
  );
  render(
    <QueryProvider>
      <JobDetailsClient id={postingId} />
    </QueryProvider>,
  );
  await screen.findByText("Superseded");
  expect(screen.queryByRole("button", { name: "Treat as new" })).not.toBeInTheDocument();
});

it("preserves description headings and links and presents readable job facts with breadcrumbs", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      Response.json({
        posting: {
          ...detailFixture,
          descriptionHtml:
            '<h2>About the role</h2><p>Build <strong>useful</strong> software.</p><p>Read our <a href="https://example.com/values" target="_blank" rel="noopener noreferrer">values</a>.</p><h3>Requirements</h3><ul><li>TypeScript</li></ul>',
          employmentType: "FullTime",
          workplaceType: "on-site",
          compensation: {
            compensationTiers: [{ title: "Europe", tierSummary: "EUR 80,000–100,000" }],
          },
        },
      }),
    ),
  );
  render(
    <QueryProvider>
      <JobDetailsClient id={postingId} />
    </QueryProvider>,
  );
  await screen.findByRole("heading", { name: detailFixture.title });
  const description = screen.getByRole("region", { name: "Job description" });
  expect(
    within(description).getByRole("heading", { name: "About the role", level: 2 }),
  ).toBeInTheDocument();
  expect(
    within(description).getByRole("heading", { name: "Requirements", level: 3 }),
  ).toBeInTheDocument();
  expect(within(description).getByRole("link", { name: "values" })).toHaveAttribute(
    "href",
    "https://example.com/values",
  );
  expect(within(description).getByRole("listitem")).toHaveTextContent("TypeScript");
  expect(screen.getByText("Full Time")).toBeInTheDocument();
  expect(screen.getByText("On-site")).toBeInTheDocument();
  expect(screen.getByText("Europe · EUR 80,000–100,000")).toBeInTheDocument();
  const breadcrumbs = screen.getByRole("navigation", { name: "breadcrumb" });
  expect(within(breadcrumbs).getByRole("link", { name: "Jobs" })).toHaveAttribute("href", "/jobs");
  expect(within(breadcrumbs).getByText(detailFixture.title)).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("shows a local read failure rather than an empty successful list", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { code: "STORAGE_ERROR", message: "Local storage is unavailable." } },
        { status: 500 },
      ),
    ),
  );
  render(
    <NuqsTestingAdapter>
      <QueryProvider>
        <JobsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await screen.findByText("Local storage is unavailable.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.queryByText("No open jobs in your index")).not.toBeInTheDocument();
});

it("offers local navigation in the custom not-found state for an unknown posting", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          error: { code: "NOT_FOUND", message: "This posting was not found." },
        },
        { status: 404 },
      ),
    ),
  );
  render(
    <QueryProvider>
      <JobDetailsClient id={postingId} />
    </QueryProvider>,
  );
  await screen.findByRole("heading", { name: "Posting not found" });
  expect(screen.getByRole("link", { name: /Browse jobs/u })).toHaveAttribute("href", "/jobs");
  expect(
    screen.getByRole("link", { name: /Browse jobs/u }).querySelector('[data-icon="inline-start"]'),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Manage boards" })).toHaveAttribute("href", "/boards");
  expect(screen.queryByRole("button", { name: "Treat as new" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
});
