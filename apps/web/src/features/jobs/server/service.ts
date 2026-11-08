import "server-only";

import { boards, postings } from "@job-board/db/schema";
import { leverDescription, leverDescriptionSchema } from "@job-board/job-boards/server";
import { and, count, desc, eq, isNotNull, isNull, or } from "drizzle-orm";

import type { Database } from "@/features/refresh/server/store";

import type { JobListInput } from "../schemas";
import { IndexRequestError } from "./errors";
import { sanitizeDescription } from "./description";

const listColumns = {
  id: postings.id,
  boardId: postings.boardId,
  title: postings.title,
  company: boards.displayName,
  provider: boards.provider,
  sourceHost: boards.sourceHost,
  canonicalUrl: boards.canonicalUrl,
  boardArchivedAt: boards.archivedAt,
  locations: postings.locations,
  workplaceType: postings.workplaceType,
  firstSeenAt: postings.firstSeenAt,
  unavailableAt: postings.unavailableAt,
  unavailableReason: postings.unavailableReason,
};

export function listJobs({ db, input }: { db: Database; input: JobListInput }) {
  return db.transaction((tx) => {
    const filter =
      input.view === "open"
        ? and(isNull(postings.unavailableAt), isNull(boards.archivedAt))
        : or(isNotNull(postings.unavailableAt), isNotNull(boards.archivedAt));
    const total =
      tx
        .select({ value: count() })
        .from(postings)
        .innerJoin(boards, eq(boards.id, postings.boardId))
        .where(filter)
        .get()?.value ?? 0;
    const pageSize = 50;
    const page = Math.min(input.page, Math.max(1, Math.ceil(total / pageSize)));
    const jobs = tx
      .select(listColumns)
      .from(postings)
      .innerJoin(boards, eq(boards.id, postings.boardId))
      .where(filter)
      .orderBy(desc(postings.firstSeenAt), desc(postings.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    const boardCount =
      tx.select({ value: count() }).from(boards).where(isNull(boards.archivedAt)).get()?.value ?? 0;
    const indexedBoardCount =
      tx
        .select({ value: count() })
        .from(boards)
        .where(and(isNull(boards.archivedAt), isNotNull(boards.lastSuccessfulRefreshAt)))
        .get()?.value ?? 0;
    return { jobs, total, page, pageSize, boardCount, indexedBoardCount };
  });
}

export function jobDetails({ db, id }: { db: Database; id: string }) {
  const posting = db
    .select({
      ...listColumns,
      externalReference: postings.externalReference,
      descriptionPlain: postings.descriptionPlain,
      descriptionHtml: postings.descriptionHtml,
      raw: postings.raw,
      jobUrl: postings.jobUrl,
      applyUrl: postings.applyUrl,
      department: postings.department,
      team: postings.team,
      employmentType: postings.employmentType,
      compensation: postings.compensation,
      publishedAt: postings.publishedAt,
      lastSeenAt: postings.lastSeenAt,
    })
    .from(postings)
    .innerJoin(boards, eq(boards.id, postings.boardId))
    .where(eq(postings.id, id))
    .get();
  if (!posting) throw new IndexRequestError(404, "NOT_FOUND", "This posting was not found.");
  const { raw, descriptionHtml, ...detail } = posting;
  let html = descriptionHtml;
  if (posting.provider === "lever") {
    // Rebuild sections from retained source data so existing and historical jobs benefit offline.
    const source = leverDescriptionSchema.safeParse(raw);
    if (source.success) html = leverDescription(source.data).descriptionHtml ?? html;
  }
  return { ...detail, descriptionHtml: sanitizeDescription({ html, jobUrl: detail.jobUrl }) };
}

export function jobIdentity({ db, id }: { db: Database; id: string }) {
  return db
    .select({ title: postings.title, company: boards.displayName })
    .from(postings)
    .innerJoin(boards, eq(boards.id, postings.boardId))
    .where(eq(postings.id, id))
    .get();
}
