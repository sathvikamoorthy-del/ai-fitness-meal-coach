// knm-generated: db-design table=body_measurements hash=75c8d90b193d986f; generated from the DB design, edit the design and regenerate
import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const body_measurements = sqliteTable("body_measurements", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  log_date: text("log_date").notNull(), // not mapped: YYYY-MM-DD
  waist_cm: real("waist_cm"), // not mapped: > 0
  chest_cm: real("chest_cm"), // not mapped: > 0
  hips_cm: real("hips_cm"), // not mapped: > 0; not mapped: at least one of waist, chest, hips not null
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
