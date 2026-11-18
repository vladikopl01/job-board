"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import {
  parseAsInteger,
  parseAsJson,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useEffect, useRef, useState } from "react";

import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useCollectionTable } from "@/components/collection/use-collection-table";
import {
  isActiveFilter,
  joinOperatorSchema,
  type CollectionFilterItem,
} from "@/components/collection/query-schema";
import { matchesFilter } from "@/lib/data-table-filters";
import { boardColumns } from "./board-columns";
import { boardFiltersSchema, boardSortsSchema } from "./collection-schema";
import { CollectionPagination } from "@/components/collection/collection-pagination";
import { collectionLayouts, CollectionViews } from "@/components/collection/collection-views";
import { SearchInput } from "@/components/collection/search-input";
import { usePageFocus } from "@/components/collection/use-page-focus";
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
import { indexErrorMessage } from "@/features/jobs/api";
import { useRefreshBoards } from "@/features/refresh/queries";
import { RefreshBatchFeedback } from "@/features/refresh/refresh-batch-feedback";
import { useRefreshActivity, useRefreshAllActivity } from "@/features/refresh/refresh-provider";

import { AddBoardForm } from "./add-board-form";
import { boardErrorMessage, listBoards } from "./api";
import { BoardsCollection } from "./boards-collection";
import { BoardsSkeleton } from "./boards-skeleton";
import { boardsQueryKey } from "./queries";

const activeStatusFilter = {
  id: "status",
  filterId: "board-status",
  variant: "select",
  operator: "eq",
  value: "active",
} satisfies CollectionFilterItem;
const listParsers = {
  view: parseAsStringLiteral(["active", "archived"]),
  layout: parseAsStringLiteral(collectionLayouts).withDefault("table"),
  q: parseAsString.withDefault(""),
  provider: parseAsStringLiteral(["all", "ashby", "lever"]).withDefault("all"),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(50),
  filters: parseAsJson(boardFiltersSchema).withDefault([activeStatusFilter]),
  sort: parseAsJson(boardSortsSchema).withDefault([]),
  join: parseAsStringLiteral(joinOperatorSchema.options).withDefault("and"),
};

export function BoardsClient() {
  const refreshAll = useRefreshBoards();
  const refreshing = useRefreshActivity();
  const refreshingAll = useRefreshAllActivity();
  const [input, setInput] = useQueryStates(listParsers);
  const { layout, provider } = input;
  const q = input.q.trim();
  const pageSize = input.pageSize === 10 || input.pageSize === 25 ? input.pageSize : 50;
  const setView = (value: "active" | "archived") =>
    setInput({
      view: null,
      filters: [
        ...input.filters.filter((filter) => filter.id !== "status"),
        { ...activeStatusFilter, value },
      ],
      page: 1,
    });
  const [announcement, setAnnouncement] = useState("");
  const [searchReset, setSearchReset] = useState(0);
  const [addingBoard, setAddingBoard] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [locatedBoard, setLocatedBoard] = useState<string | null>(null);
  const focusAfterRename = useRef<Element | null>(null);
  const query = useQuery({
    queryKey: boardsQueryKey,
    queryFn: listBoards,
    networkMode: "always",
    retry: false,
  });
  const filters: CollectionFilterItem[] = [
    ...input.filters.filter((filter) => !input.view || filter.id !== "status"),
    ...(input.view ? [{ ...activeStatusFilter, value: input.view }] : []),
    ...(provider !== "all"
      ? [
          {
            id: "provider",
            filterId: "legacy-provider",
            variant: "select",
            operator: "eq",
            value: provider,
          } satisfies CollectionFilterItem,
        ]
      : []),
  ];
  const activeFilters = filters.filter(isActiveFilter);
  const status = activeFilters.find((filter) => filter.id === "status" && filter.operator === "eq");
  const statusValue = status && (Array.isArray(status.value) ? status.value[0] : status.value);
  const view =
    input.join === "and" && (statusValue === "active" || statusValue === "archived")
      ? statusValue
      : "all";
  const label = view === "all" ? "Boards" : `${view === "active" ? "Active" : "Archived"} boards`;
  const querySuffix = JSON.stringify([filters, input.sort, input.join]);
  const boards = query.data
    ?.filter(
      (board) =>
        (input.join === "or" && activeFilters.length
          ? activeFilters.some((filter) =>
              matchesFilter(boardFilterValue(board, filter.id), filter),
            )
          : activeFilters.every((filter) =>
              matchesFilter(boardFilterValue(board, filter.id), filter),
            )) &&
        (!q ||
          `${board.displayName} ${board.canonicalUrl}`
            .toLocaleLowerCase()
            .includes(q.toLocaleLowerCase())),
    )
    ?.toSorted((left, right) => {
      for (const sort of input.sort) {
        const compared = boardFilterValue(left, sort.id).localeCompare(
          boardFilterValue(right, sort.id),
          undefined,
          { sensitivity: "base" },
        );
        if (compared) return sort.desc ? -compared : compared;
      }
      return input.sort.length
        ? left.id.localeCompare(right.id)
        : right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
    });
  const page = Math.min(
    Math.max(1, input.page),
    Math.max(1, Math.ceil((boards?.length ?? 0) / pageSize)),
  );
  const filtered = Boolean(q || activeFilters.some((filter) => filter.id !== "status"));
  const loaded = Boolean(query.data);
  const { results, requestPageFocus } = usePageFocus({
    scope: JSON.stringify([view, provider, q, page, pageSize, querySuffix]),
    pending: query.isPending,
  });
  useEffect(() => {
    if (loaded && page !== input.page) void setInput({ page });
  }, [loaded, page, input.page, setInput]);
  useEffect(() => {
    const origin = focusAfterRename.current;
    if (!origin || query.isFetching) return;
    focusAfterRename.current = null;
    if (!origin.isConnected && document.activeElement === document.body)
      document.getElementById("board-status-filter")?.focus();
  }, [announcement, query.data, query.isFetching]);

  function navigatePage({ page, pageSize }: { page: number; pageSize: number }) {
    requestPageFocus(JSON.stringify([view, provider, q, page, pageSize, querySuffix]));
    void setInput({ page, pageSize });
  }

  const pageBoards = boards?.slice((page - 1) * pageSize, page * pageSize) ?? [];
  const table = useCollectionTable({
    data: pageBoards,
    columns: boardColumns,
    query: { filters, sort: input.sort, join: input.join },
    onQueryChange: (next) => void setInput({ ...next, view: null, provider: "all", page: 1 }),
    storageKey: "boards",
  });

  return (
    <Dialog
      open={addingBoard}
      onOpenChange={(open, details) => {
        if (!open && savingBoard) {
          details.cancel();
          return;
        }
        if (open) setLocatedBoard(null);
        setAddingBoard(open);
      }}
      onOpenChangeComplete={(open) => {
        if (!open && locatedBoard) {
          document.getElementById(`board-${locatedBoard}`)?.focus();
        }
      }}
    >
      <output className="sr-only">{announcement}</output>
      <div className="flex min-w-0 flex-col gap-4">
        <CollectionToolbar
          table={table}
          filterTriggerId="board-status-filter"
          actions={
            <>
              <CollectionViews
                label="Board layouts"
                value={layout}
                onChange={(layout) => void setInput({ layout })}
              />
              {layout === "table" ? <DataTableViewOptions table={table} /> : null}
              <Button
                type="button"
                variant="outline"
                disabled={
                  refreshing ||
                  refreshAll.isPending ||
                  !query.data?.some((board) => board.archivedAt === null)
                }
                aria-busy={refreshingAll}
                onClick={() => refreshAll.mutate("manual")}
              >
                <RefreshCwIcon
                  aria-hidden="true"
                  data-icon="inline-start"
                  className={cn(refreshingAll && "motion-safe:animate-spin")}
                />
                Refresh
              </Button>
              <DialogTrigger render={<Button type="button" />}>
                <PlusIcon aria-hidden="true" data-icon="inline-start" />
                New
              </DialogTrigger>
            </>
          }
        >
          <SearchInput
            value={q}
            resetKey={searchReset}
            onChange={(q) => void setInput({ q, page: 1 })}
            label="Search boards"
            placeholder="Search boards…"
          />
        </CollectionToolbar>
        <RefreshBatchFeedback
          batch={refreshAll.isPending || refreshAll.isError ? undefined : refreshAll.data}
          onViewActive={
            view === "archived"
              ? () => {
                  void setView("active");
                  document.getElementById("board-status-filter")?.focus();
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
        <section
          ref={results}
          tabIndex={-1}
          aria-label={label}
          aria-busy={query.isFetching}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-ring"
        >
          {query.isPending ? <BoardsSkeleton /> : null}
          {boards ? (
            boards.length > 0 ? (
              <BoardsCollection
                boards={pageBoards}
                table={table}
                layout={layout}
                activeId={locatedBoard}
                label={label}
                onStatus={(message, origin) => {
                  focusAfterRename.current = origin ?? null;
                  setAnnouncement(message);
                }}
              />
            ) : (
              <Empty className="min-h-40 border">
                <EmptyHeader>
                  <h3 className="font-medium">
                    {filtered
                      ? "No boards match these filters"
                      : view === "archived"
                        ? "No archived boards"
                        : view === "active"
                          ? "No active boards yet"
                          : "No boards yet"}
                  </h3>
                </EmptyHeader>
                {filtered ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchReset((reset) => reset + 1);
                      void setInput({
                        view: null,
                        q: "",
                        provider: "all",
                        filters: [activeStatusFilter],
                        page: 1,
                      });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : view === "active" ? (
                  <DialogTrigger render={<Button type="button" variant="outline" />}>
                    <PlusIcon aria-hidden="true" data-icon="inline-start" />
                    Add your first board
                  </DialogTrigger>
                ) : (
                  <Button type="button" variant="outline" onClick={() => void setView("active")}>
                    View active boards
                  </Button>
                )}
              </Empty>
            )
          ) : null}
        </section>
        {boards ? (
          <CollectionPagination
            total={boards.length}
            page={page}
            pageSize={pageSize}
            label="Boards"
            disabled={query.isPending}
            onPage={(page) => navigatePage({ page, pageSize })}
            onPageSize={(pageSize) => navigatePage({ page: 1, pageSize })}
          />
        ) : null}
      </div>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={!savingBoard}
        initialFocus={() => document.getElementById("board-url")}
        finalFocus={() => locatedBoard === null}
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
            setSearchReset((reset) => reset + 1);
            void setInput({
              view: null,
              q: "",
              provider: "all",
              filters: [activeStatusFilter],
              sort: [],
              page: 1,
            });
            setAnnouncement(`${board.displayName} ${action}.`);
            setSavingBoard(false);
            setAddingBoard(false);
          }}
          onLocate={(board) => {
            setSearchReset((reset) => reset + 1);
            setLocatedBoard(board.id);
            const index =
              query.data
                ?.filter((item) => Boolean(item.archivedAt) === board.archived)
                .findIndex((item) => item.id === board.id) ?? -1;
            void setInput({
              view: null,
              q: "",
              provider: "all",
              filters: [{ ...activeStatusFilter, value: board.archived ? "archived" : "active" }],
              sort: [],
              page: Math.max(1, Math.floor(index / pageSize) + 1),
            });
            setAddingBoard(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function boardFilterValue(board: import("./schemas").Board, field: string): string {
  switch (field) {
    case "displayName":
      return board.displayName;
    case "provider":
      return board.provider;
    case "canonicalUrl":
      return board.canonicalUrl;
    case "lastSuccessfulRefreshAt":
      return board.lastSuccessfulRefreshAt ?? "";
    case "createdAt":
      return board.createdAt;
    case "status":
      return board.archivedAt ? "archived" : "active";
    default:
      return "";
  }
}
