import type { Metadata } from "next";
import { connection } from "next/server";

import { JobsClient } from "@/features/jobs/jobs-client";
import { UnreadCount, UnreadCountRetry } from "@/features/jobs/unread-count";

export const metadata: Metadata = { title: "Inbox · Job board" };

export default async function InboxPage() {
  await connection();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Inbox <UnreadCount />
          </h1>
          <UnreadCountRetry />
        </div>
        <p className="text-sm text-muted-foreground">Review new jobs from your tracked boards.</p>
      </header>
      <JobsClient mode="inbox" />
    </div>
  );
}
