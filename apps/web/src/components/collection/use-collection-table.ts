"use client";

import {
  functionalUpdate,
  useTable,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useEffect, useReducer, useRef } from "react";
import { z } from "zod";
import { dataTableFeatures, type DataTableFeatures } from "@/lib/data-table-features";
import { normalizeColumnFilter, getFilterVariant } from "@/lib/data-table-utils";
import {
  collectionFiltersSchema,
  collectionSortsSchema,
  type CollectionFilterItem,
  type CollectionSort,
} from "./query-schema";

export type CollectionQuery = {
  filters: CollectionFilterItem[];
  sort: CollectionSort[];
  join: "and" | "or";
};
const layoutSchema = z.object({
  columnVisibility: z.record(z.string().max(50), z.boolean()),
  columnOrder: z.array(z.string().max(50)).max(30),
  columnPinning: z.object({ start: z.array(z.string()).max(30), end: z.array(z.string()).max(30) }),
  columnSizing: z.record(z.string().max(50), z.number().min(48).max(1200)),
});
const defaultColumnVisibility = {
  boardId: false,
  firstSeenAt: false,
  createdAt: false,
  country: false,
  region: false,
  department: false,
};

export function useCollectionTable<T extends RowData & { id: string }>({
  data,
  columns,
  query,
  onQueryChange,
  storageKey,
  selectedIds = [],
  onSelectionChange,
}: {
  data: T[];
  columns: ColumnDef<DataTableFeatures, T>[];
  query: CollectionQuery;
  onQueryChange: (query: CollectionQuery) => void;
  storageKey: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [, publishRestoredLayout] = useReducer((revision: number) => revision + 1, 0);
  const pending = useRef({ base: query, next: query });
  function currentQuery() {
    if (pending.current.base !== query) pending.current = { base: query, next: query };
    return pending.current.next;
  }
  function commit(change: Partial<CollectionQuery>) {
    pending.current.next = { ...currentQuery(), ...change };
    onQueryChange(pending.current.next);
  }
  const table = useTable(
    {
      features: dataTableFeatures,
      data,
      columns,
      getRowId: (row) => row.id,
      manualFiltering: true,
      manualSorting: true,
      manualPagination: true,
      enableGlobalFilter: false,
      maxMultiSortColCount: 5,
      columnResizeMode: "onChange",
      defaultColumn: { minSize: 80, maxSize: 800 },
      initialState: { columnVisibility: defaultColumnVisibility },
      state: {
        columnFilters: query.filters,
        sorting: query.sort,
        joinOperator: query.join,
        rowSelection: Object.fromEntries(selectedIds.map((id) => [id, true])),
      },
      onColumnFiltersChange: (updater) => {
        const next = functionalUpdate(updater, currentQuery().filters).map((filter) =>
          normalizeColumnFilter(
            filter,
            getFilterVariant(columns.find((column) => column.id === filter.id)?.meta),
          ),
        );
        const parsed = collectionFiltersSchema.safeParse(next);
        if (parsed.success) commit({ filters: parsed.data });
      },
      onSortingChange: (updater) => {
        const next = collectionSortsSchema.safeParse(
          functionalUpdate(updater, currentQuery().sort),
        );
        if (next.success) commit({ sort: next.data });
      },
      onJoinOperatorChange: (updater) =>
        commit({ join: functionalUpdate(updater, currentQuery().join) }),
      onRowSelectionChange: (updater) => {
        const current: RowSelectionState = Object.fromEntries(selectedIds.map((id) => [id, true]));
        onSelectionChange?.(
          Object.entries(functionalUpdate(updater, current))
            .filter(([, selected]) => selected)
            .map(([id]) => id),
        );
      },
    },
    // Controls subscribe to their own slices without rerendering the collection root.
    () => ({}),
  );
  const { store, setColumnVisibility, setColumnOrder, setColumnPinning, setColumnSizing } = table;
  const storedKey = `job-board:columns:${storageKey}`;
  useEffect(() => {
    try {
      const value = localStorage.getItem(storedKey);
      const layout = value ? layoutSchema.safeParse(JSON.parse(value)) : null;
      if (layout?.success) {
        setColumnVisibility({ ...defaultColumnVisibility, ...layout.data.columnVisibility });
        setColumnOrder(layout.data.columnOrder);
        setColumnPinning(layout.data.columnPinning);
        setColumnSizing(layout.data.columnSizing);
        // Publish once so mounted tables fit restored widths even if visibility is unchanged.
        publishRestoredLayout();
      }
    } catch {
      /* A blocked or full browser store leaves the default columns usable. */
    }
    let previous = "";
    const subscription = store.subscribe((state) => {
      const value = JSON.stringify({
        columnVisibility: state.columnVisibility,
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnSizing: state.columnSizing,
      });
      if (value === previous) return;
      previous = value;
      try {
        localStorage.setItem(storedKey, value);
      } catch {
        /* Column customization still works for this session. */
      }
    });
    return () => subscription.unsubscribe();
  }, [storedKey, store, setColumnVisibility, setColumnOrder, setColumnPinning, setColumnSizing]);
  return table;
}
