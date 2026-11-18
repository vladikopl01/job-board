import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { AppBadge } from "@/components/app-badge";
import type { DataTableFeatures } from "@/lib/data-table-features";
import type { Board } from "./schemas";
import { ProviderBadge } from "./provider-badge";

export const boardColumns: ColumnDef<DataTableFeatures, Board>[] = [
  {
    id: "displayName",
    accessorKey: "displayName",
    size: 260,
    enableHiding: false,
    enableColumnFilter: true,
    meta: { label: "Company", variant: "text" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Company" />,
    cell: ({ row }) => (
      <h3 className="truncate font-medium">
        <Link
          data-row-link
          href={`/boards/${row.id}${row.original.archivedAt ? "?view=history" : ""}`}
          title={row.original.displayName}
          className="rounded-sm outline-ring hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {row.original.displayName}
        </Link>
      </h3>
    ),
  },
  {
    id: "provider",
    accessorKey: "provider",
    size: 130,
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
  {
    id: "canonicalUrl",
    accessorKey: "canonicalUrl",
    size: 300,
    enableSorting: false,
    enableColumnFilter: true,
    meta: { label: "Source URL", variant: "text" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Source URL" />,
    cell: ({ row }) => (
      <a
        href={row.original.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={row.original.canonicalUrl}
        className="flex min-w-0 items-center gap-1.5 rounded-sm text-primary underline underline-offset-4 outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="truncate">{row.original.canonicalUrl}</span>
        <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ),
  },
  {
    id: "lastSuccessfulRefreshAt",
    accessorKey: "lastSuccessfulRefreshAt",
    size: 170,
    meta: { label: "Last refreshed" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Last refreshed" />,
    cell: ({ row }) =>
      row.original.lastSuccessfulRefreshAt ? (
        <time dateTime={row.original.lastSuccessfulRefreshAt}>
          {new Date(row.original.lastSuccessfulRefreshAt).toLocaleString()}
        </time>
      ) : (
        "Not refreshed yet"
      ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    size: 140,
    meta: { label: "Added" },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Added" />,
    cell: ({ row }) => (
      <time dateTime={row.original.createdAt}>
        {new Date(row.original.createdAt).toLocaleDateString()}
      </time>
    ),
  },
  {
    id: "status",
    accessorFn: (board) => (board.archivedAt ? "archived" : "active"),
    size: 120,
    enableSorting: false,
    enableColumnFilter: true,
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
    },
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => (
      <AppBadge variant={row.original.archivedAt ? "muted" : "success"}>
        {row.original.archivedAt ? "Archived" : "Active"}
      </AppBadge>
    ),
  },
];
