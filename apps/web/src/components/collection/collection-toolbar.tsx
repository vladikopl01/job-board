"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortMenu } from "@/components/data-table/data-table-sort-menu";
import { Button } from "@/components/ui/button";
import type { DataTableFeatures } from "@/lib/data-table-features";

export function CollectionToolbar<T extends RowData>({
  table,
  children,
  actions,
  filterControls,
  filterTriggerId,
}: {
  table: ReactTable<DataTableFeatures, T, unknown>;
  children?: ReactNode;
  actions?: ReactNode;
  filterControls?: ReactNode;
  filterTriggerId?: string;
}) {
  return (
    <div data-collection-toolbar className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-auto flex-wrap items-center gap-2">
        {children}
        <DataTableFilterMenu table={table} triggerId={filterTriggerId}>
          {filterControls}
        </DataTableFilterMenu>
        <DataTableSortMenu table={table} />
        <table.Subscribe
          selector={(state) => state.columnFilters.length > 0 || state.sorting.length > 0}
        >
          {(filtered) =>
            filtered ? (
              <Button
                variant="ghost"
                onClick={() => {
                  table.resetColumnFilters(true);
                  table.resetSorting(true);
                  table.resetJoinOperator(true);
                }}
              >
                Clear
              </Button>
            ) : null
          }
        </table.Subscribe>
      </div>
      {actions ? (
        <div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
