import { cn } from "cn";
import { BriefcaseBusinessIcon, LayoutListIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@/components/ui/empty";

export function NotFoundContent({
  title = "Page not found",
  description = "We couldn’t find this page. Pick up where you left off with your jobs or tracked boards.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60svh] items-center justify-center py-8">
      <Empty className="max-w-xl gap-6">
        <p
          aria-hidden="true"
          className="text-8xl font-semibold tracking-tighter text-muted-foreground/30 sm:text-9xl"
        >
          404
        </p>
        <EmptyHeader>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="sm:flex-row sm:justify-center">
          <Link href="/jobs" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <BriefcaseBusinessIcon aria-hidden="true" data-icon="inline-start" />
            Browse jobs
          </Link>
          <Link
            href="/boards"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            <LayoutListIcon aria-hidden="true" data-icon="inline-start" />
            Manage boards
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  );
}
