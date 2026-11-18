import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { JobsClient } from "@/features/jobs/jobs-client";

export const metadata: Metadata = { title: "Jobs | Job board" };

export default async function JobsPage({
  searchParams = Promise.resolve({}),
}: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  // Render URL-based filters in the initial response instead of a whole-page CSR fallback.
  await connection();
  const params = await searchParams;
  if (params.view === "unread") {
    const target = new URLSearchParams();
    for (const key of ["page", "pageSize", "layout", "q", "boardId", "job"]) {
      const value = params[key];
      if (typeof value === "string") target.set(key, value);
    }
    redirect(`/inbox${target.size ? `?${target}` : ""}`);
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Find open jobs, revisit read postings, and browse retained history.
        </p>
      </header>
      <JobsClient />
    </div>
  );
}
