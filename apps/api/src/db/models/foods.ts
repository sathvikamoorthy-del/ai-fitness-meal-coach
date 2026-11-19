// knm-generated: db-design table=foods hash=1a484416d43f2056; generated from the DB design, edit the design and regenerate
import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const foods = sqliteTable("foods", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // not mapped: COLLATE NOCASE
  calories: real("calories").notNull(), // not mapped: >= 0
  protein_g: real("protein_g").notNull(), // not mapped: >= 0
  carbs_g: real("carbs_g").notNull(), // not mapped: >= 0
  fat_g: real("fat_g").notNull(), // not mapped: >= 0
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_foods_name").on(t.name),
]);
