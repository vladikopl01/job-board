"use client";

import { type Column, type RowData, Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, PinIcon } from "lucide-react";
import { useRef, type ComponentProps } from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DataTableColumnMenu } from "./data-table-column-menu";

interface DataTableColumnHeaderProps<TData extends RowData, TValue> extends ComponentProps<
  typeof Button
> {
  column: Column<DataTableFeatures, TData, TValue>;
  label: string;
}

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  label,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const trigger = useRef<HTMLDivElement>(null);
  return (
    <Subscribe
      source={column.table.store}
      selector={(state) => ({
        sorting: state.sorting,
        pinning: state.columnPinning,
        order: state.columnOrder,
        visibility: state.columnVisibility,
      })}
    >
      {({ sorting }) => {
        const sort = sorting.find((item) => item.id === column.id);
        const pinned = column.getIsPinned();
        const SortIcon = sort ? (sort.desc ? ArrowDownIcon : ArrowUpIcon) : ArrowUpDownIcon;
        return (
          <ContextMenu>
            <ContextMenuTrigger ref={trigger}>
              <Button
                variant="ghost"
                aria-label={label}
                aria-description={`${pinned ? "Pinned column. " : ""}${column.getCanSort() ? "Click to sort. " : ""}Right-click or press Shift+F10 for column options.`}
                className={cn("-ms-2 max-w-full", className)}
                onClick={(event) =>
                  column.getCanSort() && column.toggleSorting(undefined, event.shiftKey)
                }
                onKeyDown={(event) => {
                  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))
                    return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  trigger.current?.dispatchEvent(
                    new MouseEvent("contextmenu", {
                      bubbles: true,
                      cancelable: true,
                      clientX: rect.left,
                      clientY: rect.bottom,
                    }),
                  );
                }}
                {...props}
              >
                <span className="truncate">{label}</span>
                {column.getCanSort() ? (
                  <SortIcon aria-hidden="true" data-icon="inline-end" />
                ) : null}
                {pinned ? (
                  <PinIcon
                    aria-hidden="true"
                    data-column-pin
                    data-icon="inline-end"
                    fill="currentColor"
                  />
                ) : null}
              </Button>
            </ContextMenuTrigger>
            <DataTableColumnMenu
              column={column}
              label={label}
              trigger={trigger}
              sorted={Boolean(sort)}
            />
          </ContextMenu>
        );
      }}
    </Subscribe>
  );
}
