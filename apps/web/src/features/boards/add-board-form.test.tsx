// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/components/query-provider";
import { AddBoardForm } from "./add-board-form";
import type { Board } from "./schemas";

const notionUrl = "https://jobs.ashbyhq.com/notion";
const moonpayUrl = "https://jobs.lever.co/moonpay";
const notion = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Notion",
  provider: "ashby",
  sourceHost: "jobs.ashbyhq.com",
  boardKey: "notion",
  canonicalUrl: notionUrl,
  createdAt: "2026-10-27T10:00:00.000Z",
  updatedAt: "2026-10-27T10:00:00.000Z",
  archivedAt: null,
} satisfies Board;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferredResponse() {
  let complete: (response: Response) => void = () => {
    throw new Error("Response resolver was not initialized.");
  };
  const promise = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  return { promise, complete };
}

function renderForm() {
  const onSaved = vi.fn<Parameters<typeof AddBoardForm>[0]["onSaved"]>();
  render(
    <QueryProvider>
      <AddBoardForm
        onSaved={onSaved}
        onLocate={vi.fn<Parameters<typeof AddBoardForm>[0]["onLocate"]>()}
      />
    </QueryProvider>,
  );
  return { onSaved, user: userEvent.setup() };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("suggests names only through the placeholder and saves a custom override", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(json({ displayName: "MoonPay", source: "metadata" }));
  vi.stubGlobal("fetch", fetch);
  const { user, onSaved } = renderForm();
  await user.tab();
  await user.tab();
  expect(screen.getByLabelText("Board URL")).toHaveFocus();
  await user.paste(moonpayUrl);
  const name = screen.getByLabelText("Company name (optional)");
  expect(name).toHaveValue("");
  expect(name).toHaveAttribute("placeholder", "Moonpay");
  await waitFor(() => expect(name).toHaveAttribute("placeholder", "MoonPay"));
  expect(name).toHaveValue("");
  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledWith(
    "/api/boards/name-suggestion",
    expect.objectContaining({
      body: JSON.stringify({ url: moonpayUrl }),
      signal: expect.any(AbortSignal),
    }),
  );

  await user.tab();
  await user.tab();
  expect(screen.getByLabelText("Company name (optional)")).toHaveFocus();
  await user.keyboard("MoonPay careers");
  const board = {
    ...notion,
    provider: "lever",
    sourceHost: "jobs.lever.co",
    boardKey: "moonpay",
    canonicalUrl: moonpayUrl,
    displayName: "MoonPay careers",
  } satisfies Board;
  fetch.mockResolvedValueOnce(json({ board }, 201));
  await user.tab();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(board, "saved"));
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/boards",
    expect.objectContaining({
      body: JSON.stringify({ displayName: "MoonPay careers", url: moonpayUrl }),
    }),
  );
});

it.each(["offline", "malformed response"])(
  "keeps the slug and saves locally after %s",
  async (failure) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(() =>
        failure === "offline"
          ? Promise.reject(new TypeError("Offline"))
          : Promise.resolve(json({ invalid: true })),
      )
      .mockResolvedValueOnce(json({ board: notion }, 201));
    vi.stubGlobal("fetch", fetch);
    const { user, onSaved } = renderForm();
    await user.click(screen.getByLabelText("Board URL"));
    await user.paste(notionUrl);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(screen.queryByText(/Looking up the company name/)).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Company name (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Company name (optional)")).toHaveAttribute(
      "placeholder",
      "Notion",
    );
    await user.click(screen.getByRole("button", { name: "Save board" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(notion, "saved"));
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/boards",
      expect.objectContaining({
        body: JSON.stringify({ displayName: "Notion", url: notionUrl }),
      }),
    );
  },
);

it.each(["untouched", "cleared", "whitespace"])(
  "saves the metadata suggestion when the name is %s",
  async (override) => {
    const board = { ...notion, displayName: "Notion Labs" };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(json({ displayName: board.displayName, source: "metadata" }))
      .mockResolvedValueOnce(json({ board }, 201));
    vi.stubGlobal("fetch", fetch);
    const { user, onSaved } = renderForm();
    await user.click(screen.getByLabelText("Board URL"));
    await user.paste(notionUrl);
    const name = screen.getByLabelText("Company name (optional)");
    await waitFor(() => expect(name).toHaveAttribute("placeholder", board.displayName));
    expect(name).toHaveValue("");
    if (override === "cleared") {
      await user.type(name, "My label");
      await user.clear(name);
    } else if (override === "whitespace") {
      await user.type(name, "   ");
    }
    await user.click(screen.getByRole("button", { name: "Save board" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(board, "saved"));
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/boards",
      expect.objectContaining({
        body: JSON.stringify({ displayName: board.displayName, url: notionUrl }),
      }),
    );
  },
);

it("keeps manual edits when pending metadata arrives and when the URL changes", async () => {
  const response = deferredResponse();
  const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(response.promise);
  vi.stubGlobal("fetch", fetch);
  const { user } = renderForm();
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(notionUrl);
  await screen.findByText(/Looking up the company name/);
  await user.clear(screen.getByLabelText("Company name (optional)"));
  await user.type(screen.getByLabelText("Company name (optional)"), "My label");
  await act(async () =>
    response.complete(json({ displayName: "Notion Labs", source: "metadata" })),
  );
  await waitFor(() =>
    expect(screen.queryByText(/Looking up the company name/)).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("My label");
  expect(screen.getByLabelText("Company name (optional)")).toHaveAttribute(
    "placeholder",
    "Notion Labs",
  );
  await user.clear(screen.getByLabelText("Board URL"));
  await user.paste(moonpayUrl);
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("My label");
  expect(screen.getByLabelText("Company name (optional)")).toHaveAttribute(
    "placeholder",
    "Moonpay",
  );
  await user.clear(screen.getByLabelText("Company name (optional)"));
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("");
  expect(screen.getByLabelText("Company name (optional)")).toHaveAttribute(
    "placeholder",
    "Moonpay",
  );
});

it("cancels the old URL lookup and ignores its response after selecting another board", async () => {
  const old = deferredResponse();
  const current = deferredResponse();
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(current.promise);
  vi.stubGlobal("fetch", fetch);
  const { user } = renderForm();
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(notionUrl);
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  const oldSignal = fetch.mock.calls[0]?.[1]?.signal;
  await user.clear(screen.getByLabelText("Board URL"));
  await user.paste(moonpayUrl);
  expect(oldSignal?.aborted).toBe(true);
  const name = screen.getByLabelText("Company name (optional)");
  expect(name).toHaveValue("");
  expect(name).toHaveAttribute("placeholder", "Moonpay");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await act(async () =>
    old.complete(json({ displayName: "Outdated company", source: "metadata" })),
  );
  expect(name).toHaveValue("");
  expect(name).toHaveAttribute("placeholder", "Moonpay");
  await act(async () => current.complete(json({ displayName: "MoonPay", source: "metadata" })));
  await waitFor(() => expect(name).toHaveAttribute("placeholder", "MoonPay"));
  expect(name).toHaveValue("");
});

it("saves without waiting for metadata and does not refill the reset form afterward", async () => {
  const response = deferredResponse();
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockReturnValueOnce(response.promise)
    .mockResolvedValueOnce(json({ board: notion }, 201));
  vi.stubGlobal("fetch", fetch);
  const { user, onSaved } = renderForm();
  await user.click(screen.getByLabelText("Board URL"));
  await user.paste(notionUrl);
  await screen.findByText(/Looking up the company name/);
  await user.click(screen.getByRole("button", { name: "Save board" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(notion, "saved"));
  expect(screen.getByLabelText("Board URL")).toHaveValue("");
  await act(async () =>
    response.complete(json({ displayName: "Late metadata", source: "metadata" })),
  );
  expect(screen.getByLabelText("Company name (optional)")).toHaveValue("");
  expect(screen.getByLabelText("Company name (optional)")).toHaveAttribute("placeholder", "");
  expect(screen.getByLabelText("Board URL")).toHaveValue("");
});
