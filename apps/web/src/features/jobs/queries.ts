import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import { jsonMutation, localRequest } from "./api";
import {
  jobResponseSchema,
  jobListResponseSchema,
  readStateResponseSchema,
  unreadCountSchema,
  type ReadStateInput,
} from "./schemas";

const readStateMutationKey = ["jobs", "read-state"];

export function useUnreadCount() {
  return useQuery({
    queryKey: ["jobs", "unread-count"],
    queryFn: ({ signal }) => localRequest(unreadCountSchema, "/api/jobs/unread-count", { signal }),
  });
}

export function useReadStatePending() {
  return useIsMutating({ mutationKey: readStateMutationKey }) > 0;
}

export function useSetReadState() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: readStateMutationKey,
    scope: { id: "job-read-state" },
    mutationFn: (input: ReadStateInput) =>
      localRequest(readStateResponseSchema, "/api/jobs/read-state", {
        ...jsonMutation(),
        body: JSON.stringify(input),
      }),
    onMutate: () => client.cancelQueries({ queryKey: ["jobs"] }),
    onError: () => client.invalidateQueries({ queryKey: ["jobs"] }),
    onSuccess: async (result) => {
      await client.cancelQueries({ queryKey: ["jobs"] });
      for (const posting of result.postings) {
        client.setQueryData<z.infer<typeof jobResponseSchema>>(
          ["jobs", "detail", posting.id],
          (previous) =>
            previous ? { posting: { ...previous.posting, readAt: posting.readAt } } : undefined,
        );
      }
      client.setQueriesData<z.infer<typeof jobListResponseSchema>>(
        { queryKey: ["jobs", "list"] },
        (previous) =>
          previous
            ? {
                ...previous,
                jobs: previous.jobs.map((job) => {
                  const change = result.postings.find((posting) => posting.id === job.id);
                  return change ? { ...job, readAt: change.readAt } : job;
                }),
              }
            : undefined,
      );
      await client.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
