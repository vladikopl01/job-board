import { Skeleton } from "@/components/ui/skeleton";

export function JobsSkeleton({ history }: { history: boolean }) {
  return (
    <div>
      <output aria-label="Loading jobs" className="sr-only">
        {history ? "Loading job history…" : "Loading indexed jobs…"}
      </output>
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
        {["first", "second", "third"].map((card) => (
          <div key={card} className="flex flex-col gap-3 rounded-xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-7 w-80 max-w-2/3" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56 max-w-full" />
            {history ? <Skeleton className="h-5 w-24 rounded-full" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobDetailsSkeleton() {
  return (
    <div>
      <output aria-label="Loading posting" className="sr-only">
        Loading posting…
      </output>
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-10 w-xl max-w-full" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-5 border-y py-6 sm:grid-cols-2 lg:grid-cols-3">
          {["location", "workplace", "employment", "department", "team", "compensation"].map(
            (fact) => (
              <div key={fact} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-40 max-w-full" />
              </div>
            ),
          )}
        </div>
        <div className="flex max-w-prose flex-col gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-3 h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function JobDetailsPageSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Skeleton aria-hidden="true" className="h-5 w-52 max-w-full" />
      <JobDetailsSkeleton />
    </div>
  );
}
