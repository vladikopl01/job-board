// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { SearchInput } from "./search-input";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("debounces settled text, cancels old input on URL changes, and waits for IME composition", async () => {
  vi.useFakeTimers();
  const change = vi.fn<(value: string) => void>();
  const tree = (value: string) => (
    <SearchInput value={value} onChange={change} label="Search jobs" placeholder="Search jobs…" />
  );
  const view = render(tree(""));
  const input = screen.getByRole("searchbox", { name: "Search jobs" });
  fireEvent.change(input, { target: { value: "eng" } });
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "engineer" } });
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(change).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(change).toHaveBeenCalledExactlyOnceWith("engineer");
  change.mockClear();
  fireEvent.change(input, { target: { value: "obsolete" } });
  view.rerender(tree("restored query"));
  expect(input).toHaveValue("restored query");
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(change).not.toHaveBeenCalled();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "開発" } });
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(change).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(change).toHaveBeenCalledExactlyOnceWith("開発");
  expect(screen.queryByRole("button", { name: "Search jobs" })).not.toBeInTheDocument();
});

it("cancels a pending draft when an explicit reset keeps the same URL value", async () => {
  vi.useFakeTimers();
  const change = vi.fn<(value: string) => void>();
  const tree = (resetKey: number) => (
    <SearchInput
      value=""
      resetKey={resetKey}
      onChange={change}
      label="Search jobs"
      placeholder="Search jobs…"
    />
  );
  const view = render(tree(0));
  const input = screen.getByRole("searchbox", { name: "Search jobs" });
  input.focus();
  fireEvent.change(input, { target: { value: "pending search" } });
  await act(() => vi.advanceTimersByTimeAsync(200));
  view.rerender(tree(1));
  expect(screen.getByRole("searchbox", { name: "Search jobs" })).toBe(input);
  expect(input).toHaveFocus();
  expect(input).toHaveValue("");
  await act(() => vi.advanceTimersByTimeAsync(500));
  expect(change).not.toHaveBeenCalled();
});
