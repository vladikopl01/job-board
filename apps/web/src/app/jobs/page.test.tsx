// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/components/query-provider";

import { listFixture } from "../../../test/job-fixtures";
import { setupCollectionControls } from "../../../test/collection-controls";
import JobsPage from "./page";
import HomePage from "../page";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens Dashboard at the root destination", () => {
  expect(() => HomePage()).toThrow("redirect:/dashboard");
});

it("preserves legacy unread URLs by redirecting their collection context to Inbox", async () => {
  await expect(
    JobsPage({
      searchParams: Promise.resolve({
        view: "unread",
        page: "2",
        q: "frontend",
        boardId: "example",
        job: "posting",
      }),
    }),
  ).rejects.toThrow("redirect:/inbox?page=2&q=frontend&boardId=example&job=posting");
});

it("shows URL-selected filters immediately and limits skeletons to pending list content", async () => {
  let release: () => void = () => {
    throw new Error("Job response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      if (input === "/api/jobs/unread-count") return Response.json({ unreadCount: 1 });
      await pending;
      return Response.json(listFixture());
    }),
  );
  const page = await JobsPage();
  const { container } = render(
    <NuqsTestingAdapter searchParams="?view=history">
      <QueryProvider>{page}</QueryProvider>
    </NuqsTestingAdapter>,
  );
  expect(screen.getByRole("button", { name: "Job layouts: Table" })).toHaveTextContent("Table");
  setupCollectionControls();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^Filter(?: \d+)?$/u }));
  expect(screen.getByRole("button", { name: "Availability filter value" })).toHaveTextContent(
    "History",
  );
  expect(screen.queryByRole("group", { name: "Availability" })).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("status", { name: "Loading jobs" })).toHaveClass("sr-only");
  const panel = screen.getByRole("region", { name: "Historical jobs" });
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons.length).toBeGreaterThan(0);
  for (const skeleton of skeletons) expect(panel.contains(skeleton)).toBe(true);
  await act(async () => release());
  await screen.findByRole("link", { name: "Software Engineer" });
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});
