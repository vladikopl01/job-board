"use client";

import type { Column, RowData } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  ChevronsLeftRightIcon,
  Maximize2Icon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
} from "lucide-react";
import type { RefObject } from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";
import { useDirection } from "@/components/ui/direction";
import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  fitColumnToData,
  fitTableToWindow,
  getColumnGroup,
  insertColumn,
  moveColumn,
} from "./data-table-column-layout";

export function DataTableColumnMenu<TData extends RowData, TValue>({
  column,
  label,
  trigger,
  sorted,
}: {
  column: Column<DataTableFeatures, TData, TValue>;
  label: string;
  trigger: RefObject<HTMLElement | null>;
  sorted: boolean;
}) {
  const dir = useDirection();
  const pinned = column.getIsPinned();
  const group = getColumnGroup(column);
  const index = group.findIndex((item) => item.id === column.id);
  const hidden = column.table
    .getAllLeafColumns()
    .filter((item) => !item.getIsVisible() && item.getCanHide());
  return (
    <ContextMenuContent dir={dir} aria-label={`${label} column options`} className="w-52">
      <ContextMenuGroup>
        <ContextMenuLabel>{label}</ContextMenuLabel>
        {column.getCanSort() ? (
          <>
            <ContextMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUpIcon />
              Sort ascending
            </ContextMenuItem>
            <ContextMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDownIcon />
              Sort descending
            </ContextMenuItem>
            {sorted ? (
              <ContextMenuItem variant="destructive" onClick={() => column.clearSorting()}>
                Remove sort
              </ContextMenuItem>
            ) : null}
          </>
        ) : null}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        {(["before", "after"] as const).map((side) => (
          <ContextMenuSub key={side}>
            <ContextMenuSubTrigger disabled={!hidden.length}>
              {side === "before" ? <ArrowLeftToLineIcon /> : <ArrowRightToLineIcon />}
              Insert {side}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent dir={dir} aria-label={`Insert column ${side}`} className="w-44">
              <ContextMenuGroup>
                {hidden.map((item) => (
                  <ContextMenuItem
                    key={item.id}
                    onClick={() => insertColumn(column, item.id, side)}
                  >
                    {item.columnDef.meta?.label ?? item.id}
                  </ContextMenuItem>
                ))}
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        ))}
        <ContextMenuItem disabled={index <= 0} onClick={() => moveColumn(column, -1)}>
          <ArrowLeftIcon />
          Move left
        </ContextMenuItem>
        <ContextMenuItem
          disabled={index < 0 || index === group.length - 1}
          onClick={() => moveColumn(column, 1)}
        >
          <ArrowRightIcon />
          Move right
        </ContextMenuItem>
        {column.getCanPin() ? (
          <ContextMenuItem onClick={() => column.pin(pinned ? false : "start")}>
            {pinned ? <PinOffIcon /> : <PinIcon />}
            {pinned ? "Unpin column" : "Pin column"}
          </ContextMenuItem>
        ) : null}
        {column.getCanHide() ? (
          <ContextMenuItem variant="destructive" onClick={() => column.toggleVisibility(false)}>
            <Trash2Icon />
            Remove column
          </ContextMenuItem>
        ) : null}
      </ContextMenuGroup>
      {column.getCanResize() ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem onClick={() => fitColumnToData(column, trigger.current)}>
              <ChevronsLeftRightIcon />
              Fit column to data
            </ContextMenuItem>
            <ContextMenuItem onClick={() => fitTableToWindow(column, trigger.current)}>
              <Maximize2Icon />
              Fit table to window
            </ContextMenuItem>
          </ContextMenuGroup>
        </>
      ) : null}
    </ContextMenuContent>
  );
}
