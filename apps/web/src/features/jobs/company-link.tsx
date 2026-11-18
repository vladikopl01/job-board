import Link from "next/link";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

import type { JobListItem } from "./schemas";

export function CompanyLink({
  job,
  presentation = "text",
}: {
  job: Pick<JobListItem, "boardId" | "boardArchivedAt" | "company">;
  presentation?: "text" | "button";
}) {
  return (
    <Link
      href={`/boards/${job.boardId}${job.boardArchivedAt ? "?view=history" : ""}`}
      prefetch={false}
      className={cn(
        presentation === "button"
          ? buttonVariants({ variant: "ghost" })
          : "rounded-sm px-1 py-0.5 text-foreground outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        "pointer-events-auto relative z-10 max-w-full hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
      )}
    >
      {job.company}
    </Link>
  );
}
