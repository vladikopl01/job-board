import type { Metadata } from "next";
import { connection } from "next/server";

import { JobDetailsClient } from "@/features/jobs/job-details-client";
import { internalIdSchema } from "@/features/jobs/schemas";
import { jobIdentity } from "@/features/jobs/server/service";
import { getDatabase } from "@/server/database";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const id = internalIdSchema.safeParse((await params).id);
  if (!id.success) return { title: "Posting not found | Job board" };
  try {
    const job = jobIdentity({ db: getDatabase(), id: id.data });
    return {
      title: job ? `${job.title} at ${job.company} | Job board` : "Posting not found | Job board",
    };
  } catch {
    // Leave storage failures to the client view, which offers a retry action.
    return { title: "Posting | Job board" };
  }
}

export default async function JobDetailsPage({ params }: PageProps) {
  const { id } = await params;
  return <JobDetailsClient key={id} id={id} />;
}
