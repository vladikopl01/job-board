import type { ReactTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { handleCollectionRowClick } from "@/components/collection/row-navigation";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { VirtualCollection } from "@/components/collection/virtual-collection";

import type { CollectionLayout } from "@/components/collection/collection-views";
import { JobCard } from "./job-card";
import { JobColumnContext } from "./job-columns";
import { type JobListItem } from "./schemas";

type JobsCollectionProps = {
  jobs: JobListItem[];
  table: ReactTable<DataTableFeatures, JobListItem, unknown>;
  inbox: boolean;
  layout: CollectionLayout;
  history: boolean;
  label: string;
  selecting: boolean;
  selectedIds: string[];
  selectionDisabled: boolean;
  readPending: boolean;
  activeId: string | null;
  postingHref: (id: string) => string;
  onOpen: (id: string) => void;
  onSelect: (id: string) => void;
  onRead: (job: JobListItem) => void;
};

// One confirmed result set supplies all three layouts, including selection and reader links.
export function JobsCollection(props: JobsCollectionProps) {
  if (props.layout === "table")
    return (
      <JobColumnContext
        value={{
          selectedIds: props.selectedIds,
          disabled: props.selectionDisabled,
          readPending: props.readPending,
          postingHref: props.postingHref,
          onOpen: props.onOpen,
          onRead: props.onRead,
          onSelect: props.onSelect,
        }}
      >
        <DataTable
          table={props.table}
          aria-label={props.label}
          pagination={null}
          activeRowId={props.activeId}
          getRowProps={(job) => ({
            id: `posting-${job.id}`,
            "data-posting-id": job.id,
            "aria-current": props.activeId === job.id ? "true" : undefined,
            className: "cursor-pointer",
            onClick: (event) =>
              handleCollectionRowClick(
                event,
                props.selecting
                  ? () => {
                      if (!props.selectionDisabled) props.onSelect(job.id);
                    }
                  : undefined,
              ),
          })}
          className="min-w-0"
        />
      </JobColumnContext>
    );
  return (
    <VirtualCollection
      items={props.jobs}
      cards={props.layout === "cards"}
      label={props.label}
      estimateSize={props.layout === "cards" ? 196 : 164}
      activeId={props.activeId}
    >
      {(job) => (
        <JobCard
          job={job}
          presentation={props.layout === "cards" ? "card" : "list"}
          showReadStatus={!props.inbox}
          history={props.history}
          active={props.activeId === job.id}
          href={props.postingHref(job.id)}
          onOpen={() => props.onOpen(job.id)}
          selection={
            props.selecting
              ? {
                  selected: props.selectedIds.includes(job.id),
                  disabled: props.selectionDisabled,
                  onSelect: () => props.onSelect(job.id),
                }
              : null
          }
          readPending={props.readPending}
          onRead={() => props.onRead(job)}
        />
      )}
    </VirtualCollection>
  );
}
