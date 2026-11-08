"use client";

import { useIsMutating, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { indexErrorMessage, localRequest } from "@/features/jobs/api";

import { refreshAllMutationKey, refreshesQueryKey, useRefreshBoards } from "./queries";
import {
  refreshBatchSchema,
  refreshesResponseSchema,
  refreshPending,
  type RefreshBatch,
  type RefreshSummary,
} from "./schemas";

const RefreshContext = createContext<RefreshSummary[]>([]);

export function useBoardRefreshStatus(boardId: string) {
  return useContext(RefreshContext).find((task) => task.boardId === boardId);
}

export function useRefreshBatchStatus(batch: RefreshBatch | undefined) {
  const refreshes = useContext(RefreshContext);
  if (!batch) return;
  const accepted = batch.results.filter((result) => result.kind === "accepted");
  const tasks = refreshes.filter((task) => accepted.some((result) => result.taskId === task.id));
  if (tasks.length !== accepted.length || tasks.some(refreshPending)) return;
  const deferred = batch.results.filter((result) => result.kind === "deferred");
  const succeeded = tasks.filter((task) => task.state === "succeeded").length;
  const retryAt = [...tasks, ...deferred]
    .flatMap((result) => (result.retryAt ? [result.retryAt] : []))
    .sort()[0];
  return { succeeded, failed: tasks.length - succeeded, deferred: deferred.length, retryAt };
}

export function useRefreshActivity() {
  const refreshes = useContext(RefreshContext);
  const scheduling = useIsMutating({ mutationKey: refreshesQueryKey });
  return scheduling > 0 || refreshes.some(refreshPending);
}

export function useRefreshAllActivity() {
  const refreshes = useContext(RefreshContext);
  const scheduling = useIsMutating({ mutationKey: refreshAllMutationKey });
  const batches = useMutationState({
    filters: { mutationKey: refreshAllMutationKey, status: "success" },
    select: (mutation) => {
      const batch = refreshBatchSchema.safeParse(mutation.state.data);
      return batch.success
        ? batch.data.results.flatMap((result) =>
            result.kind === "accepted" ? [result.taskId] : [],
          )
        : [];
    },
  });
  const taskIds = new Set(batches.flat());
  return scheduling > 0 || refreshes.some((task) => taskIds.has(task.id) && refreshPending(task));
}

export function RefreshProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const started = useRef(false);
  const observed = useRef(new Map<string, string>());
  const tasks = useQuery({
    queryKey: refreshesQueryKey,
    queryFn: ({ signal }) => localRequest(refreshesResponseSchema, "/api/refreshes", { signal }),
    refetchInterval: (query) => (query.state.data?.refreshes.some(refreshPending) ? 1000 : false),
  });
  const { mutate: requestVisit, error, isPending } = useRefreshBoards();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    requestVisit("app-visit");
  }, [requestVisit]);

  useEffect(() => {
    let changed = false;
    for (const task of tasks.data?.refreshes ?? []) {
      const identity = `${task.id}:${task.state}`;
      if (!refreshPending(task) && observed.current.get(task.boardId) !== identity) changed = true;
      observed.current.set(task.boardId, identity);
    }
    if (changed) {
      void client.invalidateQueries({ queryKey: ["boards"] });
      void client.invalidateQueries({ queryKey: ["jobs"] });
    }
  }, [client, tasks.data]);

  return (
    <RefreshContext value={tasks.data?.refreshes ?? []}>
      {error || tasks.isError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>
            {error ? indexErrorMessage(error) : "Refresh status is unavailable."}
          </AlertDescription>
          <Button
            variant="outline"
            disabled={isPending || tasks.isFetching}
            onClick={() => (error ? requestVisit("app-visit") : void tasks.refetch())}
          >
            Try again
          </Button>
        </Alert>
      ) : null}
      {children}
    </RefreshContext>
  );
}
