"use client";

import type { ReactTable } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import { SearchInput } from "@/components/collection/search-input";
import type { DataTableFeatures } from "@/lib/data-table-features";
import type { JobListItem } from "./schemas";

export function JobFilters({
  q,
  searchReset,
  table,
  actions,
  onChange,
}: {
  q: string;
  searchReset: number;
  table: ReactTable<DataTableFeatures, JobListItem, unknown>;
  actions: ReactNode;
  onChange: (change: { q: string }) => void;
}) {
  return (
    <CollectionToolbar table={table} actions={actions}>
      <SearchInput
        value={q}
        resetKey={searchReset}
        onChange={(q) => onChange({ q })}
        label="Search jobs"
        placeholder="Search jobs…"
      />
    </CollectionToolbar>
  );
}
