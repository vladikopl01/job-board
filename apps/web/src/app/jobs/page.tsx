import type { Metadata } from "next";
import { connection } from "next/server";

import { JobsClient } from "@/features/jobs/jobs-client";

export const metadata: Metadata = { title: "Jobs | Job board" };

export default async function JobsPage() {
  // Render URL-based tabs in the initial response instead of a whole-page CSR fallback.
  await connection();
  return (
    <>
      <h1 className="sr-only">Jobs</h1>
      <JobsClient />
    </>
  );
}
