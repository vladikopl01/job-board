import "server-only";

import { boards, postings } from "@job-board/db/schema";
import { leverDescription, leverDescriptionSchema } from "@job-board/job-boards/server";
import { and, count, eq, isNotNull, isNull, like, or, sql } from "drizzle-orm";

import type { Database } from "@/features/refresh/server/store";

import type { JobListInput } from "../schemas";
import { IndexRequestError } from "./errors";
import { sanitizeDescription } from "./description";
import { jobFilterConditions, jobOrdering } from "./collection-query";

const listColumns = {
  id: postings.id,
  boardId: postings.boardId,
  title: postings.title,
  company: boards.displayName,
  provider: boards.provider,
  sourceHost: boards.sourceHost,
  canonicalUrl: boards.canonicalUrl,
  applyUrl: postings.applyUrl,
  boardArchivedAt: boards.archivedAt,
  locations: postings.locations,
  workplaceType: postings.workplaceType,
  department: postings.department,
  team: postings.team,
  firstSeenAt: postings.firstSeenAt,
  readAt: postings.readAt,
  unavailableAt: postings.unavailableAt,
  unavailableReason: postings.unavailableReason,
};

const openFilter = and(isNull(postings.unavailableAt), isNull(boards.archivedAt));
const unreadFilter = and(openFilter, isNull(postings.readAt));

export function unreadCount(db: Database) {
  return {
    unreadCount:
      db
        .select({ value: count() })
        .from(postings)
        .innerJoin(boards, eq(boards.id, postings.boardId))
        .where(unreadFilter)
        .get()?.value ?? 0,
  };
}

export function listJobs({ db, input }: { db: Database; input: JobListInput }) {
  return db.transaction((tx) => {
    let filter = input.view === "all" ? undefined : openFilter;
    if (input.view === "history")
      filter = or(isNotNull(postings.unavailableAt), isNotNull(boards.archivedAt));
    else if (input.view === "unread") filter = unreadFilter;
    else if (input.readStatus === "unread") filter = and(filter, isNull(postings.readAt));
    else if (input.readStatus === "read") filter = and(filter, isNotNull(postings.readAt));
    const pattern = input.q ? `%${input.q.replace(/[!%_]/gu, "!$&")}%` : undefined;
    filter = and(
      filter,
      input.boardId ? eq(postings.boardId, input.boardId) : undefined,
      jobFilterConditions(input),
      pattern
        ? or(
            // SQLite needs an explicit ESCAPE clause for literal contains searches.
            sql`${like(postings.title, pattern)} escape '!'`,
            sql`${like(postings.descriptionPlain, pattern)} escape '!'`,
          )
        : undefined,
    );
    const total =
      tx
        .select({ value: count() })
        .from(postings)
        .innerJoin(boards, eq(boards.id, postings.boardId))
        .where(filter)
        .get()?.value ?? 0;
    const pageSize = input.pageSize ?? 50;
    const page = Math.min(input.page, Math.max(1, Math.ceil(total / pageSize)));
    const jobs = tx
      .select(listColumns)
      .from(postings)
      .innerJoin(boards, eq(boards.id, postings.boardId))
      .where(filter)
      .orderBy(...jobOrdering(input))
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
