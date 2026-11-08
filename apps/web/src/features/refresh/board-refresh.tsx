import { RefreshCwIcon } from "lucide-react";

import { RefreshedText } from "@/components/refreshed-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { indexErrorMessage } from "@/features/jobs/api";

import { useRefreshBoard } from "./queries";
import { useBoardRefreshStatus } from "./refresh-provider";
import { refreshPending, type RefreshResult } from "./schemas";

function refreshResult(task: RefreshResult) {
  const added = task.newCount;
  const updated = task.updatedCount;
  const unavailable = task.unavailableCount;
  const cached = task.cachedCount;
  if (added + updated + unavailable === 0) return `Up to date · ${cached} cached`;
  return [
    { count: added, label: "added" },
    { count: cached, label: "cached" },
    { count: updated, label: "updated" },
    { count: unavailable, label: "unavailable" },
  ]
    .filter(({ count }) => count > 0)
    .map(({ count, label }) => `${count} ${label}`)
    .join(" · ");
}

export function BoardRefreshButton({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const refresh = useRefreshBoard();
  const task = useBoardRefreshStatus(id);
  const pending = task ? refreshPending(task) : false;
  const busy = pending || refresh.isPending;
  const label =
    task?.state === "queued"
      ? "Queued…"
      : task?.state === "running" && task.phase === "confirming"
        ? "Confirming…"
        : busy
          ? "Refreshing…"
          : "Refresh";
  return (
    <div className="relative z-10 flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        aria-busy={busy}
        onClick={() => refresh.mutate(id)}
      >
        {busy ? (
          <Spinner aria-hidden="true" data-icon="inline-start" />
        ) : (
          <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {label} <span className="sr-only">{name}</span>
      </Button>
      <output className="sr-only" aria-live="polite">
        {busy ? `${name}: ${label}` : ""}
      </output>
      {refresh.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{indexErrorMessage(refresh.error)}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function BoardRefreshFeedback({
  id,
  lastSuccess,
}: {
  id: string;
  lastSuccess: string | null;
}) {
  const task = useBoardRefreshStatus(id);
  const result = task?.lastSuccessfulResult;
  const lastRefreshedAt = result?.finishedAt ?? lastSuccess;
  const failed = task?.state === "failed" || task?.state === "interrupted";
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground tabular-nums">
      <output aria-live="polite" className="min-h-5">
        {result ? (
          <RefreshedText revision={result.id}>{refreshResult(result)}</RefreshedText>
        ) : null}
      </output>
      {lastRefreshedAt ? (
        <span>
          Last refreshed{" "}
          <time dateTime={lastRefreshedAt}>
            <RefreshedText revision={result?.id ?? lastRefreshedAt}>
              {new Date(lastRefreshedAt).toLocaleString()}
            </RefreshedText>
          </time>
        </span>
      ) : (
        <span>Not indexed yet</span>
      )}
      {failed ? (
        <span role="alert">
          {task.errorMessage}{" "}
          {task.retryAt
            ? `Retry after ${new Date(task.retryAt).toLocaleString()}.`
            : "Use Refresh to retry."}
        </span>
      ) : null}
    </div>
  );
}
