"use client";

import { RotateCwIcon } from "lucide-react";

import { AppBadge } from "@/components/app-badge";
import { Button } from "@/components/ui/button";

import { useUnreadCount } from "./queries";

export function UnreadCount() {
  const query = useUnreadCount();
  const count = query.data?.unreadCount;
  if (count === undefined) return null;
  const knownLabel = `${count} unread ${count === 1 ? "job" : "jobs"}`;
  const label = query.isError ? `${knownLabel} (last known; count unavailable)` : knownLabel;
  return (
    <AppBadge variant="counter" className="tabular-nums" aria-label={label} title={label}>
      {count}
    </AppBadge>
  );
}

export function UnreadCountRetry() {
  const query = useUnreadCount();
  return query.isError ? (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Retry unread count"
      title="Unread count unavailable. Retry"
      disabled={query.isFetching}
      onClick={() => void query.refetch()}
    >
      <RotateCwIcon aria-hidden="true" />
    </Button>
  ) : null;
}
