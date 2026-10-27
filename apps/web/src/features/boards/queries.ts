import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { BoardApiError, createBoard, suggestBoardName, updateBoard } from "./api";
import type { Board } from "./schemas";

export const boardsQueryKey = ["boards"];

export function useBoardNameSuggestion({
  canonicalUrl,
  enabled,
}: {
  canonicalUrl: string;
  enabled: boolean;
}) {
  const [settledUrl, setSettledUrl] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettledUrl(canonicalUrl), 400);
    return () => clearTimeout(timer);
  }, [canonicalUrl]);

  return useQuery({
    queryKey: ["board-name", canonicalUrl],
    queryFn: ({ signal }) => suggestBoardName({ url: canonicalUrl, signal }),
    enabled: enabled && Boolean(canonicalUrl) && canonicalUrl === settledUrl,
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

async function saveConfirmedBoard(client: QueryClient, board: Board) {
  await client.cancelQueries({ queryKey: boardsQueryKey });
  client.setQueryData<Board[]>(boardsQueryKey, (current) =>
    current
      ?.filter((item) => item.id !== board.id)
      .concat(board)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)),
  );
  await client.invalidateQueries({ queryKey: boardsQueryKey });
}

export function useCreateBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createBoard,
    networkMode: "always",
    retry: false,
    onSuccess: (board) => saveConfirmedBoard(client, board),
    onError: async (error) => {
      if (error instanceof BoardApiError && error.detail.code === "DUPLICATE_BOARD") {
        await client.invalidateQueries({ queryKey: boardsQueryKey });
      }
    },
  });
}

export function useUpdateBoard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateBoard,
    networkMode: "always",
    retry: false,
    onSuccess: (board) => saveConfirmedBoard(client, board),
  });
}
