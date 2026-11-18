import type { Column, RowData, Table } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/lib/data-table-features";

export function getColumnGroup<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
) {
  const pinned = column.getIsPinned();
  return pinned === "start"
    ? column.table.getStartVisibleLeafColumns()
    : pinned === "end"
      ? column.table.getEndVisibleLeafColumns()
      : column.table.getCenterVisibleLeafColumns();
}

export function moveColumn<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
  offset: -1 | 1,
) {
  const group = getColumnGroup(column);
  const neighbor = group[group.findIndex((item) => item.id === column.id) + offset];
  if (!neighbor) return;
  const swap = (ids: string[]) =>
    ids.map((id) => (id === column.id ? neighbor.id : id === neighbor.id ? column.id : id));
  column.table.setColumnOrder(swap(column.table.getAllLeafColumns().map((item) => item.id)));
  const pinned = column.getIsPinned();
  if (pinned)
    column.table.setColumnPinning((previous) => ({
      ...previous,
      [pinned]: swap(previous[pinned] ?? []),
    }));
}

export function insertColumn<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
  id: string,
  side: "before" | "after",
) {
  const insert = (ids: string[]) => {
    const order = ids.filter((item) => item !== id);
    order.splice(order.indexOf(column.id) + (side === "after" ? 1 : 0), 0, id);
    return order;
  };
  column.table.setColumnOrder(insert(column.table.getAllLeafColumns().map((item) => item.id)));
  const pinned = column.getIsPinned();
  column.table.getColumn(id)?.pin(false);
  if (pinned)
    column.table.setColumnPinning((previous) => ({
      ...previous,
      [pinned]: insert(previous[pinned] ?? []),
    }));
  column.table.getColumn(id)?.toggleVisibility(true);
}

function clampWidth<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
  width: number,
) {
  return Math.round(
    Math.max(column.columnDef.minSize ?? 80, Math.min(column.columnDef.maxSize ?? 800, width)),
  );
}

export function fitColumnToData<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
  element: HTMLElement | null,
) {
  const table = element?.closest("table");
  const context = document.createElement("canvas").getContext("2d");
  if (!table || !context) return;
  let width = 0;
  for (const cell of table.querySelectorAll<HTMLElement>("[data-column-id]")) {
    if (cell.dataset.columnId !== column.id) continue;
    context.font = getComputedStyle(cell.querySelector("a, button") ?? cell).font;
    const content = cell.cloneNode(true);
    if (!(content instanceof HTMLElement)) continue;
    content.querySelectorAll(".sr-only, [aria-hidden=true]").forEach((item) => item.remove());
    const icons = cell.querySelectorAll("svg").length * 18;
    width = Math.max(
      width,
      context.measureText(content.textContent?.trim() ?? "").width + icons + 24,
    );
  }
  column.table.setColumnSizing((previous) => ({
    ...previous,
    [column.id]: clampWidth(column, width),
  }));
}

export function fitTableToWindow<TData extends RowData, TValue>(
  column: Column<DataTableFeatures, TData, TValue>,
  element: HTMLElement | null,
) {
  const available = element?.closest("[data-slot=table-container]")?.clientWidth;
  if (!available) return;
  fitColumnsToWidth(column.table, available);
}

export function fitColumnsToWidth<TData extends RowData>(
  table: Table<DataTableFeatures, TData>,
  available: number,
) {
  const columns = table.getVisibleLeafColumns();
  let pending = columns.filter((item) => item.getCanResize());
  let remaining =
    available -
    columns.filter((item) => !item.getCanResize()).reduce((sum, item) => sum + item.getSize(), 0);
  const sizes: Record<string, number> = {};
  // Fix columns that hit a limit, then divide the remaining space proportionally.
  while (pending.length) {
    const weight = pending.reduce((sum, item) => sum + item.getSize(), 0);
    const fixed = pending.flatMap((item) => {
      const width = (remaining * item.getSize()) / weight;
      return width < (item.columnDef.minSize ?? 80) || width > (item.columnDef.maxSize ?? 800)
        ? [{ column: item, width: clampWidth(item, width) }]
        : [];
    });
    if (!fixed.length) {
      let remainingWeight = weight;
      for (const item of pending) {
        const width = clampWidth(item, (remaining * item.getSize()) / remainingWeight);
        sizes[item.id] = width;
        remaining -= width;
        remainingWeight -= item.getSize();
      }
      break;
    }
    for (const item of fixed) {
      sizes[item.column.id] = item.width;
      remaining -= item.width;
    }
    pending = pending.filter((item) => !fixed.some((fixedItem) => fixedItem.column === item));
  }
  table.setColumnSizing((previous) => ({ ...previous, ...sizes }));
}
