"use client";

import {
  type Cell,
  type Column,
  type ColumnPinningPosition,
  FlexRender,
  type Header,
  type ReactTable,
  type Row,
  type RowData,
  Subscribe,
  type TableState,
} from "@tanstack/react-table";
import { cn } from "cn";
import * as React from "react";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";

import type { DataTableFeatures } from "@/lib/data-table-features";
import { useCollectionVirtualizer } from "@/components/collection/use-collection-virtualizer";

import {
  getAriaSort,
  getColumnPinningStyle,
  getColumnSizingStyle,
  getVisibleSelectedRows,
} from "@/lib/data-table-utils";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { fitColumnsToWidth } from "./data-table-column-layout";
import { Button } from "@/components/ui/button";
import { useDirection } from "@/components/ui/direction";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData extends RowData> extends React.ComponentProps<"div"> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  actionBar?: React.ReactNode;
  stickyHeader?: boolean;
  pagination?: React.ReactNode;
  getRowProps?: ((row: TData) => React.ComponentProps<"tr">) | undefined;
  activeRowId?: string | null | undefined;
}

export function DataTable<TData extends RowData>({
  table,
  actionBar,
  stickyHeader = false,
  pagination,
  getRowProps,
  activeRowId,
  children,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: DataTableProps<TData>) {
  const dir = useDirection();

  return (
    <div
      data-slot="data-table"
      dir={dir}
      className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
      {...props}
    >
      {children}
      <div
        className={cn(
          "isolate rounded-md border",
          stickyHeader
            ? "min-h-0 scroll-pt-10 overflow-auto [&:has(thead>tr:nth-child(2))]:scroll-pt-20 [&:has(thead>tr:nth-child(3))]:scroll-pt-30 [&>[data-slot=table-container]]:overflow-visible"
            : "overflow-hidden",
        )}
      >
        <DataTableLayout table={table} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
          <DataTableHeader table={table} stickyHeader={stickyHeader} />
          <DataTableBody table={table} getRowProps={getRowProps} activeRowId={activeRowId} />
        </DataTableLayout>
      </div>
      <div className="flex flex-col gap-2.5">
        {pagination === undefined ? <DataTablePagination table={table} /> : pagination}
        {actionBar ? <DataTableActionBar table={table} actionBar={actionBar} /> : null}
      </div>
    </div>
  );
}

interface DataTableLayoutProps<TData extends RowData> extends Pick<
  React.ComponentProps<"table">,
  "aria-label" | "aria-labelledby"
> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  children: React.ReactNode;
}

function DataTableLayout<TData extends RowData>({
  table,
  children,
  ...props
}: DataTableLayoutProps<TData>) {
  return (
    <table.Subscribe selector={selectLayoutState}>
      {({ columnVisibility }) => (
        <DataTableSizedLayout table={table} columnVisibility={columnVisibility} {...props}>
          {children}
        </DataTableSizedLayout>
      )}
    </table.Subscribe>
  );
}

function DataTableSizedLayout<TData extends RowData>({
  table,
  columnVisibility,
  children,
  ...props
}: DataTableLayoutProps<TData> & {
  columnVisibility: TableState<DataTableFeatures>["columnVisibility"];
}) {
  const ref = React.useRef<HTMLTableElement>(null);
  // Refit restored/changed columns; ordinary row updates retain manual sizes.
  React.useLayoutEffect(() => {
    const viewport = ref.current?.parentElement;
    if (!viewport) return;
    let previousWidth = 0;
    function fit() {
      const width = viewport?.clientWidth ?? 0;
      if (!width || width === previousWidth) return;
      previousWidth = width;
      fitColumnsToWidth(table, width);
    }
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [table, columnVisibility]);

  return (
    <Table
      ref={ref}
      className="table-fixed"
      style={getColumnSizingStyle(table)}
      aria-rowcount={table.getRowModel().rows.length + table.getHeaderGroups().length}
      {...props}
    >
      {children}
    </Table>
  );
}

interface DataTableHeaderProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  stickyHeader: boolean;
}

function DataTableHeader<TData extends RowData>({
  table,
  stickyHeader,
}: DataTableHeaderProps<TData>) {
  return (
    <table.Subscribe selector={selectHeaderState}>
      {() => (
        <TableHeader
          className={cn(
            stickyHeader &&
              "sticky top-0 z-30 bg-background [&_th]:shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0",
          )}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="group/row">
              {headerGroup.headers.map((header) => (
                <DataTableHeadCell
                  key={header.id}
                  header={header}
                  pinned={header.column.getIsPinned()}
                />
              ))}
            </TableRow>
          ))}
        </TableHeader>
      )}
    </table.Subscribe>
  );
}

interface DataTableHeadCellProps<TData extends RowData> {
  header: Header<DataTableFeatures, TData>;
  pinned: ColumnPinningPosition;
}

function DataTableHeadCell<TData extends RowData>({
  header,
  pinned,
}: DataTableHeadCellProps<TData>) {
  return (
    <Subscribe
      source={header.column.table.atoms.sorting}
      selector={(sorting) => getAriaSort(sorting, header.column.id)}
    >
      {(ariaSort) => (
        <TableHead
          data-column-id={header.column.id}
          data-pinned={pinned || undefined}
          aria-sort={ariaSort}
          colSpan={header.colSpan}
          className={cn("relative", getCellClassName(header.column))}
          style={getColumnPinningStyle(header.column, pinned)}
        >
          {header.isPlaceholder ? null : <FlexRender header={header} />}
          {header.column.getCanResize() ? <ColumnResizeHandle header={header} /> : null}
        </TableHead>
      )}
    </Subscribe>
  );
}

function ColumnResizeHandle<TData extends RowData>({
  header,
}: {
  header: Header<DataTableFeatures, TData>;
}) {
  return (
    <Subscribe source={header.column.table.atoms.columnSizing}>
      {() => (
        <Button
          variant="ghost"
          aria-label={`Resize ${header.column.columnDef.meta?.label ?? header.column.id} column, ${header.column.getSize()} pixels`}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const size = Math.max(
              header.column.columnDef.minSize ?? 80,
              Math.min(
                header.column.columnDef.maxSize ?? 800,
                header.column.getSize() + (event.key === "ArrowRight" ? 16 : -16),
              ),
            );
            header.column.table.setColumnSizing((previous) => ({
              ...previous,
              [header.column.id]: size,
            }));
          }}
          className="absolute inset-y-0 end-0 h-full w-2 cursor-col-resize touch-none rounded-none p-0 outline-ring hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2"
        />
      )}
    </Subscribe>
  );
}

function getCellClassName<TData extends RowData>(column: Column<DataTableFeatures, TData>) {
  const pinned = column.getIsPinned();
  const boundary =
    pinned === "start"
      ? column.table.getStartVisibleLeafColumns().at(-1)?.id === column.id
      : pinned === "end" && column.table.getEndVisibleLeafColumns()[0]?.id === column.id;
  return cn(
    "overflow-hidden",
    pinned &&
      "bg-background transition-colors group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))] group-has-aria-expanded/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))] group-data-[state=selected]/row:bg-muted",
    boundary &&
      "after:pointer-events-none after:absolute after:inset-y-0 after:w-px after:bg-border",
    boundary && (pinned === "start" ? "after:end-0" : "after:start-0"),
  );
}

interface DataTableBodyProps<TData extends RowData> {
  getRowProps?: ((row: TData) => React.ComponentProps<"tr">) | undefined;
  table: ReactTable<DataTableFeatures, TData, unknown>;
  activeRowId?: string | null | undefined;
}

function DataTableBody<TData extends RowData>({
  table,
  getRowProps,
  activeRowId,
}: DataTableBodyProps<TData>) {
  const rows = table.getRowModel().rows;
  const collection = useCollectionVirtualizer<HTMLTableSectionElement, HTMLTableRowElement>({
    keys: rows.map((row) => row.id),
    estimateSize: 44,
    activeId: activeRowId,
  });

  if (!rows.length) {
    return (
      <Subscribe source={table.atoms.columnVisibility}>
        {() => (
          <TableBody ref={collection.ref}>
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length || 1}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Subscribe>
    );
  }

  return (
    <Subscribe source={table.atoms.columnVisibility}>
      {() => {
        const colSpan = table.getVisibleLeafColumns().length || 1;
        const last = collection.items.at(-1);
        const bottom =
          collection.enabled && last
            ? collection.totalSize - last.end + collection.scrollMargin
            : 0;
        return (
          <TableBody
            ref={collection.ref}
            onFocusCapture={collection.onFocusCapture}
            data-virtualized={collection.enabled || undefined}
          >
            {collection.items.map((item, index) => {
              const row = rows[item.index];
              if (!row) return null;
              const previousEnd = collection.items[index - 1]?.end ?? collection.scrollMargin;
              const before = collection.enabled ? item.start - previousEnd : 0;
              return (
                <React.Fragment key={row.id}>
                  {before > 0 ? <DataTableSpacer height={before} colSpan={colSpan} /> : null}
                  <DataTableRow
                    row={row}
                    getRowProps={getRowProps}
                    index={item.index}
                    measureElement={collection.enabled ? collection.measureElement : undefined}
                  />
                </React.Fragment>
              );
            })}
            {bottom > 0 ? <DataTableSpacer height={bottom} colSpan={colSpan} /> : null}
          </TableBody>
        );
      }}
    </Subscribe>
  );
}

function DataTableSpacer({ height, colSpan }: { height: number; colSpan: number }) {
  return (
    <tr aria-hidden="true">
      <td aria-hidden="true" colSpan={colSpan} style={{ height, padding: 0, border: 0 }} />
    </tr>
  );
}

interface DataTableActionBarProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  actionBar: React.ReactNode;
}

function DataTableActionBar<TData extends RowData>({
  table,
  actionBar,
}: DataTableActionBarProps<TData>) {
  return (
    <table.Subscribe selector={() => getVisibleSelectedRows(table).length > 0}>
      {(hasVisibleSelectedRows) => (hasVisibleSelectedRows ? actionBar : null)}
    </table.Subscribe>
  );
}

interface DataTableRowProps<TData extends RowData> {
  getRowProps?: ((row: TData) => React.ComponentProps<"tr">) | undefined;
  row: Row<DataTableFeatures, TData>;
  index: number;
  measureElement?: ((element: HTMLTableRowElement | null) => void) | undefined;
}

const DataTableRow = React.memo(DataTableRowImpl) as typeof DataTableRowImpl;

function DataTableRowImpl<TData extends RowData>({
  row,
  getRowProps,
  index,
  measureElement,
}: DataTableRowProps<TData>) {
  const rowProps = getRowProps?.(row.original);
  const ref = useMergedRefs(rowProps?.ref, measureElement);
  return (
    <Subscribe
      source={row.table.store}
      selector={(state) => ({
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnVisibility: state.columnVisibility,
        isSelected: state.rowSelection[row.id] === true,
      })}
    >
      {({ isSelected }) => (
        <TableRow
          {...rowProps}
          ref={ref}
          data-index={index}
          data-virtual-key={row.id}
          aria-rowindex={index + row.table.getHeaderGroups().length + 1}
          data-state={isSelected ? "selected" : undefined}
          className={cn("group/row", rowProps?.className)}
        >
          {row.getVisibleCells().map((cell) => (
            <DataTableCell key={cell.id} cell={cell} pinned={cell.column.getIsPinned()} />
          ))}
        </TableRow>
      )}
    </Subscribe>
  );
}

interface DataTableCellProps<TData extends RowData> {
  cell: Cell<DataTableFeatures, TData>;
  pinned: ColumnPinningPosition;
}

const DataTableCell = React.memo(DataTableCellImpl) as typeof DataTableCellImpl;

function DataTableCellImpl<TData extends RowData>({ cell, pinned }: DataTableCellProps<TData>) {
  return (
    <TableCell
      data-column-id={cell.column.id}
      data-pinned={pinned || undefined}
      className={getCellClassName(cell.column)}
      style={getColumnPinningStyle(cell.column, pinned)}
    >
      <FlexRender cell={cell} />
    </TableCell>
  );
}

function selectLayoutState(state: TableState<DataTableFeatures>) {
  return {
    columnOrder: state.columnOrder,
    columnPinning: state.columnPinning,
    columnSizing: state.columnSizing,
    columnVisibility: state.columnVisibility,
  };
}

function selectHeaderState(state: TableState<DataTableFeatures>) {
  return {
    columnOrder: state.columnOrder,
    columnPinning: state.columnPinning,
    columnVisibility: state.columnVisibility,
  };
}
