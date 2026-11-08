import { Skeleton } from "@/components/ui/skeleton";

export function BoardsSkeleton() {
  return (
    <div>
      <output aria-label="Loading boards" className="sr-only">
        Loading saved boards…
      </output>
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
        {["first", "second", "third"].map((card) => (
          <div key={card} className="flex min-h-40 flex-col gap-4 rounded-xl border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-7 w-40 max-w-2/3" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-52 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="ms-auto h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
