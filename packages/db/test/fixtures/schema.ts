import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const parents = sqliteTable("fixture_parents", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note"),
});

export const children = sqliteTable("fixture_children", {
  id: integer("id").primaryKey(),
  parentId: integer("parent_id")
    .notNull()
    .references(() => parents.id),
});
