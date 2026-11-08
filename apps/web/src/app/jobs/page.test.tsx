// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, expect, it, vi } from "vitest";

import { QueryProvider } from "@/components/query-provider";

import { listFixture } from "../../../test/job-fixtures";
import JobsPage from "./page";

vi.mock("next/server", () => ({ connection: async () => {} }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows URL-selected tabs immediately and limits skeletons to pending list content", async () => {
  let release: () => void = () => {
    throw new Error("Job response is not initialized.");
  };
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => {
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
  expect(screen.getByRole("tab", { name: "Open" })).toBeEnabled();
  const history = screen.getByRole("tab", { name: "History" });
  expect(history).toBeEnabled();
  expect(history).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("status", { name: "Loading jobs" })).toHaveClass("sr-only");
  const panel = screen.getByRole("tabpanel", { name: "History" });
  const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
  expect(skeletons.length).toBeGreaterThan(0);
  for (const skeleton of skeletons) expect(panel.contains(skeleton)).toBe(true);
  await act(async () => release());
  await screen.findByRole("link", { name: "Software Engineer" });
  expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
});
