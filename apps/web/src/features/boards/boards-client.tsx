"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { indexErrorMessage } from "@/features/jobs/api";
import { useRefreshBoards } from "@/features/refresh/queries";
import { RefreshActivity } from "@/features/refresh/refresh-activity";
import { RefreshBatchFeedback } from "@/features/refresh/refresh-batch-feedback";
import { useRefreshActivity, useRefreshAllActivity } from "@/features/refresh/refresh-provider";

import { AddBoardForm } from "./add-board-form";
import { boardErrorMessage, listBoards } from "./api";
import { BoardRow } from "./board-row";
import { BoardsSkeleton } from "./boards-skeleton";
import { boardsQueryKey } from "./queries";

export function BoardsClient() {
  const refreshAll = useRefreshBoards();
  const refreshing = useRefreshActivity();
  const refreshingAll = useRefreshAllActivity();
  const [view, setView] = useState("active");
  const [announcement, setAnnouncement] = useState("");
  const [addingBoard, setAddingBoard] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const locatedBoard = useRef<string | null>(null);
  const query = useQuery({
    queryKey: boardsQueryKey,
    queryFn: listBoards,
    networkMode: "always",
    retry: false,
  });
  const boards = query.data?.filter(
    (board) => (board.archivedAt === null ? "active" : "archived") === view,
  );

  return (
    <Dialog
      open={addingBoard}
      onOpenChange={(open, details) => {
        if (!open && savingBoard) {
          details.cancel();
          return;
        }
        if (open) locatedBoard.current = null;
        setAddingBoard(open);
      }}
      onOpenChangeComplete={(open) => {
        if (!open && locatedBoard.current) {
          document.getElementById(`board-${locatedBoard.current}`)?.focus();
        }
      }}
    >
      <output className="sr-only">{announcement}</output>
      <Tabs
        value={view}
        onValueChange={(value) => {
          if (value === "active" || value === "archived") setView(value);
        }}
        className="gap-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <TabsList aria-label="Board views">
              <TabsTrigger id="active-boards-tab" value="active">
                Active
              </TabsTrigger>
              <TabsTrigger id="archived-boards-tab" value="archived">
                Archived
              </TabsTrigger>
            </TabsList>
            <RefreshActivity />
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                refreshing ||
                refreshAll.isPending ||
                !query.data?.some((board) => board.archivedAt === null)
              }
              onClick={() => refreshAll.mutate("manual")}
            >
              {refreshingAll ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
              )}
              Refresh all
            </Button>
            <DialogTrigger render={<Button type="button" />}>
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              New board
            </DialogTrigger>
          </div>
        </div>
        <RefreshBatchFeedback
          batch={refreshAll.isPending || refreshAll.isError ? undefined : refreshAll.data}
          onViewActive={
            view === "archived"
              ? () => {
                  setView("active");
                  document.getElementById("active-boards-tab")?.focus();
                }
              : undefined
          }
        />
        {refreshAll.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{indexErrorMessage(refreshAll.error)}</AlertDescription>
          </Alert>
        ) : null}
        {query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              {query.data ? "Couldn’t update the list" : "Couldn’t load your boards"}
            </AlertTitle>
            <AlertDescription>
              {boardErrorMessage(query.error)}
              {query.data ? " Your last loaded boards are still shown." : ""}
            </AlertDescription>
            <Button
              type="button"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
              className="mt-3 justify-self-start"
            >
              {query.isFetching ? "Trying again…" : "Try again"}
            </Button>
          </Alert>
        ) : null}
        <TabsContent
          value={view}
          aria-busy={query.isFetching}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-ring"
        >
          {query.isPending ? <BoardsSkeleton /> : null}
          {boards ? (
            boards.length > 0 ? (
              <ul
                className="flex min-w-0 flex-col gap-4"
                aria-label={`${view === "active" ? "Active" : "Archived"} boards`}
              >
                {boards.map((board) => (
                  <li key={board.id} className="min-w-0">
                    <BoardRow board={board} onStatus={setAnnouncement} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="min-h-40 border">
                <EmptyHeader>
                  <h3 className="font-medium">
                    {view === "active" ? "No active boards yet" : "No archived boards"}
                  </h3>
                </EmptyHeader>
                {view === "active" ? (
                  <DialogTrigger render={<Button type="button" variant="outline" />}>
                    <PlusIcon aria-hidden="true" data-icon="inline-start" />
                    Add your first board
                  </DialogTrigger>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setView("active")}>
                    View active boards
                  </Button>
                )}
              </Empty>
            )
          ) : null}
        </TabsContent>
      </Tabs>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={!savingBoard}
        initialFocus={() => document.getElementById("board-url")}
        finalFocus={() => locatedBoard.current === null}
      >
        <DialogHeader>
          <DialogTitle>Add a company board</DialogTitle>
          <DialogDescription className="sr-only">
            Paste an Ashby or Lever board URL and optionally choose a company name.
          </DialogDescription>
        </DialogHeader>
        <AddBoardForm
          onPendingChange={setSavingBoard}
          onSaved={(board, action) => {
            setView("active");
            setAnnouncement(`${board.displayName} ${action}.`);
            setSavingBoard(false);
            setAddingBoard(false);
          }}
          onLocate={(board) => {
            locatedBoard.current = board.id;
            setView(board.archived ? "archived" : "active");
            setAddingBoard(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
