"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { listBoards } from "@/features/boards/api";
import { boardsQueryKey } from "@/features/boards/queries";
import { localRequest } from "@/features/jobs/api";
import { jobResponseSchema } from "@/features/jobs/schemas";

export function AppBreadcrumbs({ pathname }: { pathname: string }) {
  const section = pathname.startsWith("/inbox")
    ? "Inbox"
    : pathname.startsWith("/jobs")
      ? "Jobs"
      : pathname.startsWith("/boards")
        ? "Boards"
        : "Dashboard";
  const jobId = pathname.startsWith("/jobs/") ? pathname.split("/")[2] : undefined;
  const boardId = pathname.startsWith("/boards/") ? pathname.split("/")[2] : undefined;
  // Observe the same cache as the detail page; breadcrumbs never mark a visit.
  const job = useQuery({
    queryKey: ["jobs", "detail", jobId],
    queryFn: jobId
      ? ({ signal }) => localRequest(jobResponseSchema, `/api/jobs/${jobId}`, { signal })
      : skipToken,
  });
  const boards = useQuery({
    queryKey: boardsQueryKey,
    queryFn: boardId ? listBoards : skipToken,
  });
  const board = boards.data?.find((item) => item.id === boardId);
  const detail = jobId
    ? (job.data?.posting.title ?? "Posting")
    : boardId
      ? (board?.displayName ?? "Board")
      : null;

  if (!detail) return <span className="text-sm font-medium">{section}</span>;
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink
            render={
              <Link
                href={boardId ? `/boards${board?.archivedAt ? "?view=archived" : ""}` : "/jobs"}
              />
            }
          >
            {section}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{detail}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
