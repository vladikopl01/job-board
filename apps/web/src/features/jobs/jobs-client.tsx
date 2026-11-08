"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyHeader } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshActivity } from "@/features/refresh/refresh-activity";

import { indexErrorMessage, localRequest } from "./api";
import { locationSummary, workplaceLabel } from "./labels";
import { JobsSkeleton } from "./jobs-skeleton";
import { jobAvailability, jobListResponseSchema } from "./schemas";

const listParsers = {
  view: parseAsStringLiteral(["open", "history"]).withDefault("open"),
  page: parseAsInteger.withDefault(1),
};

export function JobsClient() {
  const [input, setInput] = useQueryStates(listParsers);
  const page = Math.min(1_000_000, Math.max(1, input.page));
  const query = useQuery({
    queryKey: ["jobs", "list", input.view, page],
    queryFn: ({ signal }) =>
      localRequest(jobListResponseSchema, `/api/jobs?view=${input.view}&page=${page}`, { signal }),
    // Keep pagination controls mounted, but never show Open results under History.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === input.view ? previous : undefined,
  });
  const resolvedPage = query.isPlaceholderData ? undefined : query.data?.page;
  useEffect(() => {
    if (resolvedPage !== undefined && resolvedPage !== input.page)
      void setInput({ page: resolvedPage });
  }, [resolvedPage, input.page, setInput]);

  return (
    <Tabs
      value={input.view}
      onValueChange={(view) => {
        if (view === "open" || view === "history") void setInput({ view, page: 1 });
      }}
      className="gap-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <TabsList aria-label="Job views">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <RefreshActivity />
      </div>
      <TabsContent
        value={input.view}
        aria-busy={query.isFetching}
        className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-ring"
      >
        {query.isPending ? <JobsSkeleton history={input.view === "history"} /> : null}
        {query.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{indexErrorMessage(query.error)}</AlertDescription>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              Try again
            </Button>
          </Alert>
        ) : null}
        {query.data ? (
          <div className="flex min-w-0 flex-col gap-5">
            {query.data.jobs.length ? (
              <ul
                aria-label={`${input.view === "open" ? "Open" : "Historical"} jobs`}
                className="flex min-w-0 flex-col gap-3"
              >
                {query.data.jobs.map((job) => (
                  <li key={job.id}>
                    <article className="relative isolate flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-5 transition-colors hover:bg-muted/50 focus-within:bg-muted/50 motion-reduce:transition-none">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="min-w-0 text-lg font-semibold wrap-anywhere">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
                          >
                            {job.title}
                          </Link>
                        </h2>
                        <Badge variant="outline">
                          {job.provider === "ashby"
                            ? "Ashby"
                            : job.sourceHost === "jobs.eu.lever.co"
                              ? "Lever · EU"
                              : "Lever"}
                        </Badge>
                      </div>
                      <p>
                        <span className="text-muted-foreground">at </span>
                        <Link
                          href={`/boards/${job.boardId}`}
                          prefetch={false}
                          className="relative z-10 rounded-sm underline underline-offset-4 outline-ring wrap-anywhere hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4"
                        >
                          {job.company}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground wrap-anywhere">
                        {[
                          locationSummary(job.locations),
                          ...(job.workplaceType === "unknown"
                            ? []
                            : [workplaceLabel(job.workplaceType)]),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {input.view === "history" ? (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{jobAvailability(job)}</Badge>
                          {job.boardArchivedAt && job.unavailableReason ? (
                            <Badge variant="outline">Board archived</Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="min-h-40 border">
                <EmptyHeader>
                  <h2 className="font-medium">
                    {input.view === "history"
                      ? "No posting history yet"
                      : query.data.boardCount === 0
                        ? "Add a board to get started"
                        : query.data.indexedBoardCount === 0
                          ? "No indexed jobs yet"
                          : "No open jobs in your index"}
                  </h2>
                </EmptyHeader>
                <Link href="/boards" className={cn(buttonVariants({ variant: "outline" }))}>
                  {query.data.boardCount === 0 ? "Add a board" : "Manage boards"}
                </Link>
              </Empty>
            )}
            {query.data.total > query.data.pageSize ? (
              <nav
                aria-label="Job pages"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <Button
                  variant="outline"
                  focusableWhenDisabled
                  className="aria-disabled:opacity-50"
                  disabled={query.data.page <= 1 || query.isFetching}
                  onClick={() => void setInput({ page: query.data.page - 1 })}
                >
                  Previous
                </Button>
                <output aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
                  Page {query.data.page} of {Math.ceil(query.data.total / query.data.pageSize)}
                </output>
                <Button
                  variant="outline"
                  focusableWhenDisabled
                  className="aria-disabled:opacity-50"
                  disabled={
                    query.data.page * query.data.pageSize >= query.data.total || query.isFetching
                  }
                  onClick={() => void setInput({ page: query.data.page + 1 })}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </div>
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
