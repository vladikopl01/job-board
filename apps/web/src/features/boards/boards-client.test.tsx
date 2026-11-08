// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/components/query-provider";

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
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    input === "/api/boards/name-suggestion"
      ? Promise.reject(new TypeError("Company metadata is unavailable in this scenario."))
      : fetch(input, init),
  );
}

function renderBoards() {
  return render(
    <QueryProvider>
      <BoardsClient />
    </QueryProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
  expect(screen.getByRole("tab", { name: "Active" })).toBeEnabled();
  expect(screen.getByRole("tab", { name: "Archived" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Refresh all" })).toBeVisible();
  const newBoard = screen.getByRole("button", { name: "New board" });
  expect(newBoard).toBeEnabled();
  expect(screen.getByRole("status", { name: "Loading boards" })).toHaveClass("sr-only");
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons.length).toBeGreaterThan(0);
  const panel = screen.getByRole("tabpanel", { name: "Active" });
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
  expect(screen.getByRole("tab", { name: "Active" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "New board" })).toHaveFocus();
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
  const source = screen.getByRole("link", { name: /jobs.ashbyhq.com\/ramp.*opens in a new tab/i });
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
  await user.click(screen.getByRole("button", { name: "New board" }));
  expect(screen.getByLabelText("Board URL")).toHaveValue("");
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "New board" })).toHaveFocus());
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
  await user.click(screen.getByRole("tab", { name: "Active" }));
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
  await user.click(screen.getByRole("button", { name: "New board" }));
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

it("cancels an inline title edit with Escape without writing the proposed name", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ boards: [ramp] }));
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  const company = await screen.findByRole("link", { name: "Ramp" });
  expect(company).toHaveAttribute("href", `/boards/${ramp.id}`);
  expect(company).not.toContainElement(screen.getByRole("button", { name: "Rename Ramp" }));
  expect(company).not.toContainElement(
    screen.getByRole("link", { name: /jobs.ashbyhq.com\/ramp.*opens in a new tab/i }),
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
  const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
    if (init?.method === "PATCH") {
      if (!failed) {
        failed = true;
        return json(
          { error: { code: "STORAGE_ERROR", message: "Couldn’t archive this board. Try again." } },
          500,
        );
      }
      stored = { ...ramp, archivedAt: "2026-10-27T12:00:00.000Z" };
      return json({ board: stored });
    }
    return json({ boards: [stored] });
  });
  stubBoardApi(fetch);
  const user = userEvent.setup();
  renderBoards();
  await user.click(await screen.findByRole("button", { name: "Archive Ramp" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t archive this board");
  expect(screen.getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Archive Ramp" }));
  await screen.findByText("No active boards yet");
  expect(screen.getByRole("tab", { name: "Active" })).toHaveFocus();
  await user.keyboard("{ArrowRight}{Enter}");
  const list = await screen.findByRole("list", { name: "Archived boards" });
  expect(within(list).getByRole("heading", { name: "Ramp" })).toBeInTheDocument();
  expect(within(list).getByRole("button", { name: "Restore Ramp" })).toBeInTheDocument();
  expect(within(list).queryByRole("button", { name: "Rename Ramp" })).not.toBeInTheDocument();
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
  const refresh = screen.getByRole("button", { name: "Refresh all" });
  await user.click(refresh);
  expect(refresh).toBeDisabled();
  expect(screen.getByRole("button", { name: "New board" })).toBeEnabled();
  const activity = screen.getByText("Refreshing boards…");
  expect(screen.getByRole("tablist", { name: "Board views" }).parentElement).toContainElement(
    activity,
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
  await user.click(screen.getByRole("button", { name: "New board" }));
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
