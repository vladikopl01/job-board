// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { setupCollectionControls } from "../../../test/collection-controls";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleCollectionRowClick } from "./row-navigation";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { z } from "zod";
import { collectionFiltersSchema, collectionSortsSchema, joinOperatorSchema } from "./query-schema";
import { CollectionToolbar } from "./collection-toolbar";
import { useCollectionTable, type CollectionQuery } from "./use-collection-table";

const rows = [{ id: "one", title: "Engineer", provider: "ashby" }];
const columns: ColumnDef<DataTableFeatures, (typeof rows)[number]>[] = [
  {
    id: "title",
    accessorKey: "title",
    enableHiding: false,
    enableColumnFilter: true,
    meta: { label: "Title", variant: "text" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Title" />,
  },
  {
    id: "provider",
    accessorKey: "provider",
    enableColumnFilter: true,
    meta: {
      label: "Provider",
      variant: "select",
      options: [
        { value: "ashby", label: "Ashby" },
        { value: "lever", label: "Lever" },
      ],
    },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Provider" />,
  },
];
function Collection({
  columnDefinitions = columns,
  onSelect,
}: {
  columnDefinitions?: typeof columns;
  onSelect?: (() => void) | undefined;
}) {
  const [query, setQuery] = useState<CollectionQuery>({ filters: [], sort: [], join: "and" });
  const table = useCollectionTable({
    data: rows,
    columns: columnDefinitions,
    query,
    onQueryChange: setQuery,
    storageKey: "test",
  });
  return (
    <>
      <CollectionToolbar table={table} actions={<DataTableViewOptions table={table} />} />
      <output aria-label="Collection query">{JSON.stringify(query)}</output>
      <DataTable
        table={table}
        pagination={null}
        aria-label="Results"
        getRowProps={() => ({ onClick: (event) => handleCollectionRowClick(event, onSelect) })}
      />
    </>
  );
}
function query() {
  return z
    .object({
      filters: collectionFiltersSchema,
      sort: collectionSortsSchema,
      join: joinOperatorSchema,
    })
    .parse(JSON.parse(screen.getByLabelText("Collection query").textContent ?? "{}"));
}

async function columnOptions(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.pointer({
    keys: "[MouseRight]",
    target: within(screen.getByRole("table")).getByRole("button", { name: label }),
  });
  return screen.findByRole("menu", { name: `${label} column options` });
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

it("opens row whitespace while preserving nested links, controls and portaled menu actions", async () => {
  setupCollectionControls();
  const opened = vi.fn<() => void>();
  const source = vi.fn<() => void>();
  const read = vi.fn<() => void>();
  const archive = vi.fn<() => void>();
  const select = vi.fn<() => void>();
  const definitions = columns.map((column) => ({
    ...column,
    cell:
      column.id === "title"
        ? () => (
            <Link
              href="/boards/one"
              data-row-link
              onClick={(event) => {
                event.preventDefault();
                opened();
              }}
            >
              Engineer
            </Link>
          )
        : () => (
            <>
              <a
                href="https://example.com"
                onClick={(event) => {
                  event.preventDefault();
                  source();
                }}
              >
                Source
              </a>
              <Button onClick={read}>Mark read</Button>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button />}>Actions</DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={archive}>Archive</DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ),
  }));
  const view = render(<Collection columnDefinitions={definitions} />);
  const user = userEvent.setup();
  const row = screen.getByRole("link", { name: "Engineer" }).closest("tr");
  if (!row) throw new Error("Missing result row.");
  const cell = within(row).getAllByRole("cell")[0];
  if (!cell) throw new Error("Missing result cell.");
  await user.click(cell);
  expect(opened).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("link", { name: "Source" }));
  await user.click(screen.getByRole("button", { name: "Mark read" }));
  await user.click(screen.getByRole("button", { name: "Actions" }));
  await user.click(await screen.findByRole("menuitem", { name: "Archive" }));
  expect(source).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(1);
  expect(archive).toHaveBeenCalledTimes(1);
  expect(opened).toHaveBeenCalledTimes(1);
  view.rerender(<Collection columnDefinitions={definitions} onSelect={select} />);
  await user.click(cell);
  expect(select).toHaveBeenCalledTimes(1);
  expect(opened).toHaveBeenCalledTimes(1);
  await user.keyboard("{Control>}");
  await user.click(cell);
  await user.keyboard("{/Control}");
  expect(select).toHaveBeenCalledTimes(1);
});

it("sorts on a header click, adds Shift-click sorts and reserves its menu for right-click or Shift+F10", async () => {
  setupCollectionControls();
  render(<Collection />);
  const user = userEvent.setup();
  const title = within(screen.getByRole("table")).getByRole("button", { name: "Title" });
  await user.click(title);
  expect(query().sort).toEqual([{ id: "title", desc: false }]);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(title.closest("th")).toHaveAttribute("aria-sort", "ascending");
  await user.click(title);
  expect(query().sort).toEqual([{ id: "title", desc: true }]);
  await user.keyboard("{Shift>}");
  await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Provider" }));
  await user.keyboard("{/Shift}");
  expect(query().sort).toEqual([
    { id: "title", desc: true },
    { id: "provider", desc: false },
  ]);
  await columnOptions(user, "Provider");
  await user.click(screen.getByRole("menuitem", { name: "Remove sort" }));
  expect(query().sort).toEqual([{ id: "title", desc: true }]);
  title.focus();
  await user.keyboard("{Shift>}{F10}{/Shift}");
  await user.click(await screen.findByRole("menuitem", { name: "Sort ascending" }));
  expect(query().sort).toEqual([{ id: "title", desc: false }]);
});

it("inserts beside pinned columns, fits the available width and resets column customization", async () => {
  setupCollectionControls();
  render(
    <Collection
      columnDefinitions={[
        ...columns,
        {
          id: "createdAt",
          accessorKey: "title",
          meta: { label: "Added" },
          header: ({ column }) => <DataTableColumnHeader column={column} label="Added" />,
        },
      ]}
    />,
  );
  const user = userEvent.setup();
  await columnOptions(user, "Provider");
  await user.click(screen.getByRole("menuitem", { name: "Pin column" }));
  const header = within(screen.getByRole("table"))
    .getByRole("button", { name: "Provider" })
    .closest("th");
  expect(header).toHaveAttribute("data-pinned", "start");
  expect(header?.querySelector("[data-column-pin]")).toBeInTheDocument();
  expect(header).toHaveClass("after:end-0");
  await columnOptions(user, "Provider");
  screen.getByRole("menuitem", { name: "Insert after" }).focus();
  await user.keyboard("{ArrowRight}");
  await waitFor(() => expect(screen.getByRole("menuitem", { name: "Added" })).toHaveFocus());
  await user.keyboard("{Enter}");
  const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
  expect(headers.map((item) => item.textContent)).toEqual(["Provider", "Added", "Title"]);
  expect(headers[1]).toHaveAttribute("data-pinned", "start");
  expect(headers[1]).toHaveClass("after:end-0");
  expect(headers[0]).not.toHaveClass("after:end-0");
  const viewport = screen.getByRole("table").closest("[data-slot=table-container]");
  if (!viewport) throw new Error("Missing table scroller.");
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 600 });
  await columnOptions(user, "Provider");
  await user.click(screen.getByRole("menuitem", { name: "Fit table to window" }));
  for (const label of ["Provider", "Added", "Title"])
    expect(
      screen.getByRole("button", { name: `Resize ${label} column, 200 pixels` }),
    ).toBeInTheDocument();
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 120 });
  await columnOptions(user, "Provider");
  await user.click(screen.getByRole("menuitem", { name: "Fit table to window" }));
  expect(
    screen.getByRole("button", { name: "Resize Title column, 80 pixels" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Customize columns" }));
  await user.click(screen.getByRole("button", { name: "Unpin all columns" }));
  expect(screen.getByRole("button", { name: "Unpin all columns" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Reset columns" }));
  await user.keyboard("{Escape}");
  expect(
    within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .map((item) => item.textContent),
  ).toEqual(["Title", "Provider"]);
  expect(
    screen.getByRole("button", { name: "Resize Title column, 80 pixels" }),
  ).toBeInTheDocument();
});

it("searches column checkboxes and changes visibility with the keyboard", async () => {
  setupCollectionControls();
  render(<Collection />);
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: "Customize columns" });
  await user.click(trigger);
  expect(screen.getByRole("checkbox", { name: "Title" })).toHaveAttribute("aria-disabled", "true");
  await user.type(screen.getByRole("textbox", { name: "Search columns" }), "Provider");
  expect(screen.queryByRole("checkbox", { name: "Title" })).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByRole("checkbox", { name: "Provider" })).toHaveFocus();
  await user.keyboard(" ");
  expect(screen.getByRole("checkbox", { name: "Provider" })).not.toBeChecked();
  expect(screen.queryByRole("columnheader", { name: /^Provider/u })).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("chooses fields before adding rules, supports condition state, and clears filters and sorts together", async () => {
  setupCollectionControls();
  render(<Collection />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Filter" }));
  await user.click(screen.getByRole("button", { name: "Add filter" }));
  expect(query().filters).toEqual([]);
  await user.type(screen.getByRole("combobox", { name: "Search filter fields" }), "Title");
  expect(screen.queryByRole("option", { name: "Provider" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("option", { name: "Title" }));
  await user.type(screen.getByRole("textbox", { name: "Title filter value" }), "platform");
  await user.click(screen.getByRole("button", { name: "Disable Title filter" }));
  expect(query().filters[0]).toMatchObject({ value: "platform", disabled: true });
  await user.click(screen.getByRole("button", { name: "Enable Title filter" }));
  await user.click(screen.getByRole("button", { name: "Add filter" }));
  await user.click(await screen.findByRole("option", { name: "Provider" }));
  await user.click(screen.getByRole("button", { name: "Provider filter value" }));
  await user.click(await screen.findByRole("option", { name: "Lever" }));
  await user.click(screen.getByRole("combobox", { name: "Select join operator" }));
  await user.click(await screen.findByRole("option", { name: "or" }));
  expect(query()).toMatchObject({
    join: "or",
    filters: [
      { id: "title", value: "platform", disabled: false },
      { id: "provider", value: "lever" },
    ],
  });
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Sort" }));
  await user.click(screen.getByRole("button", { name: "Add sort" }));
  expect(query().sort).toEqual([]);
  await user.type(screen.getByRole("combobox", { name: "Search sort fields" }), "Title");
  await user.click(screen.getByRole("option", { name: "Title" }));
  await user.click(screen.getByRole("button", { name: "Add sort" }));
  expect(screen.queryByRole("option", { name: "Title" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("option", { name: "Provider" }));
  await user.click(screen.getByRole("combobox", { name: "Provider sort direction" }));
  await user.click(await screen.findByRole("option", { name: "Desc" }));
  // JSDOM has no layout; the actual keyboard sensor needs distinct row rectangles.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const row = this.closest("li");
    const index = row?.parentElement ? Array.from(row.parentElement.children).indexOf(row) : 0;
    return new DOMRect(
      0,
      row ? index * 48 : parseFloat(this.style.top) || 0,
      500,
      this.tagName === "UL" ? 400 : 40,
    );
  });
  screen.getByRole("button", { name: "Reorder Provider sort" }).focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowUp}");
  await screen.findByText(/Sortable item "provider".*position 1 of 2/u);
  await user.keyboard(" ");
  await waitFor(() => expect(query().sort[0]?.id).toBe("provider"));
  expect(query().sort).toEqual([
    { id: "provider", desc: true },
    { id: "title", desc: false },
  ]);
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(query()).toEqual({ filters: [], sort: [], join: "and" });
});

it("keeps column visibility, width, order and pinning after remounting", async () => {
  setupCollectionControls();
  const view = render(<Collection />);
  const user = userEvent.setup();
  screen.getByRole("button", { name: "Resize Provider column, 150 pixels" }).focus();
  await user.keyboard("{ArrowRight}");
  await user.pointer({
    keys: "[MouseRight]",
    target: within(screen.getByRole("table")).getByRole("button", { name: "Provider" }),
  });
  await user.click(await screen.findByRole("menuitem", { name: "Move left" }));
  within(screen.getByRole("table")).getByRole("button", { name: "Provider" }).focus();
  await user.keyboard("{Shift>}{F10}{/Shift}");
  await user.click(await screen.findByRole("menuitem", { name: "Pin column" }));
  await user.click(screen.getByRole("button", { name: "Customize columns" }));
  await user.click(await screen.findByRole("checkbox", { name: "Provider" }));
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("columnheader", { name: /^Provider/u })).not.toBeInTheDocument(),
  );
  const saved = JSON.parse(localStorage.getItem("job-board:columns:test") ?? "{}");
  expect(saved).toMatchObject({
    columnVisibility: { provider: false },
    columnSizing: { provider: 166 },
    columnOrder: ["provider", "title"],
    columnPinning: { start: ["provider"] },
  });
  view.unmount();
  render(<Collection />);
  expect(screen.queryByRole("columnheader", { name: /^Provider/u })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Customize columns" }));
  await user.click(await screen.findByRole("checkbox", { name: "Provider" }));
  await user.keyboard("{Escape}");
  const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
  expect(headers[0]).toHaveTextContent("Provider");
});

it("keeps new optional discovery columns hidden when restoring an older saved layout", async () => {
  setupCollectionControls();
  localStorage.setItem(
    "job-board:columns:test",
    JSON.stringify({
      columnVisibility: { provider: false },
      columnOrder: ["title", "provider"],
      columnPinning: { start: [], end: [] },
      columnSizing: {},
    }),
  );
  render(
    <Collection
      columnDefinitions={[
        ...columns,
        { id: "country", accessorKey: "title", meta: { label: "Country" }, header: "Country" },
      ]}
    />,
  );
  expect(screen.queryByRole("columnheader", { name: /^Provider/u })).not.toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "Country" })).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Customize columns" }));
  const country = screen.getByRole("checkbox", { name: "Country" });
  expect(country).not.toBeChecked();
  await user.click(country);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("columnheader", { name: "Country" })).toBeInTheDocument();
});

it("fits restored columns to viewport changes and visibility while retaining fixed controls and minimum widths", async () => {
  setupCollectionControls();
  let width = 800;
  const observers = new Set<Observer>();
  class Observer implements ResizeObserver {
    readonly elements = new Set<Element>();
    readonly callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      observers.add(this);
    }
    observe(element: Element) {
      this.elements.add(element);
    }
    unobserve(element: Element) {
      this.elements.delete(element);
    }
    disconnect() {
      observers.delete(this);
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.slot === "table-container" ? width : 0;
  });
  const resize = (next: number) => {
    width = next;
    act(() => {
      for (const observer of [...observers]) {
        if (
          [...observer.elements].some(
            (element) => element.getAttribute("data-slot") === "table-container",
          )
        )
          observer.callback([], observer);
      }
    });
  };
  const definitions: typeof columns = [
    { id: "select", header: "Select", size: 32, minSize: 32, maxSize: 32, enableResizing: false },
    ...columns,
    { id: "actions", header: "Actions", size: 80, minSize: 80, maxSize: 80, enableResizing: false },
  ];
  localStorage.setItem(
    "job-board:columns:test",
    JSON.stringify({
      columnVisibility: {},
      columnOrder: [],
      columnPinning: { start: ["provider"], end: [] },
      columnSizing: { title: 400, provider: 200 },
    }),
  );
  const view = render(<Collection columnDefinitions={definitions} />);
  const table = screen.getByRole("table");
  expect(table.style.width).toBe("800px");
  expect(
    screen.getByRole("button", { name: "Resize Title column, 459 pixels" }),
  ).toBeInTheDocument();
  expect(table.style.getPropertyValue("--column-select-size")).toBe("32px");
  expect(table.style.getPropertyValue("--column-actions-size")).toBe("80px");
  const title = screen.getByRole("button", { name: "Title" });
  const provider = screen.getByRole("button", { name: "Provider" });
  expect(provider.closest("th")).toHaveAttribute("data-pinned", "start");
  const user = userEvent.setup();
  screen.getByRole("button", { name: "Resize Title column, 459 pixels" }).focus();
  await user.keyboard("{ArrowRight}");
  expect(table.style.width).toBe("816px");
  resize(800);
  expect(table.style.width).toBe("816px");
  resize(1000);
  expect(table.style.width).toBe("1000px");
  expect(title).toBeInTheDocument();
  expect(provider).toBeInTheDocument();
  resize(180);
  expect(table.style.width).toBe("272px");
  resize(800);
  await user.click(screen.getByRole("button", { name: "Customize columns" }));
  await user.click(screen.getByRole("checkbox", { name: "Provider" }));
  await user.keyboard("{Escape}");
  expect(table.style.width).toBe("800px");
  expect(
    screen.getByRole("button", { name: "Resize Title column, 688 pixels" }),
  ).toBeInTheDocument();
  view.unmount();
  render(<Collection columnDefinitions={definitions} />);
  expect(screen.getByRole("table").style.width).toBe("800px");
  expect(screen.queryByRole("columnheader", { name: /^Provider/u })).not.toBeInTheDocument();
});

it("restores valid layouts with more than five pinned columns", async () => {
  setupCollectionControls();
  const additionalColumns = Array.from({ length: 6 }, (_, index) => {
    const label = `Property ${index + 1}`;
    return {
      id: label,
      accessorFn: (row) => row.title,
      meta: { label },
      header: ({ column }) => <DataTableColumnHeader column={column} label={label} />,
    } satisfies (typeof columns)[number];
  });
  const columnDefinitions = [...columns, ...additionalColumns];
  const view = render(<Collection columnDefinitions={columnDefinitions} />);
  const user = userEvent.setup();
  for (const column of additionalColumns) {
    await user.pointer({
      keys: "[MouseRight]",
      target: within(screen.getByRole("table")).getByRole("button", { name: column.id }),
    });
    await user.click(await screen.findByRole("menuitem", { name: "Pin column" }));
  }
  screen.getByRole("button", { name: "Resize Provider column, 150 pixels" }).focus();
  await user.keyboard("{ArrowRight}");
  view.unmount();
  render(<Collection columnDefinitions={columnDefinitions} />);
  const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
  expect(headers.slice(0, 6).map((header) => header.textContent)).toEqual(
    additionalColumns.map((column) => column.id),
  );
  expect(
    screen.getByRole("button", { name: "Resize Provider column, 166 pixels" }),
  ).toBeInTheDocument();
});
