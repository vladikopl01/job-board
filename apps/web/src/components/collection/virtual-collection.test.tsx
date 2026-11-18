// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, expect, it, vi } from "vitest";

import { DataTable } from "@/components/data-table/data-table";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { useCollectionTable } from "./use-collection-table";
import { VirtualCollection } from "./virtual-collection";

const rows = Array.from({ length: 200 }, (_, index) => ({
  id: String(index),
  title: `Row ${index}`,
}));
const columns: ColumnDef<DataTableFeatures, (typeof rows)[number]>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <button>{row.original.title}</button>,
  },
];

function Collection({
  layout,
  activeId,
}: {
  layout: "table" | "list" | "cards";
  activeId?: string;
}) {
  const table = useCollectionTable({
    data: rows,
    columns,
    storageKey: "virtual-test",
    query: { filters: [], sort: [], join: "and" },
    onQueryChange: () => {},
  });
  return (
    <div data-workspace-scroll>
      {layout === "table" ? (
        <DataTable table={table} pagination={null} activeRowId={activeId} aria-label="Rows" />
      ) : (
        <VirtualCollection
          items={rows}
          cards={layout === "cards"}
          estimateSize={44}
          label="Rows"
          activeId={activeId}
        >
          {(row) => (
            <article>
              <button>{row.title}</button>
            </article>
          )}
        </VirtualCollection>
      )}
    </div>
  );
}

function geometry() {
  let width = 800;
  const observers = new Set<Observer>();
  class Observer implements ResizeObserver {
    readonly callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.add(this);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      observers.delete(this);
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.hasAttribute("data-workspace-scroll") ? 220 : 44;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.hasAttribute("data-workspace-scroll") ? 220 : 44;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const scroll = this.closest<HTMLElement>("[data-workspace-scroll]");
    const top = this === scroll ? 0 : -(scroll?.scrollTop ?? 0);
    return {
      x: 0,
      y: top,
      top,
      bottom: top + 44,
      left: 0,
      right: width,
      width,
      height: 44,
      toJSON: () => ({}),
    };
  });
  HTMLElement.prototype.scrollTo = vi.fn<() => void>();
  return {
    resize(next: number) {
      width = next;
      act(() => {
        for (const observer of [...observers]) observer.callback([], observer);
      });
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  { layout: "table", attribute: "aria-rowindex", position: "201" },
  { layout: "list", attribute: "aria-posinset", position: "200" },
  { layout: "cards", attribute: "aria-posinset", position: "200" },
] as const)(
  "virtualizes $layout rows in the workspace scroller and retains the focused and active items",
  async ({ layout, attribute, position }) => {
    geometry();
    const view = render(<Collection layout={layout} activeId="199" />);
    const mounted = () => screen.getAllByRole("button", { name: /^Row \d+$/u });
    await waitFor(() => expect(mounted().length).toBeLessThan(35));
    expect(screen.getByRole("button", { name: "Row 199" })).toBeInTheDocument();
    const first = screen.getByRole("button", { name: "Row 0" });
    act(() => first.focus());
    const scroll = first.closest<HTMLElement>("[data-workspace-scroll]");
    if (!scroll) throw new Error("Missing scroller.");
    act(() => {
      scroll.scrollTop = 2800;
      fireEvent.scroll(scroll);
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Row 10" })).not.toBeInTheDocument(),
    );
    expect(
      mounted().some((button) => /Row (?:[4-9]\d|1\d\d)$/u.test(button.textContent ?? "")),
    ).toBe(true);
    expect(first).toHaveFocus();
    expect(screen.getByRole("button", { name: "Row 199" })).toBeInTheDocument();
    expect(mounted().length).toBeLessThan(40);
    expect(
      screen.getByRole("button", { name: "Row 199" }).closest(`[${attribute}]`),
    ).toHaveAttribute(attribute, position);
    view.rerender(<Collection layout={layout} />);
    const readerTarget = screen.getByRole("button", { name: "Row 199" });
    act(() => readerTarget.focus());
    expect(readerTarget).toHaveFocus();
  },
);

it("keeps responsive cards in ordered rows when the collection width changes", async () => {
  const viewport = geometry();
  render(<Collection layout="cards" />);
  const row = screen.getByRole("button", { name: "Row 0" }).closest("[data-index]");
  expect(row?.querySelectorAll("[data-virtual-key]")).toHaveLength(2);
  viewport.resize(1100);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Row 0" })
        .closest("[data-index]")
        ?.querySelectorAll("[data-virtual-key]"),
    ).toHaveLength(3),
  );
  viewport.resize(600);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Row 0" })
        .closest("[data-index]")
        ?.querySelectorAll("[data-virtual-key]"),
    ).toHaveLength(1),
  );
});
