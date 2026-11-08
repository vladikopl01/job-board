import { BriefcaseBusinessIcon } from "lucide-react";
import { cn } from "cn";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";

export default function WorkspacePage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Your next opportunity starts here
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your job-search workspace
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          A quiet place to keep your search in order, with your data on your machine.
        </p>
      </div>
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseBusinessIcon aria-hidden="true" />
          </EmptyMedia>
          <h2 className="text-base font-medium">Build your company list</h2>
          <EmptyDescription>
            Save Ashby and Lever company boards locally, then keep your sources organized as your
            search develops.
          </EmptyDescription>
        </EmptyHeader>
        <Link href="/boards" className={cn(buttonVariants({ variant: "outline" }))}>
          Manage boards
        </Link>
      </Empty>
    </div>
  );
}
