"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { ExternalLinkIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { NotFoundContent } from "@/components/not-found-content";
import { RefreshedText } from "@/components/refreshed-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { IndexApiError, indexErrorMessage, jsonMutation, localRequest } from "./api";
import { JobFacts } from "./job-facts";
import { JobDetailsSkeleton } from "./jobs-skeleton";
import { jobAvailability, jobResponseSchema, replacementResponseSchema } from "./schemas";

export function JobDetailsClient({ id }: { id: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const query = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: ({ signal }) => localRequest(jobResponseSchema, `/api/jobs/${id}`, { signal }),
  });
  const replacement = useMutation({
    mutationFn: () =>
      localRequest(replacementResponseSchema, `/api/jobs/${id}/replace`, jsonMutation()),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["jobs"] });
      setConfirming(false);
      router.push(`/jobs/${result.id}`);
    },
  });
  const job = query.data?.posting;
  const notFound =
    query.error instanceof IndexApiError &&
    (query.error.code === "NOT_FOUND" || query.error.code === "INVALID_INPUT");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link href="/jobs" />}
              className="rounded-sm outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Jobs
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="wrap-anywhere">
              {job?.title ?? (notFound ? "Posting not found" : "Posting")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {query.isPending ? <JobDetailsSkeleton /> : null}
      {notFound ? (
        <NotFoundContent
          title="Posting not found"
          description="This posting isn’t in your local index. Browse your saved jobs or check your tracked boards."
        />
      ) : null}
      {query.isError && !notFound ? (
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
      {job ? (
        <>
          <header className="flex min-w-0 flex-col gap-5">
            <h1 className="text-3xl leading-[1.4] font-semibold tracking-tight text-balance wrap-anywhere sm:text-4xl">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <p className="min-w-0 text-lg leading-7 wrap-anywhere">
                <span className="text-muted-foreground">at </span>
                <Link
                  href={`/boards/${job.boardId}`}
                  prefetch={false}
                  className="rounded-sm underline underline-offset-4 outline-ring hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {job.company}
                </Link>
              </p>
              <Badge variant="outline">
                {job.provider === "ashby"
                  ? "Ashby"
                  : job.sourceHost === "jobs.eu.lever.co"
                    ? "Lever · EU"
                    : "Lever"}
              </Badge>
              <Badge variant="secondary">{jobAvailability(job)}</Badge>
              {job.boardArchivedAt && job.unavailableReason ? (
                <Badge variant="outline">Board archived</Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className={cn(buttonVariants({ variant: "outline" }))}
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon aria-hidden="true" data-icon="inline-start" />
                Employer posting<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                className={cn(buttonVariants())}
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon aria-hidden="true" data-icon="inline-start" />
                Apply<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </header>
          <Separator />
          <JobFacts job={job} />
          <Separator />
          {job.descriptionHtml ? (
            // This fragment is sanitized by the local API; original provider HTML stays in SQLite.
            <section
              aria-label="Job description"
              className="job-description"
              dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
            />
          ) : (
            <section aria-label="Job description" className="job-description">
              <p className="whitespace-pre-wrap">
                {job.descriptionPlain || "No description was provided."}
              </p>
            </section>
          )}
          <p className="text-sm text-muted-foreground tabular-nums">
            Last seen{" "}
            <time dateTime={job.lastSeenAt}>
              <RefreshedText revision={job.lastSeenAt}>
                {new Date(job.lastSeenAt).toLocaleString()}
              </RefreshedText>
            </time>
          </p>
          {!job.unavailableAt && !job.boardArchivedAt ? (
            <div className="flex items-center gap-2">
              <Dialog
                open={confirming}
                onOpenChange={(open, details) => {
                  if (!open && replacement.isPending) details.cancel();
                  else {
                    replacement.reset();
                    setConfirming(open);
                  }
                }}
              >
                <DialogTrigger render={<Button variant="outline" />}>
                  <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
                  Treat as new
                </DialogTrigger>
                <DialogContent showCloseButton={!replacement.isPending}>
                  <DialogHeader>
                    <DialogTitle>Treat this posting as new?</DialogTitle>
                    <DialogDescription>
                      This keeps the original in History and creates a separate posting from its
                      stored content. Use it when the employer has reused the same source reference
                      for a different job.
                    </DialogDescription>
                  </DialogHeader>
                  {replacement.isError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{indexErrorMessage(replacement.error)}</AlertDescription>
                    </Alert>
                  ) : null}
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="outline" disabled={replacement.isPending} />}
                    >
                      Cancel
                    </DialogClose>
                    <Button disabled={replacement.isPending} onClick={() => replacement.mutate()}>
                      {replacement.isPending ? "Creating…" : "Create new posting"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <InfoTip label="Posting identity">
                Use this only when the employer reused a posting reference. Ordinary description
                changes update the same local posting.
              </InfoTip>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
