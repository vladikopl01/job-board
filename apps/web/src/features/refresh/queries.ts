import { useMutation, useQueryClient } from "@tanstack/react-query";

import { jsonMutation, localRequest } from "@/features/jobs/api";

import { refreshAcceptedSchema, refreshBatchSchema } from "./schemas";

export const refreshesQueryKey = ["refreshes"];
export const refreshAllMutationKey = [...refreshesQueryKey, "all"];

export function useRefreshBoards() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: refreshAllMutationKey,
    // Keep batch task identities across navigation, including long-running queues.
    gcTime: Infinity,
    mutationFn: (source: "app-visit" | "manual") =>
      localRequest(refreshBatchSchema, "/api/refreshes", {
        ...jsonMutation(),
        body: JSON.stringify({ source }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: refreshesQueryKey }),
  });
}

export function useRefreshBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: [...refreshesQueryKey, "board"],
    mutationFn: (id: string) =>
      localRequest(refreshAcceptedSchema, `/api/boards/${id}/refresh`, jsonMutation()),
    onSuccess: () => client.invalidateQueries({ queryKey: refreshesQueryKey }),
  });
}
