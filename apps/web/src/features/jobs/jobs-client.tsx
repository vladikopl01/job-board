"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Toggle } from "@base-ui/react/toggle";
import { cn } from "cn";
import { CheckIcon, ListChecksIcon } from "lucide-react";
import Link from "next/link";
import {
  createSerializer,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useEffect, useRef, useState } from "react";

import { CollectionPagination } from "@/components/collection/collection-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { collectionLayouts, CollectionViews } from "@/components/collection/collection-views";
import { usePageFocus } from "@/components/collection/use-page-focus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyHeader } from "@/components/ui/empty";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import { useCollectionTable } from "@/components/collection/use-collection-table";
import {
  joinOperatorSchema,
  isActiveFilter,
  type CollectionFilterItem,
} from "@/components/collection/query-schema";
import { listBoards } from "@/features/boards/api";
import { boardsQueryKey } from "@/features/boards/queries";
import { availabilityFilter, jobFiltersSchema, jobSortsSchema } from "./collection-schema";
import { useJobColumns } from "./job-columns";

import { indexErrorMessage, localRequest } from "./api";
import { JobActionBar } from "./job-action-bar";
import { JobsCollection } from "./jobs-collection";
import { JobFilters } from "./job-filters";
import { JobReader } from "./job-reader";
import { JobsSkeleton } from "./jobs-skeleton";
import { useReadStatePending, useSetReadState } from "./queries";
import { ReadStateError } from "./read-state-controls";
import { jobListResponseSchema, readStatusFilterSchema, type ReadStateInput } from "./schemas";

const listParsers = {
  view: parseAsStringLiteral(["open", "history"]),
  readStatus: parseAsStringLiteral(readStatusFilterSchema.options).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(""),
  boardId: parseAsString.withDefault(""),
  job: parseAsString,
  layout: parseAsStringLiteral(collectionLayouts).withDefault("table"),
  pageSize: parseAsInteger.withDefault(50),
  filters: parseAsJson(jobFiltersSchema).withDefault([]),
  sort: parseAsJson(jobSortsSchema).withDefault([]),
  join: parseAsStringLiteral(joinOperatorSchema.options).withDefault("and"),
};
const viewLabels = { unread: "Unread", open: "Open", history: "Historical", all: "All" };

export function JobsClient({
  mode = "jobs",
  boardId: fixedBoardId,
  defaultView = "open",
}: {
  mode?: "inbox" | "jobs";
  boardId?: string;
  defaultView?: "open" | "history";
}) {
  const client = useQueryClient();
  const parsers = {
    ...listParsers,
    filters: listParsers.filters.withDefault(
      mode === "inbox" ? [] : [availabilityFilter(defaultView)],
    ),
  };
  const [input, setInput] = useQueryStates(parsers);
  const serialize = createSerializer(parsers);
  const propertyFilters =
    mode === "inbox"
      ? input.filters.filter((filter) => filter.id !== "availability")
      : [
          ...input.filters.filter((filter) => !input.view || filter.id !== "availability"),
          ...(input.view ? [availabilityFilter(input.view)] : []),
        ];
  const availability = propertyFilters.find(
    (filter) => filter.id === "availability" && filter.operator === "eq" && isActiveFilter(filter),
  );
  const availabilityValue =
    availability &&
    (Array.isArray(availability.value)
      ? availability.value.length === 1
        ? availability.value[0]
        : undefined
      : availability.value);
  const view =
    mode === "inbox"
      ? "unread"
      : input.join === "and" && (availabilityValue === "open" || availabilityValue === "history")
        ? availabilityValue
        : "all";
  const q = input.q.trim();
  const boardId = fixedBoardId ?? input.boardId;
  const page = Math.min(1_000_000, Math.max(1, input.page));
  const pageSize = input.pageSize === 10 || input.pageSize === 25 ? input.pageSize : 50;
  const readStatus = view === "open" ? input.readStatus : "all";
  const filters: CollectionFilterItem[] = [
    ...propertyFilters,
    ...(!fixedBoardId && boardId
      ? [
          {
            id: "boardId",
            filterId: "legacy-board",
            variant: "select",
            operator: "eq",
            value: boardId,
          } satisfies CollectionFilterItem,
        ]
      : []),
    ...(readStatus !== "all"
      ? [
          {
            id: "readStatus",
            filterId: "legacy-read",
            variant: "select",
            operator: "eq",
            value: readStatus,
          } satisfies CollectionFilterItem,
        ]
      : []),
  ];
  const readFilter = filters.find(
    (filter) => filter.id === "readStatus" && filter.operator === "eq" && isActiveFilter(filter),
  );
  const filterValue =
    readFilter && (Array.isArray(readFilter.value) ? readFilter.value[0] : readFilter.value);
  const displayReadStatus =
    input.join === "and" && (filterValue === "read" || filterValue === "unread")
      ? filterValue
      : readStatus;
  const querySuffix = JSON.stringify([filters, input.sort, input.join]);
  const scope = `${view}:${readStatus}:${page}:${q}:${boardId}:${pageSize}:${querySuffix}`;
  const queryKey = ["jobs", "list", view, readStatus, page, q, boardId, pageSize, querySuffix];
  const params = new URLSearchParams({
    view: mode === "inbox" ? "unread" : "all",
    page: String(page),
  });
  if (q) params.set("q", q);
  if (boardId) params.set("boardId", boardId);
  if (pageSize !== 50) params.set("pageSize", String(pageSize));
  if (filters.length) params.set("filters", JSON.stringify(filters));
  if (input.sort.length) params.set("sort", JSON.stringify(input.sort));
  if (input.join !== "and") params.set("join", input.join);
  const boards = useQuery({ queryKey: boardsQueryKey, queryFn: listBoards });
  const query = useQuery({
    queryKey,
    // Freeze membership during a review; successful writes still patch the row labels.
    enabled: !input.job || client.getQueryData(queryKey) === undefined,
    queryFn: ({ signal }) => localRequest(jobListResponseSchema, `/api/jobs?${params}`, { signal }),
    // Keep rows mounted while local filters and sorts resolve; writes stay disabled.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[6] === boardId &&
      (previousQuery.queryKey[2] === "unread") === (mode === "inbox")
        ? previous
        : undefined,
  });
  const resolvedPage = query.isPlaceholderData ? undefined : query.data?.page;
  useEffect(() => {
    if (resolvedPage !== undefined && resolvedPage !== input.page)
      void setInput({ page: resolvedPage });
  }, [resolvedPage, input.page, setInput]);

  const readState = useSetReadState();
  const [searchReset, setSearchReset] = useState(0);
  const readPending = useReadStatePending();
  const [selection, setSelection] = useState<{ scope: string; ids: string[] } | null>(null);
  const [actionScope, setActionScope] = useState(scope);
  const [announcement, setAnnouncement] = useState("");
  const returnToRow = useRef<string | null>(null);
  const listScroll = useRef<{ top: number; left: number } | null>(null);
  const previousJob = useRef(input.job);
  const modeButton = useRef<HTMLButtonElement>(null);
  const { results: panel, requestPageFocus } = usePageFocus({
    scope,
    pending: query.isPending || query.isFetching || query.isPlaceholderData,
  });
  const emptyHeading = useRef<HTMLHeadingElement>(null);
  const focusAfterWrite = useRef<{ element: Element; nextIds: string[] } | null>(null);
  const jobs = query.data?.jobs ?? [];
  const filtered = Boolean(
    q ||
    (!fixedBoardId && boardId) ||
    propertyFilters.some((filter) => filter.id !== "availability" && isActiveFilter(filter)),
  );
  const pathname = mode === "inbox" ? "/inbox" : fixedBoardId ? `/boards/${fixedBoardId}` : "/jobs";
  function postingHref(id: string) {
    return serialize(pathname, { ...input, job: id });
  }
  function openPosting(id: string) {
    if (!input.job) {
      const scroll = panel.current?.closest<HTMLElement>("[data-workspace-scroll]");
      listScroll.current = { top: scroll?.scrollTop ?? 0, left: scroll?.scrollLeft ?? 0 };
    }
    setSelection(null);
    void setInput({ job: id }, { history: "push", scroll: false });
  }
  function closeReader() {
    returnToRow.current = input.job;
    void setInput({ job: null }, { history: "push", scroll: false });
  }
  useEffect(() => {
    if (previousJob.current && !input.job && document.activeElement === document.body)
      returnToRow.current = previousJob.current;
    previousJob.current = input.job;
  }, [input.job]);
  useEffect(() => {
    if (input.job || query.isFetching || !returnToRow.current) return;
    const id = returnToRow.current;
    returnToRow.current = null;
    const link =
      panel.current?.querySelector<HTMLElement>(`[data-posting-id="${id}"] h2 a`) ??
      panel.current?.querySelector<HTMLElement>("h2 a");
    (link ?? emptyHeading.current ?? modeButton.current)?.focus({ preventScroll: true });
    if (listScroll.current) {
      panel.current
        ?.closest<HTMLElement>("[data-workspace-scroll]")
        ?.scrollTo({ ...listScroll.current, behavior: "instant" });
      listScroll.current = null;
    }
  }, [input.job, query.isFetching, panel]);
  const selecting = !input.job && selection !== null && selection.scope === scope;
  const selectedIds = selecting
    ? selection.ids.filter((id) => jobs.some((job) => job.id === id))
    : [];
  // Selection belongs only to the current confirmed page, never to hidden results.
  if (selection && (selection.scope !== scope || input.job)) setSelection(null);
  else if (
    selection &&
    query.data &&
    !query.isPlaceholderData &&
    selectedIds.length !== selection.ids.length
  )
    setSelection({ scope, ids: selectedIds });
  const selectionDisabled = readPending || query.isPlaceholderData || query.isFetching;

  useEffect(() => {
    if (!selecting || readPending) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setSelection(null);
      (jobs.length ? modeButton.current : (emptyHeading.current ?? panel.current))?.focus();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selecting, readPending, jobs.length, panel]);

  useEffect(() => {
    const pending = focusAfterWrite.current;
    if (!pending || readPending || !readState.isSuccess || query.isFetching) return;
    focusAfterWrite.current = null;
    if (
      pending.element.isConnected ||
      (document.activeElement !== document.body && document.activeElement !== null)
    )
      return;
    const nextId =
      pending.nextIds.find((id) => query.data?.jobs.some((job) => job.id === id)) ??
      query.data?.jobs[0]?.id;
    const next = nextId
      ? panel.current?.querySelector<HTMLElement>(
          `[data-posting-id="${nextId}"] [data-job-select]:not([inert]), [data-posting-id="${nextId}"] h2 a`,
        )
      : null;
    (next ?? emptyHeading.current ?? panel.current)?.focus();
  }, [readPending, readState.isSuccess, query.isFetching, query.data, panel]);

  async function changeReadState(change: ReadStateInput) {
    const element = document.activeElement;
    const focusedId = element?.closest("[data-posting-id]")?.getAttribute("data-posting-id");
    const index = jobs.findIndex((job) => job.id === focusedId);
    if (element)
      focusAfterWrite.current = {
        element,
        nextIds: [...jobs.slice(index + 1), ...jobs.slice(0, index)].map((job) => job.id),
      };
    setActionScope(scope);
    setAnnouncement("Saving read state…");
    try {
      await readState.mutateAsync(change);
      setSelection((current) =>
        current?.scope === scope
          ? { scope, ids: current.ids.filter((id) => !change.ids.includes(id)) }
          : current,
      );
      setAnnouncement(
        `${change.ids.length} ${change.ids.length === 1 ? "job" : "jobs"} marked ${change.read ? "read" : "unread"}.`,
      );
    } catch {
      focusAfterWrite.current = null;
      setAnnouncement("Read state could not be saved.");
    }
  }

  function finishSelection() {
    setSelection(null);
    (jobs.length ? modeButton.current : (emptyHeading.current ?? panel.current))?.focus();
  }

  function navigatePage({ page, pageSize }: { page: number; pageSize: number }) {
    requestPageFocus(`${view}:${readStatus}:${page}:${q}:${boardId}:${pageSize}:${querySuffix}`);
    void setInput({ page, pageSize, job: null });
  }

  function selectJob(id: string) {
    setSelection({
      scope,
      ids: selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    });
  }
  const columns = useJobColumns({
    boards: boards.data ?? [],
    fixedBoard: Boolean(fixedBoardId),
    inbox: mode === "inbox",
  });
  const table = useCollectionTable({
    data: jobs,
    columns,
    query: { filters, sort: input.sort, join: input.join },
    onQueryChange: (next) =>
      void setInput({ ...next, view: null, boardId: "", readStatus: "all", page: 1, job: null }),
    storageKey: mode === "inbox" ? "inbox" : "jobs",
    selectedIds,
    onSelectionChange: (ids) => setSelection({ scope, ids }),
  });

  return (
    <div className="@container/jobs flex min-w-0 flex-col gap-4">
      <JobFilters
        q={q}
        searchReset={searchReset}
        table={table}
        actions={
          <>
            <CollectionViews
              label="Job layouts"
              value={input.layout}
              onChange={(layout) => void setInput({ layout })}
            />
            {input.layout === "table" ? <DataTableViewOptions table={table} /> : null}
            <Toggle
              ref={modeButton}
              render={<Button variant={selecting ? "default" : "outline"} />}
              disabled={
                Boolean(input.job) ||
                (selecting ? readPending : selectionDisabled || jobs.length === 0)
              }
              pressed={selecting}
              onPressedChange={(pressed) => setSelection(pressed ? { scope, ids: [] } : null)}
            >
              {selecting ? (
                <CheckIcon aria-hidden="true" data-icon="inline-start" />
              ) : (
                <ListChecksIcon aria-hidden="true" data-icon="inline-start" />
              )}
              {selecting ? "Done" : "Select"}
            </Toggle>
          </>
        }
        onChange={(change) =>
          void setInput({
            ...change,
            page: 1,
            job: null,
          })
        }
      />
      {boards.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Couldn’t load board filter options. {indexErrorMessage(boards.error)}
          </AlertDescription>
          <Button
            variant="outline"
            disabled={boards.isFetching}
            onClick={() => void boards.refetch()}
          >
            Retry board options
          </Button>
        </Alert>
      ) : null}
      <section
        ref={panel}
        tabIndex={-1}
        aria-label={mode === "inbox" ? "Inbox jobs" : `${viewLabels[view]} jobs`}
        aria-busy={query.isFetching}
        className="min-w-0 outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {query.isPending ? <JobsSkeleton view={view} readStatus={displayReadStatus} /> : null}
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
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        {readState.isError && actionScope === scope ? (
          <ReadStateError
            error={readState.error}
            disabled={readPending}
            onRetry={() => {
              if (readState.variables) void changeReadState(readState.variables);
            }}
          />
        ) : null}
        {query.data ? (
          <div className="flex min-w-0 flex-col gap-5">
            {jobs.length ? (
              <FieldSet className="min-w-0 gap-5">
                <FieldLegend className="sr-only">
                  {selecting ? "Select jobs on this page" : "Jobs on this page"}
                </FieldLegend>
                <JobsCollection
                  jobs={jobs}
                  table={table}
                  inbox={mode === "inbox"}
                  layout={input.layout}
                  label={`${viewLabels[view]} jobs`}
                  history={view === "history" || view === "all"}
                  selecting={selecting}
                  selectedIds={selectedIds}
                  selectionDisabled={selectionDisabled}
                  readPending={readPending || query.isPlaceholderData}
                  activeId={input.job}
                  postingHref={postingHref}
                  onOpen={openPosting}
                  onSelect={selectJob}
                  onRead={(job) =>
                    void changeReadState({ ids: [job.id], read: job.readAt === null })
                  }
                />
              </FieldSet>
            ) : (
              <Empty className="min-h-40 border">
                <EmptyHeader>
                  <h2
                    ref={emptyHeading}
                    tabIndex={-1}
                    className="rounded-sm font-medium outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    {filtered
                      ? "No jobs match these filters"
                      : view === "all"
                        ? "No jobs yet"
                        : view === "history"
                          ? "No posting history yet"
                          : query.data.boardCount === 0
                            ? "Add a board to get started"
                            : query.data.indexedBoardCount === 0
                              ? "No indexed jobs yet"
                              : view === "unread"
                                ? "No unread jobs"
                                : readStatus === "read"
                                  ? "No read jobs in Open"
                                  : readStatus === "unread"
                                    ? "No unread jobs in Open"
                                    : "No open jobs in your index"}
                  </h2>
                </EmptyHeader>
                {filtered ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchReset((reset) => reset + 1);
                      void setInput({
                        q: "",
                        boardId: "",
                        readStatus: "all",
                        view: null,
                        page: 1,
                        job: null,
                        filters: [],
                      });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : view === "unread" && query.data.indexedBoardCount > 0 ? (
                  <Link
                    href="/jobs?view=open"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Browse open jobs
                  </Link>
                ) : view === "open" && readStatus !== "all" && query.data.indexedBoardCount > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => void setInput({ readStatus: "all", page: 1 })}
                  >
                    Show all open jobs
                  </Button>
                ) : (
                  <Link href="/boards" className={cn(buttonVariants({ variant: "outline" }))}>
                    {query.data.boardCount === 0 ? "Add a board" : "Manage boards"}
                  </Link>
                )}
              </Empty>
            )}
          </div>
        ) : null}
      </section>
      {query.data ? (
        <CollectionPagination
          total={query.data.total}
          page={query.data.page}
          pageSize={query.data.pageSize}
          label="Jobs"
          disabled={query.isFetching}
          actions={
            <JobActionBar
              selecting={selecting}
              pageIds={jobs.map((job) => job.id)}
              selectedIds={selectedIds}
              disabled={selectionDisabled}
              readPending={readPending}
              onSelect={(ids) => setSelection({ scope, ids })}
              onRead={(change) => void changeReadState(change)}
              onDone={finishSelection}
            />
          }
          onPage={(page) => navigatePage({ page, pageSize })}
          onPageSize={(pageSize) => navigatePage({ page: 1, pageSize })}
        />
      ) : null}
      {input.job ? (
        <JobReader
          id={input.job}
          jobs={jobs}
          collection={mode === "inbox" ? "Inbox" : "jobs"}
          onOpen={openPosting}
          onClose={closeReader}
        />
      ) : null}
    </div>
  );
}
