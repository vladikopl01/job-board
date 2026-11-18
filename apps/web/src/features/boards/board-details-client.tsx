"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotFoundContent } from "@/components/not-found-content";
import { JobsClient } from "@/features/jobs/jobs-client";

import { listBoards, boardErrorMessage } from "./api";
import { BoardRow } from "./board-row";
import { BoardsSkeleton } from "./boards-skeleton";
import { boardsQueryKey } from "./queries";

export function BoardDetailsClient({ id }: { id: string }) {
  const [announcement, setAnnouncement] = useState("");
  const query = useQuery({ queryKey: boardsQueryKey, queryFn: listBoards });
  const board = query.data?.find((item) => item.id === id);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {query.isPending ? <BoardsSkeleton /> : null}
      {query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{boardErrorMessage(query.error)}</AlertDescription>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </Alert>
      ) : null}
      {query.isSuccess && !board ? (
        <NotFoundContent
          title="Board not found"
          description="This board isn’t in your local workspace. Choose one of your tracked boards to continue."
        />
      ) : null}
      {board ? (
        <>
          <BoardRow board={board} presentation="detail" onStatus={setAnnouncement} />
          {board.archivedAt ? (
            <Alert>
              <AlertDescription>
                This board is archived. Its retained postings are available in History.
              </AlertDescription>
            </Alert>
          ) : null}
          <section className="flex min-w-0 flex-col gap-4" aria-label="Board jobs">
            <h2 className="text-lg font-semibold">Jobs</h2>
            <JobsClient boardId={board.id} defaultView={board.archivedAt ? "history" : "open"} />
          </section>
        </>
      ) : null}
    </div>
  );
}
