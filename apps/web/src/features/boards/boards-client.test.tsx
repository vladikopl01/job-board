// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { afterEach, expect, it, vi } from "vitest";
import {
  chooseFilter,
  chooseLayout,
  setupCollectionControls,
} from "../../../test/collection-controls";

import { QueryProvider } from "@/components/query-provider";
import { UnreadCount } from "@/features/jobs/unread-count";

import { BoardsClient } from "./boards-client";
import type { Board } from "./schemas";

const ramp = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Ramp",
  provider: "ashby",
  sourceHost: "jobs.ashbyhq.com",
  boardKey: "ramp",
  canonicalUrl: "https://jobs.ashbyhq.com/ramp",
  createdAt: "2026-10-27T10:00:00.000Z",
  updatedAt: "2026-10-27T10:00:00.000Z",
  archivedAt: null,
  lastSuccessfulRefreshAt: null,
  refreshGeneration: 0,
} satisfies Board;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubBoardApi(fetch: typeof globalThis.fetch) {
  setupCollectionControls();
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    input === "/api/boards/name-suggestion"
      ? Promise.reject(new TypeError("Company metadata is unavailable in this scenario."))
      : fetch(input, init),
  );
}

function renderBoards(
  searchParams = "?layout=list",
  onUrlUpdate?: (event: UrlUpdateEvent) => void,
) {
  return render(
    <NuqsTestingAdapter
      hasMemory
      searchParams={searchParams}
      {...(onUrlUpdate ? { onUrlUpdate } : {})}
    >
      <QueryProvider>
        <BoardsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it.each(["", "?layout=unknown"])("defaults Boards to Table for URL %j", async (searchParams) => {
  stubBoardApi(vi.fn<typeof fetch>(async () => json({ boards: [ramp] })));
  renderBoards(searchParams);
  const table = await screen.findByRole("table", { name: "Active boards" });
  expect(screen.getByRole("button", { name: "Board layouts: Table" })).toHaveTextContent("Table");
  expect(within(table).getByRole("link", { name: "Ramp" })).toHaveAttribute(
    "href",
    `/boards/${ramp.id}`,
  );
});

it("restores the archived filter from the URL and keeps changes bookmarkable", async () => {
  const archived = { ...ramp, archivedAt: "2026-10-27T11:00:00.000Z" };
  const updates = vi.fn<(event: UrlUpdateEvent) => void>();
  stubBoardApi(vi.fn<typeof globalThis.fetch>(async () => json({ boards: [archived] })));
  renderBoards("?view=archived", updates);
  const user = userEvent.setup();

  expect(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u })).toBeEnabled();
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  await chooseFilter(user, "Status", "Active");
  expect(await screen.findByText("No active boards yet")).toBeInTheDocument();
  await waitFor(() =>
    expect(updates).toHaveBeenLastCalledWith(expect.objectContaining({ queryString: "" })),
  );
  await chooseFilter(user, "Status", "Archived");
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  await waitFor(() =>
    expect(updates.mock.lastCall?.[0].searchParams.get("filters")).toContain('"value":"archived"'),
  );
});

it("shows the legacy provider URL value in advanced controls", async () => {
  stubBoardApi(vi.fn<typeof fetch>(async () => json({ boards: [ramp] })));
  renderBoards("?provider=ashby");
  await screen.findByRole("heading", { name: "Ramp" });
  await userEvent.setup().click(screen.getByRole("button", { name: "Filter 2" }));
  expect(screen.getByRole("button", { name: "Provider filter value" })).toHaveTextContent("Ashby");
});

it("uses Status as a removable and disableable condition in the normal filter builder", async () => {
  const archived = {
    ...ramp,
    id: crypto.randomUUID(),
    displayName: "Archived company",
    archivedAt: "2026-10-27T11:00:00.000Z",
  };
  stubBoardApi(vi.fn<typeof fetch>(async () => json({ boards: [ramp, archived] })));
  renderBoards();
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Ramp" });
  await user.click(screen.getByRole("button", { name: "Filter 1" }));
  expect(screen.getByRole("button", { name: "Status filter value" })).toHaveTextContent("Active");
  await user.click(screen.getByRole("button", { name: "Disable Status filter" }));
  expect(await screen.findByRole("heading", { name: "Archived company" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Enable Status filter" }));
  expect(screen.queryByRole("heading", { name: "Archived company" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remove Status filter" }));
  expect(await screen.findByRole("heading", { name: "Archived company" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Boards" })).toBeInTheDocument();
});

it("filters before pagination and shares its URL scope across List, Cards, and Table", async () => {
  const boards: Board[] = Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    const provider = number % 2 === 0 ? "lever" : "ashby";
    return {
      ...ramp,
      id: `20000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
      boardKey: `company-${number}`,
      displayName: `Company ${number}`,
      provider,
      sourceHost: provider === "lever" ? "jobs.lever.co" : "jobs.ashbyhq.com",
      canonicalUrl:
        provider === "lever"
          ? `https://jobs.lever.co/company-${number}`
          : `https://jobs.ashbyhq.com/company-${number}`,
    };
  });
  const fetcher = vi.fn<typeof fetch>(async () => json({ boards }));
  stubBoardApi(fetcher);
  const updates = vi.fn<(event: UrlUpdateEvent) => void>();
  renderBoards("?page=2&pageSize=10", updates);
  await screen.findByRole("heading", { name: "Company 11" });
  expect(screen.queryByRole("heading", { name: "Company 1" })).not.toBeInTheDocument();
  const user = userEvent.setup();
  setupCollectionControls();
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("heading", { name: "Company 21" });
  expect(screen.getByRole("region", { name: "Active boards" })).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    block: "start",
    behavior: "instant",
  });
  await chooseFilter(user, "Provider", "Lever");
  await screen.findByRole("heading", { name: "Company 2" });
  expect(screen.getByText(/1–10 of 15 boards/u)).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox", { name: "Search boards" }), "Company 2");
  await screen.findByText(/1–6 of 6 boards/u);
  expect(screen.getByRole("heading", { name: "Company 28" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Company 22" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Company 21" })).not.toBeInTheDocument();
  await chooseLayout(user, "Board", "Table");
  expect(
    within(screen.getByRole("table", { name: "Active boards" })).getAllByRole("row"),
  ).toHaveLength(7);
  expect(screen.getByRole("link", { name: "Company 22" })).toHaveAttribute(
    "href",
    `/boards/${boards[21]?.id}`,
  );
  await chooseLayout(user, "Board", "Cards");
  expect(screen.getByRole("heading", { name: "Company 22" })).toBeInTheDocument();
  expect(updates.mock.lastCall?.[0].searchParams.get("layout")).toBe("cards");
  expect(updates.mock.lastCall?.[0].searchParams.get("q")).toBe("Company 2");
  expect(updates.mock.lastCall?.[0].searchParams.get("filters")).toContain('"value":"lever"');
  expect(updates.mock.lastCall?.[0].searchParams.has("page")).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("shows card skeletons while the first local boards query is pending", async () => {
  let release: () => void = () => {
    throw new Error("Board response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  stubBoardApi(
    vi.fn<typeof globalThis.fetch>(async () => {
      await pending;
      return json({ boards: [ramp] });
    }),
  );
  const { container } = renderBoards();
  expect(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u })).toBeEnabled();
  expect(screen.getByRole("button", { name: /^Board layouts:/u })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
  const newBoard = screen.getByRole("button", { name: "New" });
  expect(newBoard).toBeEnabled();
  expect(screen.getByRole("status", { name: "Loading boards" })).toHaveClass("sr-only");
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons.length).toBeGreaterThan(0);
  const panel = screen.getByRole("region", { name: "Active boards" });
  for (const skeleton of skeletons) expect(panel.contains(skeleton)).toBe(true);
  expect(screen.queryByText("No active boards yet")).not.toBeInTheDocument();
  await userEvent.setup().click(newBoard);
  expect(screen.getByRole("dialog", { name: "Add a company board" })).toBeInTheDocument();
  await act(async () => release());
  await waitFor(() => expect(container.querySelector('[data-slot="skeleton"]')).toBeNull());
  expect(screen.getByRole("dialog", { name: "Add a company board" })).toBeInTheDocument();
});

it("lets a keyboard user correct a URL and save a company without losing its name", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(json({ boards: [] }))
    .mockResolvedValueOnce(json({ board: ramp }, 201))
    .mockImplementation(async () => json({ boards: [ramp] }));
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await screen.findByText("No active boards yet");

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Board URL")).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("searchbox", { name: "Search boards" })).toHaveFocus();
  for (let i = 0; i < 5; i++) await user.tab();
  expect(screen.getByRole("button", { name: "New" })).toHaveFocus();
  await user.keyboard("{Enter}");
  await screen.findByRole("dialog", { name: "Add a company board" });
  await waitFor(() => expect(screen.getByLabelText("Board URL")).toHaveFocus());
  await user.paste("https://jobs.ashbyhq.com/ramp/posting");
  await user.tab();
  await user.tab();
  await user.keyboard("  Ramp  ");
  await user.tab();
  await user.keyboard("{Enter}");

  const url = screen.getByLabelText("Board URL");
  await waitFor(() => expect(url).toHaveAttribute("aria-invalid", "true"));
  expect(url).toHaveAccessibleDescription(/board/i);
  expect(url).toHaveFocus();
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("  Ramp  ");
  expect(fetch).toHaveBeenCalledTimes(1);

  await user.keyboard("{Control>}a{/Control}");
  await user.paste(ramp.canonicalUrl);
  await user.tab();
  await user.tab();
  await user.tab();
  await user.keyboard("{Enter}");
  await screen.findByRole("heading", { name: "Ramp" });
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    "/api/boards",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ displayName: "Ramp", url: ramp.canonicalUrl }),
    }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const source = screen.getByRole("link", { name: "Open Ramp source (opens in a new tab)" });
  expect(source).toHaveAttribute("href", ramp.canonicalUrl);
  expect(source).toHaveAttribute("target", "_blank");
  expect(source).toHaveAttribute("rel", "noopener noreferrer");
});

it("opens creation from the empty list and restores focus when a draft is dismissed", async () => {
  stubBoardApi(vi.fn<typeof globalThis.fetch>(async () => json({ boards: [] })));
  const user = userEvent.setup();
  renderBoards();
  const add = await screen.findByRole("button", { name: "Add your first board" });
  await user.click(add);
  const url = screen.getByLabelText("Board URL");
  await waitFor(() => expect(url).toHaveFocus());
  await user.paste("https://jobs.ashbyhq.com/draft");
  await user.keyboard("{Escape}");
  await waitFor(() => expect(add).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "New" }));
  expect(screen.getByLabelText("Board URL")).toHaveValue("");
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "New" })).toHaveFocus());
});

it("requires an explicit restore when a submitted source is already archived", async () => {
  const archived = { ...ramp, archivedAt: "2026-10-27T11:00:00.000Z" };
  let stored: Board = archived;
  let discovered = false;
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    if (init?.method === "POST") {
      discovered = true;
      return json(
        {
          error: {
            code: "DUPLICATE_BOARD",
            message: "This source is already archived.",
            existingBoard: { id: ramp.id, archived: true },
          },
        },
        409,
      );
    }
    if (init?.method === "PATCH") {
      stored = ramp;
      return json({ board: stored });
    }
    return json({ boards: discovered ? [stored] : [] });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await screen.findByText("No active boards yet");
  await user.click(screen.getByRole("button", { name: "Add your first board" }));
  await user.type(screen.getByLabelText("Company name (optional)"), "Another label");
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(ramp.canonicalUrl);
  await user.click(screen.getByRole("button", { name: "Save board" }));
  await screen.findByRole("button", { name: "Restore board" });
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  expect(screen.queryByRole("heading", { name: "Ramp" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "View archived board" }));
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(() => expect(document.getElementById(`board-${ramp.id}`)).toHaveFocus());
  expect(screen.queryByRole("button", { name: "Rename Ramp" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Restore Ramp" }));
  await screen.findByText("No archived boards");
  await chooseFilter(user, "Status", "Active");
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename Ramp" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Another label" })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    `/api/boards/${ramp.id}`,
    expect.objectContaining({ method: "PATCH", body: JSON.stringify({ archived: false }) }),
  );
});

it("retains entered values and confirmed boards when a save fails, then allows retry", async () => {
  const moonpay = {
    ...ramp,
    id: "22222222-2222-4222-8222-222222222222",
    displayName: "MoonPay",
    provider: "lever",
    sourceHost: "jobs.lever.co",
    boardKey: "moonpay",
    canonicalUrl: "https://jobs.lever.co/moonpay",
  } satisfies Board;
  let failed = false;
  let stored: Board[] = [ramp];
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    if (init?.method === "POST") {
      if (!failed) {
        failed = true;
        return json(
          { error: { code: "STORAGE_ERROR", message: "Couldn’t save this board. Try again." } },
          500,
        );
      }
      stored = [ramp, moonpay];
      return json({ board: moonpay }, 201);
    }
    return json({ boards: stored });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await screen.findByRole("heading", { name: "Ramp" });
  await user.click(screen.getByRole("button", { name: "New" }));
  await user.type(screen.getByLabelText("Company name (optional)"), "MoonPay");
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(moonpay.canonicalUrl);
  await user.click(screen.getByRole("button", { name: "Save board" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn’t save this board. Try again.",
  );
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("MoonPay");
  expect(screen.getByLabelText("Board URL")).toHaveValue(moonpay.canonicalUrl);
  expect(document.getElementById(`board-${ramp.id}`)).toHaveTextContent("Ramp");
  expect(screen.queryByRole("heading", { name: "MoonPay" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save board" }));
  expect(await screen.findByRole("heading", { name: "MoonPay" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("retains a failed rename and keeps the saved name until a successful retry", async () => {
  let stored: Board = ramp;
  let failed = false;
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    if (init?.method === "PATCH") {
      if (!failed) {
        failed = true;
        return json(
          { error: { code: "STORAGE_ERROR", message: "Couldn’t save this name. Try again." } },
          500,
        );
      }
      stored = { ...ramp, displayName: "Ramp engineering" };
      return json({ board: stored });
    }
    return json({ boards: [stored] });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await user.click(await screen.findByRole("button", { name: "Rename Ramp" }));
  const name = screen.getByLabelText("Company name for Ramp");
  expect(name).toHaveFocus();
  await user.clear(name);
  await user.click(screen.getByRole("button", { name: "Save name" }));
  await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
  expect(name).toHaveFocus();
  await user.type(name, "Ramp engineering");
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t save this name");
  expect(name).toHaveValue("Ramp engineering");
  expect(screen.getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save name" }));
  await screen.findByRole("heading", { name: "Ramp engineering" });
  expect(screen.getByRole("button", { name: "Rename Ramp engineering" })).toHaveFocus();
});

it("returns focus to Status when a confirmed rename no longer matches the search", async () => {
  let stored = { ...ramp, displayName: "Ramp engineering" };
  stubBoardApi(
    vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      if (init?.method === "PATCH") stored = { ...stored, displayName: "Ramp platform" };
      return json(init?.method === "PATCH" ? { board: stored } : { boards: [stored] });
    }),
  );
  renderBoards("?layout=list&q=engineering");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Rename Ramp engineering" }));
  const name = screen.getByRole("textbox", { name: "Company name for Ramp engineering" });
  await user.clear(name);
  await user.type(name, "Ramp platform{Enter}");
  await screen.findByRole("heading", { name: "No boards match these filters" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u })).toHaveFocus(),
  );
});

it.each(["?layout=list", "?layout=list&q=engineering"])(
  "keeps another live control focused when a pending rename completes (%s)",
  async (searchParams) => {
    let stored = { ...ramp, displayName: "Ramp engineering" };
    let release: () => void = () => {
      throw new Error("Rename response is not initialized.");
    };
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubBoardApi(
      vi.fn<typeof globalThis.fetch>(async (_input, init) => {
        if (init?.method === "PATCH") {
          await pending;
          stored = { ...stored, displayName: "Ramp platform" };
          return json({ board: stored });
        }
        return json({ boards: [stored] });
      }),
    );
    renderBoards(searchParams);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Rename Ramp engineering" }));
    const name = screen.getByRole("textbox", { name: "Company name for Ramp engineering" });
    await user.clear(name);
    await user.type(name, "Ramp platform{Enter}");
    const search = screen.getByRole("searchbox", { name: "Search boards" });
    await user.click(search);
    await act(async () => release());
    await screen.findByRole("heading", {
      name: searchParams.includes("q=") ? "No boards match these filters" : "Ramp platform",
    });
    expect(search).toHaveFocus();
  },
);

it("cancels an inline title edit with Escape without writing the proposed name", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ boards: [ramp] }));
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  const company = await screen.findByRole("link", { name: "Ramp" });
  expect(company).toHaveAttribute("href", `/boards/${ramp.id}`);
  expect(company).not.toContainElement(screen.getByRole("button", { name: "Rename Ramp" }));
  expect(company).not.toContainElement(
    screen.getByRole("link", { name: "Open Ramp source (opens in a new tab)" }),
  );
  const rename = await screen.findByRole("button", { name: "Rename Ramp" });
  await user.click(rename);
  const name = screen.getByLabelText("Company name for Ramp");
  expect(name).toHaveFocus();
  await user.keyboard("Another name{Escape}");
  expect(screen.queryByLabelText("Company name for Ramp")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename Ramp" })).toHaveFocus();
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
});

it("preserves the confirmed list on a failed archive and moves the same board only after success", async () => {
  let stored: Board = ramp;
  let failed = false;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    if (input === "/api/jobs/unread-count") return json({ unreadCount: stored.archivedAt ? 0 : 2 });
    if (init?.method === "PATCH") {
      if (!failed) {
        failed = true;
        return json(
          { error: { code: "STORAGE_ERROR", message: "Couldn’t archive this board. Try again." } },
          500,
        );
      }
      stored = { ...ramp, archivedAt: stored.archivedAt ? null : "2026-10-27T12:00:00.000Z" };
      return json({ board: stored });
    }
    return json({ boards: [stored] });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  render(
    <NuqsTestingAdapter hasMemory searchParams="?layout=list">
      <QueryProvider>
        <UnreadCount />
        <BoardsClient />
      </QueryProvider>
    </NuqsTestingAdapter>,
  );
  await user.click(await screen.findByRole("button", { name: "Archive Ramp" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t archive this board");
  expect(screen.getByLabelText("2 unread jobs")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Archive Ramp" }));
  await screen.findByText("No active boards yet");
  expect(await screen.findByLabelText("0 unread jobs")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u })).toHaveFocus();
  await chooseFilter(user, "Status", "Archived");
  const list = await screen.findByRole("list", { name: "Archived boards" });
  expect(within(list).getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(within(list).getByRole("button", { name: "Restore Ramp" })).toBeInTheDocument();
  expect(within(list).queryByRole("button", { name: "Rename Ramp" })).not.toBeInTheDocument();
  await user.click(within(list).getByRole("button", { name: "Restore Ramp" }));
  expect(await screen.findByLabelText("2 unread jobs")).toBeInTheDocument();
});

it("distinguishes an initial load failure from an empty list and lets the user retry", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      json(
        { error: { code: "STORAGE_NOT_READY", message: "Run pnpm db:migrate, then try again." } },
        500,
      ),
    )
    .mockImplementation(async () => json({ boards: [ramp] }));
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  expect(await screen.findByRole("alert")).toHaveTextContent("pnpm db:migrate");
  expect(screen.queryByText("No active boards yet")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
});

it("requests Refresh all once, shows toolbar activity and leaves New board available", async () => {
  let releaseRefresh: () => void = () => {
    throw new Error("Refresh response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
    if (input === "/api/refreshes") {
      await pending;
      return json({ results: [] });
    }
    return json({ boards: [ramp] });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await screen.findByRole("heading", { name: "Ramp" });
  const refresh = screen.getByRole("button", { name: "Refresh" });
  await user.click(refresh);
  expect(refresh).toBeDisabled();
  expect(screen.getByRole("button", { name: "New" })).toBeEnabled();
  expect(refresh).toHaveAttribute("aria-busy", "true");
  expect(refresh.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  expect(refresh.closest("[data-collection-toolbar]")).toContainElement(
    screen.getByRole("button", { name: /^Board layouts:/u }),
  );
  await user.click(refresh);
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  expect(fetch).toHaveBeenCalledWith(
    "/api/refreshes",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ source: "manual" }) }),
  );
  await act(async () => releaseRefresh());
  await waitFor(() => expect(refresh).toBeEnabled());
});

it("blocks repeat submission and waits for a confirmed save before changing the list", async () => {
  let releaseSave: () => void = () => {
    throw new Error("The pending response was not initialized.");
  };
  const pendingSave = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let stored: Board[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    if (init?.method === "POST") {
      await pendingSave;
      stored = [ramp];
      return json({ board: ramp }, 201);
    }
    return json({ boards: stored });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await screen.findByText("No active boards yet");
  await user.click(screen.getByRole("button", { name: "New" }));
  await user.type(screen.getByLabelText("Company name (optional)"), "Ramp");
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(ramp.canonicalUrl);
  await user.click(screen.getByRole("button", { name: "Save board" }));
  const saving = await screen.findByRole("button", { name: "Saving…" });
  expect(saving).toBeDisabled();
  expect(screen.getByLabelText("Company name (optional)")).toBeDisabled();
  expect(screen.getByText("No active boards yet")).toBeInTheDocument();
  await user.click(saving);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "Add a company board" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  releaseSave();
  expect(await screen.findByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
