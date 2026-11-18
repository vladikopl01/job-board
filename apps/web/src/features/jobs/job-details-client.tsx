"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon, RotateCcwIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { InfoTip } from "@/components/info-tip";
import { NotFoundContent } from "@/components/not-found-content";
import { RefreshedText } from "@/components/refreshed-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppBadge } from "@/components/app-badge";
import { ProviderBadge } from "@/features/boards/provider-badge";
import { CompanyLink } from "./company-link";
import { JobAvailabilityBadge } from "./job-badges";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useJobVisit } from "./job-visit-provider";
import { useReadStatePending, useSetReadState } from "./queries";
import { ReadStateButton, ReadStateError } from "./read-state-controls";
import { jobResponseSchema, replacementResponseSchema } from "./schemas";

export function JobDetailsClient({
  id,
  presentation = "page",
}: {
  id: string;
  presentation?: "page" | "reader";
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = presentation === "reader" ? "h2" : "h1";
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
  const visit = useJobVisit();
  const readState = useSetReadState();
  const readPending = useReadStatePending();
  const { mutate: markRead } = readState;
  const loadedId = job?.id;
  useEffect(() => {
    if (loadedId && visit.consume(loadedId)) markRead({ ids: [loadedId], read: true });
  }, [loadedId, visit, markRead]);
  useEffect(() => {
    const element = heading.current;
    if (
      loadedId &&
      presentation === "reader" &&
      element?.closest("[data-job-reader]")?.contains(document.activeElement)
    )
      element.focus();
  }, [loadedId, presentation]);
  const notFound =
    query.error instanceof IndexApiError &&
    (query.error.code === "NOT_FOUND" || query.error.code === "INVALID_INPUT");

  return (
    <div className="@container/posting mx-auto flex w-full min-w-0 max-w-[72ch] flex-col gap-6 py-2 sm:py-4">
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
          <header data-reader-stage="heading" className="flex min-w-0 flex-col gap-5">
            <Heading
              ref={heading}
              tabIndex={-1}
              className={
                presentation === "reader"
                  ? "rounded-sm text-2xl leading-snug font-semibold tracking-tight wrap-anywhere outline-ring focus-visible:outline-2 focus-visible:outline-offset-4"
                  : "text-3xl leading-tight font-semibold tracking-tight text-balance wrap-anywhere sm:text-4xl"
              }
            >
              {job.title}
            </Heading>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <p className="min-w-0 text-lg leading-7 wrap-anywhere">
                <span className="text-muted-foreground">at </span>
                <CompanyLink job={job} />
              </p>
              <ProviderBadge provider={job.provider} sourceHost={job.sourceHost} />
              <JobAvailabilityBadge job={job} />
              {job.boardArchivedAt && job.unavailableReason ? (
                <AppBadge variant="muted">Board archived</AppBadge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <ReadStateButton
                readAt={job.readAt}
                disabled={readPending}
                onClick={() => readState.mutate({ ids: [job.id], read: job.readAt === null })}
              />
              <a
                className={buttonVariants()}
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SendIcon aria-hidden="true" data-icon="inline-start" />
                Apply<span className="sr-only"> (opens in a new tab)</span>
              </a>
              <a
                className={buttonVariants({ variant: "outline" })}
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon aria-hidden="true" data-icon="inline-start" />
                Employer posting<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </header>
          {readState.isError ? (
            <ReadStateError
              error={readState.error}
              disabled={readPending}
              onRetry={() => {
                if (readState.variables) readState.mutate(readState.variables);
              }}
            />
          ) : null}
          <Separator />
          <div data-reader-stage="facts">
            <JobFacts job={job} />
          </div>
          <Separator />
          {job.descriptionHtml ? (
            // This fragment is sanitized by the local API; original provider HTML stays in SQLite.
            <section
              aria-label="Job description"
              data-reader-stage="description"
              className="job-description"
              dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
            />
          ) : (
            <section
              aria-label="Job description"
              data-reader-stage="description"
              className="job-description"
            >
              <p className="whitespace-pre-wrap">
                {job.descriptionPlain || "No description was provided."}
              </p>
            </section>
          )}
          <p data-reader-stage="description" className="text-sm text-muted-foreground tabular-nums">
            Last seen{" "}
            <time dateTime={job.lastSeenAt}>
              <RefreshedText revision={job.lastSeenAt}>
                {new Date(job.lastSeenAt).toLocaleString()}
              </RefreshedText>
            </time>
          </p>
          {!job.unavailableAt && !job.boardArchivedAt ? (
            <div data-reader-stage="description" className="flex items-center gap-2">
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
