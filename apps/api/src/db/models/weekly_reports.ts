// knm-generated: db-design table=weekly_reports hash=9ca72c816432b05a; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const weekly_reports = sqliteTable("weekly_reports", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // not mapped: UQ (user_id, week_start)
  week_start: text("week_start").notNull(), // not mapped: YYYY-MM-DD
  summary: text("summary").notNull(),
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
