import { Button } from "@/components/ui/button";

import { useRefreshBatchStatus } from "./refresh-provider";
import type { RefreshBatch } from "./schemas";

export function RefreshBatchFeedback({
  batch,
  onViewActive,
}: {
  batch: RefreshBatch | undefined;
  onViewActive?: (() => void) | undefined;
}) {
  const result = useRefreshBatchStatus(batch);
  const summary = result
    ? [
        { count: result.failed, label: "failed to refresh" },
        { count: result.deferred, label: "waiting to retry" },
      ]
        .filter(({ count }) => count > 0)
        .map(({ count, label }) => `${count} ${count === 1 ? "board" : "boards"} ${label}`)
        .join(" · ")
    : "";

  return (
    <output
      aria-live="polite"
      className={
        summary
          ? "flex flex-wrap items-center gap-2 text-sm text-muted-foreground tabular-nums"
          : "sr-only"
      }
    >
      {result && summary ? (
        <>
          <span>{summary}.</span>
          <span>
            {result.retryAt ? (
              <>
                Next retry available after{" "}
                <time dateTime={result.retryAt}>{new Date(result.retryAt).toLocaleString()}</time>.
                Use Refresh all to retry.
              </>
            ) : (
              "Use Refresh on an active board to retry."
            )}
          </span>
          {result.failed && onViewActive ? (
            <Button type="button" variant="outline" onClick={onViewActive}>
              View active boards
            </Button>
          ) : null}
        </>
      ) : null}
    </output>
  );
}
