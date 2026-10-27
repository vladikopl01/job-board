import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  },
  (table) => [
    uniqueIndex("boards_source_unique").on(table.provider, table.sourceHost, table.boardKey),
  ],
);
