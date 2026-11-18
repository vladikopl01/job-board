"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CircleAlertIcon, InboxIcon, PanelsTopLeftIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { listBoards } from "@/features/boards/api";
import { boardsQueryKey } from "@/features/boards/queries";
import { localRequest } from "@/features/jobs/api";
import { useUnreadCount } from "@/features/jobs/queries";
import { refreshesQueryKey } from "@/features/refresh/queries";
import { refreshesResponseSchema } from "@/features/refresh/schemas";

export function DashboardClient() {
  const boards = useQuery({ queryKey: boardsQueryKey, queryFn: listBoards });
  const unread = useUnreadCount();
  const refreshes = useQuery({
    queryKey: refreshesQueryKey,
    queryFn: ({ signal }) => localRequest(refreshesResponseSchema, "/api/refreshes", { signal }),
  });
  const active = boards.data?.filter((board) => !board.archivedAt);
  const attention = refreshes.data?.refreshes.filter(
    (task) =>
      active?.some((board) => board.id === task.boardId) &&
      (task.state === "failed" || task.state === "interrupted"),
  );
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your search at a glance, with a clear place to continue.
        </p>
      </header>
      <dl className="grid gap-6 border-y py-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <InboxIcon aria-hidden="true" className="size-4" />
            Jobs to review
          </dt>
          <dd>
            {unread.isPending ? (
              <Skeleton className="h-9 w-16" />
            ) : unread.data ? (
              <span className="text-3xl font-semibold tabular-nums">{unread.data.unreadCount}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Count unavailable</span>
            )}
          </dd>
          {unread.isError ? (
            <Alert>
              <AlertDescription>Couldn’t update the unread count.</AlertDescription>
              <Button variant="outline" onClick={() => void unread.refetch()}>
                Retry unread count
              </Button>
            </Alert>
          ) : null}
          <Link
            href="/inbox"
            className={buttonVariants({ variant: "secondary", className: "w-fit" })}
          >
            Review Inbox
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <PanelsTopLeftIcon aria-hidden="true" className="size-4" />
            Active boards
          </dt>
          <dd>
            {boards.isPending ? (
              <Skeleton className="h-9 w-16" />
            ) : active ? (
              <span className="text-3xl font-semibold tabular-nums">{active.length}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Boards unavailable</span>
            )}
          </dd>
          {boards.isError ? (
            <Alert>
              <AlertDescription>Couldn’t load your boards.</AlertDescription>
              <Button variant="outline" onClick={() => void boards.refetch()}>
                Retry boards
              </Button>
            </Alert>
          ) : null}
          <Link
            href="/boards"
            className={buttonVariants({ variant: "secondary", className: "w-fit" })}
          >
            Manage boards
            <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      </dl>
      {boards.data?.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <h2 className="font-semibold">Start with a company you’d like to join</h2>
            <EmptyDescription>
              Add its Ashby or Lever board to start collecting jobs locally.
            </EmptyDescription>
          </EmptyHeader>
          <Link href="/boards" className={buttonVariants()}>
            Add your first board
          </Link>
        </Empty>
      ) : null}
      <section className="flex flex-col gap-4" aria-labelledby="source-health">
        <h2 id="source-health" className="text-lg font-semibold">
          Source health
        </h2>
        {refreshes.isPending || boards.isPending ? <Skeleton className="h-16 w-full" /> : null}
        {refreshes.isError ? (
          <Alert>
            <AlertDescription>Refresh status is unavailable.</AlertDescription>
            <Button variant="outline" onClick={() => void refreshes.refetch()}>
              Retry refresh status
            </Button>
          </Alert>
        ) : null}
        {boards.isSuccess && refreshes.isSuccess && attention?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No refresh failures reported for your active boards.
          </p>
        ) : null}
        {attention?.length ? (
          <ul className="divide-y border-y">
            {attention.map((task) => {
              const board = active?.find((item) => item.id === task.boardId);
              return board ? (
                <li key={task.id} className="flex flex-wrap items-center gap-3 py-4">
                  <CircleAlertIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/boards/${board.id}`}
                      className="rounded-sm font-medium underline underline-offset-4 outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                      {board.displayName}
                    </Link>
                    <p className="text-sm text-muted-foreground wrap-anywhere">
                      {task.errorMessage ??
                        "The last refresh did not finish. Open the board to retry."}
                    </p>
                  </div>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pick up a previous search</h2>
        <p className="text-sm text-muted-foreground">
          Jobs keeps read postings and retained history available beyond your Inbox.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs?readStatus=read" className={buttonVariants({ variant: "secondary" })}>
            Previously read jobs
          </Link>
          <Link href="/jobs?view=history" className={buttonVariants({ variant: "secondary" })}>
            Posting history
          </Link>
        </div>
      </section>
    </div>
  );
}
