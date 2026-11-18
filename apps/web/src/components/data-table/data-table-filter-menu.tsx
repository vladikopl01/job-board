"use client";

import type { Column, ReactTable, RowData } from "@tanstack/react-table";

import { cn } from "cn";
import * as React from "react";

import type { DataTableFeatures } from "@/lib/data-table-features";
import type { ColumnFilterItem, JoinOperator } from "@/lib/data-table-types";

import {
  coerceFilterValue,
  getColumnSelectOptions,
  getDateFilterLabel,
  getDefaultFilter,
  getFilterDates,
  getFilterDateValue,
  getFilterOperators,
  getIsEditableTarget,
  getIsValuelessOperator,
  getSelectFilterValue,
  JOIN_OPERATORS,
} from "@/lib/data-table-utils";
import { generateId } from "@/lib/id";
import { DataTableFieldPicker } from "./data-table-field-picker";
import { DataTableRangeFilter } from "@/components/data-table/data-table-range-filter";
import { AppBadge } from "@/components/app-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useDirection } from "@/components/ui/direction";
import {
  Faceted,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedItemIndicator,
  FacetedList,
  FacetedTrigger,
  FacetedValue,
} from "@/components/ui/faceted";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/components/ui/sortable";
import {
  ListFilter,
  Trash2,
  GripVertical,
  ChevronsUpDown,
  CalendarIcon,
  Power,
  PowerOff,
} from "lucide-react";

const FILTER_SHORTCUT_KEY = "f";
const REMOVE_FILTER_SHORTCUTS = ["backspace", "delete"];

type FilterUpdate = Partial<Omit<ColumnFilterItem, "filterId">>;
type FilterSelector = "field" | "operator" | "value";

interface DataTableFilterMenuProps<TData extends RowData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: ReactTable<DataTableFeatures, TData, unknown>;
  disabled?: boolean;
  triggerId?: string | undefined;
}

export function DataTableFilterMenu<TData extends RowData>({
  table,
  ...props
}: DataTableFilterMenuProps<TData>) {
  return (
    <table.Subscribe
      selector={(state) => ({
        filters: table.getColumnFilterItems(),
        joinOperator: state.joinOperator,
      })}
    >
      {({ filters, joinOperator }) => (
        <DataTableFilterMenuContent
          table={table}
          filters={filters}
          joinOperator={joinOperator}
          {...props}
        />
      )}
    </table.Subscribe>
  );
}

interface DataTableFilterMenuContentProps<
  TData extends RowData,
> extends DataTableFilterMenuProps<TData> {
  filters: ColumnFilterItem[];
  joinOperator: JoinOperator;
}

function DataTableFilterMenuContent<TData extends RowData>({
  table,
  filters,
  joinOperator,
  disabled,
  triggerId,
  children,
  className,
  ...props
}: DataTableFilterMenuContentProps<TData>) {
  const dir = useDirection();
  const id = React.useId();
  const labelId = React.useId();
  const descriptionId = React.useId();
  const [open, setOpen] = React.useState(false);
  const addButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (getIsEditableTarget(event.target)) return;
      if (
        event.key.toLowerCase() !== FILTER_SHORTCUT_KEY ||
        !(event.ctrlKey || event.metaKey) ||
        !event.shiftKey
      ) {
        return;
      }

      event.preventDefault();
      setOpen((open) => !open);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const hasFilters = filters.length > 0;

  function onFilterAdd(id: string) {
    const column = columns.find((column) => column.id === id);
    if (!column) return;

    table.addColumnFilter({
      ...getDefaultFilter(column),
      filterId: generateId({ length: 8 }),
    });
  }

  function onFilterUpdate(filterId: string, updates: FilterUpdate) {
    table.updateColumnFilter(filterId, updates);
  }

  function onFilterRemove(filterId: string) {
    table.removeColumnFilter(filterId);
    addButtonRef.current?.focus();
  }

  function onFiltersReset() {
    table.resetColumnFilters(true);
    table.resetJoinOperator(true);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const lastFilter = filters.at(-1);
    if (!lastFilter || !getIsRemoveKey(event)) return;

    event.preventDefault();
    onFilterRemove(lastFilter.filterId);
  }

  return (
    <Sortable
      value={filters}
      onValueChange={(value) => table.setColumnFilters(value)}
      getItemValue={(item) => item.filterId}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={triggerId}
          render={<Button variant="outline" onKeyDown={onTriggerKeyDown} disabled={disabled} />}
        >
          <ListFilter className="text-muted-foreground" />
          Filter{" "}
          {hasFilters && (
            <AppBadge variant="counter" className="tabular-nums">
              {filters.length}
            </AppBadge>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          dir={dir}
          aria-describedby={descriptionId}
          aria-labelledby={labelId}
          className={cn(
            "flex max-w-(--available-width) flex-col gap-3 p-3",
            hasFilters ? "w-[min(60rem,var(--available-width))]" : "w-72",
            className,
          )}
          {...props}
        >
          <div className="flex flex-col gap-1">
            <h4 id={labelId} className="leading-none font-medium">
              {hasFilters || children ? "Filters" : "No filters applied"}
            </h4>
            <p
              id={descriptionId}
              className={cn("text-xs text-muted-foreground", hasFilters && "sr-only")}
            >
              {hasFilters
                ? "Modify filters to refine your rows."
                : "Add filters to refine your rows."}
            </p>
          </div>
          {children}
          {hasFilters && (
            <SortableContent
              render={
                <ul className="flex max-h-[min(28rem,60dvh)] flex-col gap-3 overflow-y-auto p-1" />
              }
            >
              {filters.map((filter, index) => (
                <DataTableFilterItem<TData>
                  key={filter.filterId}
                  filter={filter}
                  index={index}
                  filterItemId={`${id}-filter-${filter.filterId}`}
                  joinOperator={joinOperator}
                  columns={columns}
                  onJoinOperatorChange={(value) => table.setJoinOperator(value)}
                  onFilterUpdate={onFilterUpdate}
                  onFilterRemove={onFilterRemove}
                />
              ))}
            </SortableContent>
          )}
          <div className="flex w-full items-center gap-2">
            <DataTableFieldPicker
              ref={addButtonRef}
              kind="filter"
              fields={columns.map((column) => ({
                id: column.id,
                label: column.columnDef.meta?.label ?? column.id,
              }))}
              disabled={filters.length >= 12}
              onSelect={onFilterAdd}
            />
            {hasFilters && (
              <Button variant="outline" onClick={onFiltersReset}>
                Reset
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <SortableOverlay>
        <div
          dir={dir}
          className="grid size-full grid-cols-[minmax(4.5rem,auto)_8rem_8rem_minmax(10rem,1fr)_auto_auto] items-center gap-2"
        >
          <div className="h-8 rounded-lg bg-primary/10" />
          <div className="h-8 rounded-lg bg-primary/10" />
          <div className="h-8 rounded-lg bg-primary/10" />
          <div className="h-8 rounded-lg bg-primary/10" />
          <div className="size-8 rounded-lg bg-primary/10" />
          <div className="size-8 rounded-lg bg-primary/10" />
        </div>
      </SortableOverlay>
    </Sortable>
  );
}

function getIsRemoveKey(event: React.KeyboardEvent) {
  return REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase());
}

interface DataTableFilterItemProps<TData extends RowData> {
  filter: ColumnFilterItem;
  index: number;
  filterItemId: string;
  joinOperator: JoinOperator;
  columns: Column<DataTableFeatures, TData>[];
  onJoinOperatorChange: (value: JoinOperator) => void;
  onFilterUpdate: (filterId: string, updates: FilterUpdate) => void;
  onFilterRemove: (filterId: string) => void;
}

function DataTableFilterItem<TData extends RowData>({
  filter,
  index,
  filterItemId,
  joinOperator,
  columns,
  onJoinOperatorChange,
  onFilterUpdate,
  onFilterRemove,
}: DataTableFilterItemProps<TData>) {
  const [activeSelector, setActiveSelector] = React.useState<FilterSelector | null>(null);

  const column = columns.find((column) => column.id === filter.id);
  if (!column) return null;

  const label = column.columnDef.meta?.label ?? column.id;

  function getSelectorProps(selector: FilterSelector) {
    return {
      open: activeSelector === selector,
      onOpenChange: (open: boolean) => setActiveSelector(open ? selector : null),
    };
  }

  return (
    <SortableItem
      id={filterItemId}
      value={filter.filterId}
      render={
        <li
          tabIndex={-1}
          className="grid grid-cols-2 items-center gap-2 rounded-lg border p-2 sm:grid-cols-[4.5rem_minmax(6rem,1fr)_max-content_minmax(8rem,1.5fr)_auto_auto_auto] sm:border-0 sm:p-0"
        />
      }
    >
      <div className="col-span-2 text-center sm:col-span-1 sm:min-w-18">
        <FilterJoinOperator
          index={index}
          joinOperator={joinOperator}
          listboxId={`${filterItemId}-join-operator-listbox`}
          onJoinOperatorChange={onJoinOperatorChange}
        />
      </div>
      <FilterFieldSelector
        filter={filter}
        column={column}
        columns={columns}
        listboxId={`${filterItemId}-field-listbox`}
        onFilterUpdate={onFilterUpdate}
        {...getSelectorProps("field")}
      />
      <FilterOperatorSelector
        filter={filter}
        label={label}
        listboxId={`${filterItemId}-operator-listbox`}
        onFilterUpdate={onFilterUpdate}
        {...getSelectorProps("operator")}
      />
      <div className="col-span-2 w-full min-w-0 sm:col-span-1">
        <FilterValueInput
          filter={filter}
          column={column}
          inputId={`${filterItemId}-input`}
          onFilterUpdate={onFilterUpdate}
          {...getSelectorProps("value")}
        />
      </div>
      <Button
        aria-label={`${filter.disabled ? "Enable" : "Disable"} ${label} filter`}
        aria-pressed={!filter.disabled}
        variant={filter.disabled ? "outline" : "secondary"}
        size="icon"
        onClick={() => onFilterUpdate(filter.filterId, { disabled: !filter.disabled })}
      >
        {filter.disabled ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
      </Button>
      <Button
        aria-controls={filterItemId}
        aria-label={`Remove ${label} filter`}
        variant="destructive"
        size="icon"
        onClick={() => onFilterRemove(filter.filterId)}
      >
        <Trash2 />
      </Button>
      <SortableItemHandle
        aria-label={`Reorder ${label} filter`}
        render={<Button variant="outline" size="icon" />}
      >
        <GripVertical />
      </SortableItemHandle>
    </SortableItem>
  );
}

interface FilterJoinOperatorProps {
  index: number;
  joinOperator: JoinOperator;
  listboxId: string;
  onJoinOperatorChange: (value: JoinOperator) => void;
}

function FilterJoinOperator({
  index,
  joinOperator,
  listboxId,
  onJoinOperatorChange,
}: FilterJoinOperatorProps) {
  const dir = useDirection();
  if (index === 0) {
    return <span className="text-xs text-muted-foreground">Where</span>;
  }

  if (index > 1) {
    return <span className="text-xs text-muted-foreground">{joinOperator}</span>;
  }

  return (
    <Select
      value={joinOperator}
      onValueChange={(value) => {
        if (value == null) return;
        onJoinOperatorChange(value);
      }}
    >
      <SelectTrigger
        aria-label="Select join operator"
        aria-controls={listboxId}
        className="lowercase"
      >
        <SelectValue placeholder={joinOperator} />
      </SelectTrigger>
      <SelectContent
        dir={dir}
        id={listboxId}
        alignItemWithTrigger={false}
        className="min-w-(--anchor-width) lowercase"
      >
        <SelectGroup>
          {JOIN_OPERATORS.map((joinOperator) => (
            <SelectItem key={joinOperator} value={joinOperator}>
              {joinOperator}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

interface FilterSelectorProps {
  filter: ColumnFilterItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilterUpdate: (filterId: string, updates: FilterUpdate) => void;
}

interface FilterFieldSelectorProps<TData extends RowData> extends FilterSelectorProps {
  column: Column<DataTableFeatures, TData>;
  columns: Column<DataTableFeatures, TData>[];
  listboxId: string;
}

function FilterFieldSelector<TData extends RowData>({
  filter,
  column,
  columns,
  listboxId,
  open,
  onOpenChange,
  onFilterUpdate,
}: FilterFieldSelectorProps<TData>) {
  const dir = useDirection();
  return (
    <Faceted
      open={open}
      onOpenChange={onOpenChange}
      value={filter.id}
      onValueChange={(columnId) => {
        const column = columns.find((column) => column.id === columnId);
        if (column) {
          onFilterUpdate(filter.filterId, getDefaultFilter(column));
        }
      }}
    >
      <FacetedTrigger
        render={
          <Button
            aria-controls={listboxId}
            aria-label="Filter field"
            variant="outline"
            className="w-full min-w-0"
          />
        }
      >
        <span className="truncate">{column.columnDef.meta?.label ?? "Select field"}</span>
        <ChevronsUpDown className="opacity-50" />
      </FacetedTrigger>
      <FacetedContent label="Search filter fields" dir={dir} id={listboxId} className="w-40">
        <FacetedInput aria-label="Search filter fields" placeholder="Search fields…" />
        <FacetedList>
          <FacetedEmpty>No fields found.</FacetedEmpty>
          <FacetedGroup>
            {columns.map((column) => (
              <FacetedItem key={column.id} value={column.id} className="text-xs">
                <span className="truncate">{column.columnDef.meta?.label ?? column.id}</span>
                <FacetedItemIndicator />
              </FacetedItem>
            ))}
          </FacetedGroup>
        </FacetedList>
      </FacetedContent>
    </Faceted>
  );
}

interface FilterOperatorSelectorProps extends FilterSelectorProps {
  label: string;
  listboxId: string;
}

function FilterOperatorSelector({
  filter,
  label,
  listboxId,
  open,
  onOpenChange,
  onFilterUpdate,
}: FilterOperatorSelectorProps) {
  const dir = useDirection();
  const operators = getFilterOperators(filter.variant);
  return (
    <Select
      open={open}
      onOpenChange={onOpenChange}
      value={filter.operator}
      onValueChange={(operator) => {
        if (operator == null) return;
        onFilterUpdate(filter.filterId, {
          operator,
          value: coerceFilterValue(operator, filter.value),
        });
      }}
    >
      <SelectTrigger
        aria-controls={listboxId}
        aria-label={`${label} filter operator`}
        className="w-max min-w-0 max-w-full lowercase"
      >
        <span className="grid min-w-0 text-left">
          {/* Reserve the widest option without a fixed width or shifting on selection. */}
          {operators.map((operator) => (
            <span
              key={operator.value}
              aria-hidden="true"
              className="invisible col-start-1 row-start-1"
            >
              {operator.label}
            </span>
          ))}
          <SelectValue className="col-start-1 row-start-1 truncate">
            {operators.find((operator) => operator.value === filter.operator)?.label}
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent
        dir={dir}
        id={listboxId}
        className="w-max min-w-(--anchor-width) max-w-(--available-width)"
      >
        <SelectGroup>
          {operators.map((operator) => (
            <SelectItem key={operator.value} value={operator.value} className="lowercase">
              {operator.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

interface FilterValueInputProps<TData extends RowData> extends FilterSelectorProps {
  column: Column<DataTableFeatures, TData>;
  inputId: string;
}

function FilterValueInput<TData extends RowData>(props: FilterValueInputProps<TData>) {
  const { filter, column, inputId, onFilterUpdate } = props;
  const columnMeta = column.columnDef.meta;

  if (getIsValuelessOperator(filter.operator)) {
    return (
      <output
        id={inputId}
        aria-label={`${columnMeta?.label ?? column.id} filter is ${
          filter.operator === "isEmpty" ? "empty" : "not empty"
        }`}
        aria-live="polite"
        className="h-8 w-full rounded-lg border border-dashed border-input bg-transparent dark:bg-input/30"
      />
    );
  }

  switch (filter.variant) {
    case "text":
    case "number":
    case "range":
      if (filter.operator === "isBetween") {
        return (
          <DataTableRangeFilter
            filter={filter}
            column={column}
            inputId={inputId}
            onFilterUpdate={onFilterUpdate}
          />
        );
      }

      return (
        <Input
          id={inputId}
          type={filter.variant === "text" ? "text" : "number"}
          aria-label={`${columnMeta?.label ?? column.id} filter value`}
          inputMode={filter.variant === "text" ? undefined : "numeric"}
          placeholder={columnMeta?.placeholder ?? "Enter a value..."}
          maxLength={filter.variant === "text" ? 200 : undefined}
          value={typeof filter.value === "string" ? filter.value : undefined}
          onChange={(event) => onFilterUpdate(filter.filterId, { value: event.target.value })}
        />
      );

    case "boolean":
      return <BooleanFilterValue {...props} />;

    case "select":
    case "multi-select":
      return <SelectFilterValue {...props} />;

    case "date":
    case "date-range":
      return <DateFilterValue {...props} />;

    default:
      return null;
  }
}

function BooleanFilterValue<TData extends RowData>({
  filter,
  column,
  inputId,
  open,
  onOpenChange,
  onFilterUpdate,
}: FilterValueInputProps<TData>) {
  const dir = useDirection();
  const listboxId = `${inputId}-listbox`;

  return (
    <Select
      open={open}
      onOpenChange={onOpenChange}
      value={typeof filter.value === "string" ? filter.value : null}
      onValueChange={(value) => {
        if (value == null) return;
        onFilterUpdate(filter.filterId, { value });
      }}
    >
      <SelectTrigger
        id={inputId}
        aria-controls={listboxId}
        aria-label={`${column.columnDef.meta?.label ?? column.id} boolean filter`}
        className="w-full"
      >
        <SelectValue placeholder="Select value" />
      </SelectTrigger>
      <SelectContent dir={dir} id={listboxId}>
        <SelectGroup>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function SelectFilterValue<TData extends RowData>({
  filter,
  column,
  inputId,
  open,
  onOpenChange,
  onFilterUpdate,
}: FilterValueInputProps<TData>) {
  const dir = useDirection();
  const listboxId = `${inputId}-listbox`;
  const columnMeta = column.columnDef.meta;
  const multiple = filter.variant === "multi-select";

  return (
    <Faceted
      open={open}
      onOpenChange={onOpenChange}
      value={getSelectFilterValue(filter)}
      onValueChange={(value) => onFilterUpdate(filter.filterId, { value: value ?? "" })}
      items={getColumnSelectOptions(columnMeta)}
      multiple={multiple}
    >
      <FacetedTrigger
        render={
          <Button
            id={inputId}
            aria-controls={listboxId}
            aria-label={`${columnMeta?.label ?? column.id} filter value${multiple ? "s" : ""}`}
            variant="outline"
            className="w-full hover:bg-muted/50 aria-expanded:bg-background dark:aria-expanded:bg-input/30"
          />
        }
      >
        <FacetedValue
          placeholder={columnMeta?.placeholder ?? `Select option${multiple ? "s" : ""}...`}
        />
      </FacetedTrigger>
      <FacetedContent
        label={`Search ${columnMeta?.label ?? column.id} options`}
        dir={dir}
        id={listboxId}
        className="w-50"
      >
        <FacetedInput
          aria-label={`Search ${columnMeta?.label ?? column.id} options`}
          placeholder={columnMeta?.placeholder ?? "Search options..."}
        />
        <FacetedList>
          <FacetedEmpty>No options found.</FacetedEmpty>
          <FacetedGroup>
            {getColumnSelectOptions(columnMeta).map((option) => (
              <FacetedItem key={option.value} value={option.value} className="text-xs">
                {option.icon && <option.icon />}
                <span className="flex-1 truncate">{option.label}</span>
                <FacetedItemIndicator>{option.count}</FacetedItemIndicator>
              </FacetedItem>
            ))}
          </FacetedGroup>
        </FacetedList>
      </FacetedContent>
    </Faceted>
  );
}

function DateFilterValue<TData extends RowData>({
  filter,
  column,
  inputId,
  open,
  onOpenChange,
  onFilterUpdate,
}: FilterValueInputProps<TData>) {
  const dir = useDirection();
  const listboxId = `${inputId}-listbox`;
  const label = column.columnDef.meta?.label ?? column.id;
  const [startDate, endDate] = getFilterDates(filter.value);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={inputId}
            aria-controls={listboxId}
            aria-label={`${label} date filter`}
            variant="outline"
            className={cn("w-full justify-start text-start", !startDate && "text-muted-foreground")}
          />
        }
      >
        <CalendarIcon />
        <span className="truncate">{getDateFilterLabel(filter) ?? "Pick a date"}</span>
      </PopoverTrigger>
      <PopoverContent dir={dir} id={listboxId} align="start" className="w-auto p-0">
        {filter.operator === "isBetween" ? (
          <Calendar
            aria-label={`Select ${label} date range`}
            captionLayout="dropdown"
            mode="range"
            selected={startDate ? { from: startDate, to: endDate } : undefined}
            onSelect={(range) =>
              onFilterUpdate(filter.filterId, {
                value: range ? [getFilterDateValue(range.from), getFilterDateValue(range.to)] : [],
              })
            }
          />
        ) : (
          <Calendar
            aria-label={`Select ${label} date`}
            captionLayout="dropdown"
            mode="single"
            selected={startDate}
            onSelect={(date) => {
              onFilterUpdate(filter.filterId, {
                value: getFilterDateValue(date),
              });
              onOpenChange(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
