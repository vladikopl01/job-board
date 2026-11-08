import type { JsonValue, PostingLocation } from "@job-board/job-boards";
import { isNull, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: ["ashby", "lever"] }).notNull(),
    sourceHost: text("source_host", {
      enum: ["jobs.ashbyhq.com", "jobs.lever.co", "jobs.eu.lever.co"],
    }).notNull(),
    boardKey: text("board_key").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    archivedAt: text("archived_at"),
    lastSuccessfulRefreshAt: text("last_successful_refresh_at"),
    refreshGeneration: integer("refresh_generation").notNull().default(0),
  },
  (table) => [
    uniqueIndex("boards_source_unique").on(table.provider, table.sourceHost, table.boardKey),
  ],
);

export const postings = sqliteTable(
  "postings",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id),
    externalReference: text("external_reference").notNull(),
    title: text("title").notNull(),
    descriptionPlain: text("description_plain").notNull(),
    descriptionHtml: text("description_html"),
    jobUrl: text("job_url").notNull(),
    applyUrl: text("apply_url").notNull(),
    locations: text("locations", { mode: "json" }).$type<PostingLocation[]>().notNull(),
    workplaceType: text("workplace_type", {
      enum: ["remote", "hybrid", "on-site", "unknown"],
    }).notNull(),
    department: text("department"),
    team: text("team"),
    employmentType: text("employment_type"),
    compensation: text("compensation", { mode: "json" }).$type<JsonValue>(),
    publishedAt: text("published_at"),
    raw: text("raw", { mode: "json" }).$type<Record<string, JsonValue>>().notNull(),
    contentHash: text("content_hash").notNull(),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    contentUpdatedAt: text("content_updated_at").notNull(),
    unavailableAt: text("unavailable_at"),
    unavailableReason: text("unavailable_reason", { enum: ["missing", "superseded"] }),
  },
  (table) => [
    uniqueIndex("postings_current_reference_unique")
      .on(table.boardId, table.externalReference)
      .where(isNull(table.unavailableAt)),
    index("postings_list_order").on(table.firstSeenAt, table.id),
    index("postings_board_availability").on(table.boardId, table.unavailableAt),
  ],
);

export const refreshTasks = sqliteTable(
  "board_refresh_tasks",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id").notNull().unique(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id),
    requestSource: text("request_source", { enum: ["app-visit", "manual"] }).notNull(),
    state: text("state", {
      enum: ["queued", "running", "succeeded", "failed", "interrupted", "cancelled"],
    }).notNull(),
    phase: text("phase", { enum: ["queued", "fetching", "confirming", "finished"] }).notNull(),
    createdAt: text("created_at").notNull(),
    startedAt: text("started_at"),
    finishedAt: text("finished_at"),
    ownerToken: text("owner_token"),
    leaseExpiresAt: text("lease_expires_at"),
    generation: integer("generation"),
    newCount: integer("new_count"),
    updatedCount: integer("updated_count"),
    unavailableCount: integer("unavailable_count"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryAt: text("retry_at"),
  },
  (table) => [
    // DDL needs literal states: parameterized eq() expressions cannot define an index.
    uniqueIndex("refresh_tasks_active_board_unique")
      .on(table.boardId)
      .where(sql`${table.state} IN ('queued', 'running')`),
    index("refresh_tasks_board_latest").on(table.boardId, table.sequence),
    index("refresh_tasks_queue").on(table.state, table.sequence),
  ],
);
