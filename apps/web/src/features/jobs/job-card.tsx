import { cn } from "cn";
import { CheckIcon } from "lucide-react";

import { AppBadge } from "@/components/app-badge";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "@/features/boards/provider-badge";
import { CompanyLink } from "./company-link";
import { ApplyLink } from "./apply-link";
import { PostingLink } from "./posting-link";

import { locationSummary, workplaceLabel } from "./labels";
import { ReadStateButton } from "./read-state-controls";
import type { JobListItem } from "./schemas";
import { JobAvailabilityBadge, ReadStatusBadge } from "./job-badges";

export function JobCard({
  job,
  history,
  selection,
  readPending,
  onRead,
  href,
  active = false,
  onOpen,
  presentation = "list",
  showReadStatus = true,
}: {
  job: JobListItem;
  history: boolean;
  selection: { selected: boolean; disabled: boolean; onSelect: () => void } | null;
  readPending: boolean;
  onRead: () => void;
  href?: string;
  active?: boolean;
  onOpen?: () => void;
  presentation?: "list" | "card";
  showReadStatus?: boolean;
}) {
  return (
    <article
      data-posting-id={job.id}
      className={cn(
        "relative isolate flex h-full min-w-0 cursor-pointer flex-col rounded-xl border p-4 hover:bg-muted/50 [&_a]:scroll-mb-24 [&_button]:scroll-mb-24",
        presentation === "card" && "min-h-44",
        (selection?.selected || active) && "border-primary ring-1 ring-primary",
      )}
    >
      <Button
        variant="link"
        data-job-select
        aria-label={`Select ${job.title} at ${job.company}`}
        aria-pressed={selection?.selected ?? false}
        aria-hidden={!selection}
        inert={!selection}
        tabIndex={selection ? 0 : -1}
        focusableWhenDisabled
        disabled={selection?.disabled ?? true}
        onClick={selection?.onSelect}
        className={cn(
          "absolute inset-0 size-full rounded-xl transition-none active:not-aria-[haspopup]:translate-y-0",
          !selection && "pointer-events-none invisible",
        )}
      />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2",
          selection && "pointer-events-none relative",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate font-semibold" title={job.title}>
            <PostingLink
              href={href ?? `/jobs/${job.id}`}
              aria-current={active ? "true" : undefined}
              onOpen={onOpen}
              className={cn(
                "pointer-events-auto outline-none",
                selection
                  ? "relative z-10 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  : "after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring",
              )}
            >
              {job.title || "Untitled posting"}
            </PostingLink>
          </h2>
          <CheckIcon
            aria-hidden="true"
            className={cn("size-4 text-primary", !selection?.selected && "invisible")}
          />
        </div>
        <p className="truncate" title={job.company}>
          <span className="text-muted-foreground">at </span>
          <CompanyLink job={job} />
        </p>
        <p
          className="truncate text-sm text-muted-foreground"
          title={job.locations.map((location) => location.text).join(", ")}
        >
          {[
            locationSummary(job.locations, presentation === "card" ? 1 : 2) ||
              "Location not specified",
            ...(job.workplaceType === "unknown" ? [] : [workplaceLabel(job.workplaceType)]),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <ProviderBadge provider={job.provider} sourceHost={job.sourceHost} />
          {showReadStatus ? <ReadStatusBadge readAt={job.readAt} /> : null}
          {history ? <JobAvailabilityBadge job={job} /> : null}
          {history && job.boardArchivedAt && job.unavailableReason ? (
            <AppBadge variant="muted">Board archived</AppBadge>
          ) : null}
          <div className="pointer-events-auto relative z-10 ms-auto flex max-w-full items-center gap-2">
            <ReadStateButton
              iconOnly={presentation !== "list"}
              readAt={job.readAt}
              disabled={readPending}
              onClick={onRead}
            />
            <ApplyLink applyUrl={job.applyUrl} iconOnly={presentation !== "list"} />
          </div>
        </div>
      </div>
    </article>
  );
}
