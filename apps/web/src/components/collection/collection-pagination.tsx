"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceFooter } from "@/components/workspace-footer";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const collectionPageSizes = [10, 25, 50] as const;
export type CollectionPageSize = (typeof collectionPageSizes)[number];

export function CollectionPagination({
  total,
  page,
  pageSize,
  disabled = false,
  actions,
  label,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  disabled?: boolean;
  actions?: ReactNode;
  label: string;
  onPage: (page: number) => void;
  onPageSize: (size: CollectionPageSize) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <WorkspaceFooter>
      <footer className="border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {actions}
        <div
          data-collection-pagination
          className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6"
        >
          <output aria-live="polite" className="text-xs text-muted-foreground tabular-nums">
            {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}{" "}
            {label.toLowerCase()}
          </output>
          <nav aria-label={`${label} pages`} className="ms-auto flex flex-wrap items-center gap-2">
            <Field orientation="horizontal" className="w-auto">
              <FieldLabel className="sr-only" htmlFor={`${label}-page-size`}>
                Per page
              </FieldLabel>
              <Select
                value={pageSize}
                onValueChange={(value) => {
                  if (value === 10 || value === 25 || value === 50) onPageSize(value);
                }}
              >
                <SelectTrigger id={`${label}-page-size`} aria-label={`${label} per page`} size="sm">
                  <SelectValue>{pageSize} rows</SelectValue>
                </SelectTrigger>
                <SelectContent align="end" alignItemWithTrigger={false}>
                  <SelectGroup>
                    {collectionPageSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} rows
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <span
              className="min-w-12 text-center text-xs tabular-nums"
              aria-label={`Page ${page} of ${pages}`}
            >
              {page} / {pages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous"
              disabled={disabled || page <= 1}
              focusableWhenDisabled
              onClick={() => onPage(page - 1)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next"
              disabled={disabled || page >= pages}
              focusableWhenDisabled
              onClick={() => onPage(page + 1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </footer>
    </WorkspaceFooter>
  );
}
