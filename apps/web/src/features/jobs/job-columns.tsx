import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import {
  countryOptions,
  departmentOptions,
  departmentsFor,
  geographyForLocations,
  regionOptions,
} from "@job-board/job-boards";
import { createContext, useContext, useMemo } from "react";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import type { Board } from "@/features/boards/schemas";
import { ProviderBadge } from "@/features/boards/provider-badge";
import { JobAvailabilityBadge, ReadStatusBadge } from "./job-badges";
import { CompanyLink } from "./company-link";
import { ApplyLink } from "./apply-link";
import { PostingLink } from "./posting-link";
import { locationSummary, workplaceLabel } from "./labels";
import { ReadStateButton } from "./read-state-controls";
import type { JobListItem } from "./schemas";

const discoveryColumns = [
  {
    id: "country",
    label: "Country",
    options: countryOptions,
    values: (job: JobListItem) => geographyForLocations(job.locations).countries,
  },
  {
    id: "region",
    label: "Region",
    options: regionOptions,
    values: (job: JobListItem) => geographyForLocations(job.locations).regions,
  },
  {
    id: "department",
    label: "Department",
    options: departmentOptions,
    values: (job: JobListItem) => departmentsFor(job),
  },
].map<ColumnDef<DataTableFeatures, JobListItem>>(({ id, label, options, values }) => {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  return {
    id,
    accessorFn: values,
    size: 180,
    enableSorting: false,
    enableColumnFilter: true,
    meta: { label, variant: "select", options },
    header: ({ column }) => <DataTableColumnHeader column={column} label={label} />,
    cell: ({ row }) => {
      const summary =
        values(row.original)
          .map((value) => labels.get(value) ?? value)
          .join(", ") || "Unknown";
      return (
        <span className="block truncate" title={summary}>
          {summary}
        </span>
      );
    },
  };
});

type JobColumnActions = {
  selectedIds: string[];
  disabled: boolean;
  readPending: boolean;
  postingHref: (id: string) => string;
  onOpen: (id: string) => void;
  onRead: (job: JobListItem) => void;
  onSelect: (id: string) => void;
};

export const JobColumnContext = createContext<JobColumnActions | null>(null);

function useJobColumnActions() {
  const actions = useContext(JobColumnContext);
  if (!actions) throw new Error("Job table cells require JobColumnContext.");
  return actions;
}

function SelectionHeader({ table }: { table: Table<DataTableFeatures, JobListItem> }) {
  const { selectedIds, disabled } = useJobColumnActions();
  const rows = table.getRowModel().rows;
  const count = rows.filter((row) => selectedIds.includes(row.id)).length;
  return (
    <Checkbox
      aria-label="Select all jobs on this page"
      checked={rows.length > 0 && count === rows.length}
      indeterminate={count > 0 && count < rows.length}
      disabled={disabled}
      onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)}
    />
  );
}

function SelectionCell({ row }: { row: Row<DataTableFeatures, JobListItem> }) {
  const { selectedIds, disabled, onSelect } = useJobColumnActions();
  return (
    <Checkbox
      data-job-select
      aria-label={`Select ${row.original.title} at ${row.original.company}`}
      checked={selectedIds.includes(row.id)}
      disabled={disabled}
      onCheckedChange={() => onSelect(row.id)}
    />
  );
}

function PostingCell({ job }: { job: JobListItem }) {
  const { postingHref, onOpen } = useJobColumnActions();
  return (
    <h2 className="truncate font-medium" title={job.title}>
      <PostingLink
        href={postingHref(job.id)}
        onOpen={() => onOpen(job.id)}
        className="rounded-sm outline-ring hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {job.title || "Untitled posting"}
      </PostingLink>
    </h2>
  );
}

function JobActionsCell({ job }: { job: JobListItem }) {
  const { readPending, onRead } = useJobColumnActions();
  return (
    <div className="flex items-center justify-end gap-2">
      <ReadStateButton
        iconOnly
        readAt={job.readAt}
        disabled={readPending}
        onClick={() => onRead(job)}
      />
      <ApplyLink applyUrl={job.applyUrl} iconOnly />
    </div>
  );
}

export function useJobColumns({
  boards,
  fixedBoard,
  inbox,
}: {
  boards: Board[];
  fixedBoard: boolean;
  inbox: boolean;
}): ColumnDef<DataTableFeatures, JobListItem>[] {
  // Dynamic actions live in context so reader/read-state updates never replace renderers.
  return useMemo<ColumnDef<DataTableFeatures, JobListItem>[]>(
    () => [
      {
        id: "select",
        size: 32,
        minSize: 32,
        maxSize: 32,
        enableHiding: false,
        enableResizing: false,
        enableSorting: false,
        enablePinning: false,
        header: ({ table }) => <SelectionHeader table={table} />,
        cell: ({ row }) => <SelectionCell row={row} />,
      },
      {
        id: "title",
        accessorKey: "title",
        size: 360,
        enableHiding: false,
        enableColumnFilter: true,
        meta: { label: "Job", variant: "text" },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Job" />,
        cell: ({ row }) => <PostingCell job={row.original} />,
      },
      {
        id: "company",
        accessorKey: "company",
        size: 180,
        enableColumnFilter: true,
        meta: { label: "Company", variant: "text" },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Company" />,
        cell: ({ row }) => (
          <div className="truncate" title={row.original.company}>
            <CompanyLink job={row.original} presentation="button" />
          </div>
        ),
      },
      {
        id: "boardId",
        accessorKey: "boardId",
        size: 180,
        enableSorting: false,
        enableColumnFilter: !fixedBoard,
        meta: {
          label: "Board",
          variant: "select",
          options: boards.map((board) => ({ value: board.id, label: board.displayName })),
        },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Board" />,
        cell: ({ row }) => <span className="block truncate">{row.original.company}</span>,
      },
      {
        id: "locations",
        accessorFn: (job) => job.locations.map((location) => location.text).join(", "),
        size: 220,
        enableSorting: false,
        enableColumnFilter: true,
        meta: { label: "Location", variant: "text" },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Location" />,
        cell: ({ row }) => (
          <span
            className="block truncate"
            title={row.original.locations.map((location) => location.text).join(", ")}
          >
            {locationSummary(row.original.locations, 1) || "Not specified"}
          </span>
        ),
      },
      {
        id: "workplaceType",
        accessorKey: "workplaceType",
        size: 130,
        enableColumnFilter: true,
        meta: {
          label: "Workplace",
          variant: "select",
          options: ["remote", "hybrid", "on-site", "unknown"].map((value) => ({
            value,
            label: value === "on-site" ? "On-site" : value.charAt(0).toUpperCase() + value.slice(1),
          })),
        },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Workplace" />,
        cell: ({ row }) => workplaceLabel(row.original.workplaceType),
      },
      ...discoveryColumns,
      {
        id: "provider",
        accessorKey: "provider",
        size: 110,
        enableColumnFilter: true,
        meta: {
          label: "Provider",
          variant: "select",
          options: [
            { value: "ashby", label: "Ashby" },
            { value: "lever", label: "Lever" },
          ],
        },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Provider" />,
        cell: ({ row }) => (
          <ProviderBadge provider={row.original.provider} sourceHost={row.original.sourceHost} />
        ),
      },
      ...(!inbox
        ? [
            {
              id: "readStatus",
              accessorFn: (job: JobListItem) => (job.readAt ? "read" : "unread"),
              size: 110,
              enableSorting: false,
              enableColumnFilter: true,
              meta: {
                label: "Read status",
                variant: "select",
                options: [
                  { value: "unread", label: "Unread" },
                  { value: "read", label: "Read" },
                ],
              },
              header: ({ column }) => <DataTableColumnHeader column={column} label="Read status" />,
              cell: ({ row }) => <ReadStatusBadge readAt={row.original.readAt} />,
            } satisfies ColumnDef<DataTableFeatures, JobListItem>,
            {
              id: "availability",
              accessorFn: (job: JobListItem) =>
                job.unavailableAt || job.boardArchivedAt ? "history" : "open",
              size: 140,
              enableSorting: false,
              enableColumnFilter: true,
              meta: {
                label: "Availability",
                variant: "select",
                options: [
                  { value: "open", label: "Open" },
                  { value: "history", label: "History" },
                ],
              },
              header: ({ column }) => (
                <DataTableColumnHeader column={column} label="Availability" />
              ),
              cell: ({ row }) => <JobAvailabilityBadge job={row.original} />,
            } satisfies ColumnDef<DataTableFeatures, JobListItem>,
          ]
        : []),
      {
        id: "firstSeenAt",
        accessorKey: "firstSeenAt",
        size: 140,
        meta: { label: "Discovered" },
        header: ({ column }) => <DataTableColumnHeader column={column} label="Discovered" />,
        cell: ({ row }) => (
          <time dateTime={row.original.firstSeenAt}>
            {new Date(row.original.firstSeenAt).toLocaleDateString()}
          </time>
        ),
      },
      {
        id: "actions",
        size: 80,
        minSize: 80,
        maxSize: 80,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <JobActionsCell job={row.original} />,
      },
    ],
    [boards, fixedBoard, inbox],
  );
}
