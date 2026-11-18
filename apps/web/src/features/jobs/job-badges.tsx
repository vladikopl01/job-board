import { AppBadge } from "@/components/app-badge";
import { jobAvailability, type JobListItem } from "./schemas";

export function ReadStatusBadge({ readAt }: Pick<JobListItem, "readAt">) {
  return <AppBadge variant={readAt ? "muted" : "unread"}>{readAt ? "Read" : "Unread"}</AppBadge>;
}

export function JobAvailabilityBadge({
  job,
}: {
  job: Pick<JobListItem, "unavailableReason" | "boardArchivedAt">;
}) {
  const label = jobAvailability(job);
  return <AppBadge variant={label === "Open" ? "success" : "muted"}>{label}</AppBadge>;
}
