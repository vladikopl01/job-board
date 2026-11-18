"use client";

import { ArrowLeftIcon, ArrowRightIcon, Maximize2Icon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { JobDetailsClient } from "./job-details-client";
import { JobVisitProvider } from "./job-visit-provider";
import type { JobListItem } from "./schemas";

export function JobReader({
  id,
  jobs,
  collection,
  onOpen,
  onClose,
}: {
  id: string;
  jobs: JobListItem[];
  collection: string;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Open on the next frame so the mounted Sheet can transition from closed.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const index = jobs.findIndex((job) => job.id === id);
  const previous = jobs[index - 1];
  const next = index < 0 ? undefined : jobs[index + 1];
  return (
    <Sheet
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        data-job-reader
        aria-label="Posting reader"
        showCloseButton={false}
        className="gap-0 transition-[translate,opacity] duration-200 ease-(--reader-ease) data-[side=right]:w-full data-[side=right]:sm:max-w-[min(46rem,calc(100vw-4rem))] motion-reduce:transition-none"
        initialFocus={() => document.getElementById("reader-close")}
        finalFocus={false}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3 sm:px-5">
          <SheetTitle className="sr-only">Posting reader</SheetTitle>
          <SheetDescription className="sr-only">
            Review jobs from {collection}. Close to return to your collection.
          </SheetDescription>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Posting navigation">
            <Button
              variant="secondary"
              size="sm"
              aria-label="Previous posting"
              disabled={!previous}
              onClick={() => previous && onOpen(previous.id)}
            >
              <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Next posting"
              disabled={!next}
              onClick={() => next && onOpen(next.id)}
            >
              Next
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </Button>
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <Link
              href={`/jobs/${id}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              aria-label="Expand posting"
              title="Expand posting"
            >
              <Maximize2Icon aria-hidden="true" />
            </Link>
            <Button
              id="reader-close"
              variant="ghost"
              size="icon-sm"
              aria-label={`Close reader and return to ${collection}`}
              onClick={onClose}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" key={id}>
          <JobVisitProvider postingId={id}>
            <JobDetailsClient id={id} presentation="reader" />
          </JobVisitProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
