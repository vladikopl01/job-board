"use client";

import { type ReactTable, type RowData, Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import * as React from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDirection } from "@/components/ui/direction";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Columns3Icon, PinOffIcon, RotateCcwIcon } from "lucide-react";

interface DataTableViewOptionsProps<TData extends RowData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  disabled?: boolean;
}

export function DataTableViewOptions<TData extends RowData>({
  table,
  disabled,
  className,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const dir = useDirection();
  const id = React.useId();
  const [search, setSearch] = React.useState("");
  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.accessorFn !== undefined),
    [table],
  );
  const matchingColumns = columns.filter((column) =>
    (column.columnDef.meta?.label ?? column.id).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Subscribe
      source={table.store}
      selector={({ columnVisibility, columnPinning }) => ({ columnVisibility, columnPinning })}
    >
      {({ columnVisibility, columnPinning }) => (
        <Popover
          onOpenChange={(open) => {
            if (!open) setSearch("");
          }}
        >
          <PopoverTrigger
            render={<Button aria-label="Customize columns" variant="outline" disabled={disabled} />}
          >
            <Columns3Icon aria-hidden="true" data-icon="inline-start" />
            Columns
          </PopoverTrigger>
          <PopoverContent
            aria-label="Columns"
            dir={dir}
            align="end"
            className={cn("w-60 gap-2 p-1", className)}
            {...props}
          >
            <Field className="px-1 pt-1">
              <FieldLabel htmlFor={`${id}-search`} className="sr-only">
                Search columns
              </FieldLabel>
              <Input
                id={`${id}-search`}
                placeholder="Search columns…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
            <div className="max-h-72 overflow-y-auto">
              <FieldSet className="gap-0">
                <FieldLegend className="sr-only">Visible columns</FieldLegend>
                <FieldGroup className="gap-0.5">
                  {matchingColumns.map((column) => (
                    <Field
                      key={column.id}
                      orientation="horizontal"
                      data-disabled={!column.getCanHide()}
                      className="min-h-7 gap-2 rounded-sm px-2.5 py-1.5 hover:bg-muted/50"
                    >
                      <FieldLabel htmlFor={`${id}-${column.id}`} className="min-w-0 truncate">
                        {column.columnDef.meta?.label ?? column.id}
                      </FieldLabel>
                      <Checkbox
                        id={`${id}-${column.id}`}
                        checked={columnVisibility[column.id] !== false}
                        disabled={!column.getCanHide()}
                        onCheckedChange={(checked) => column.toggleVisibility(checked)}
                      />
                    </Field>
                  ))}
                </FieldGroup>
                {matchingColumns.length === 0 ? (
                  <output className="p-2">No columns found.</output>
                ) : null}
              </FieldSet>
            </div>
            <Separator />
            <div className="flex flex-col gap-0.5 p-1">
              <Button
                variant="ghost"
                className="justify-start"
                disabled={disabled}
                onClick={() => {
                  table.resetColumnVisibility();
                  table.resetColumnOrder();
                  table.resetColumnPinning();
                  table.resetColumnSizing();
                }}
              >
                <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
                Reset columns
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                disabled={disabled || !(columnPinning.start?.length || columnPinning.end?.length)}
                onClick={() => table.setColumnPinning({ start: [], end: [] })}
              >
                <PinOffIcon aria-hidden="true" data-icon="inline-start" />
                Unpin all columns
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </Subscribe>
  );
}
