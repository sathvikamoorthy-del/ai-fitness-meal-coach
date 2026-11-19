// knm-generated: db-design table=weight_logs hash=a8c060f4d0132f34; generated from the DB design, edit the design and regenerate
import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const weight_logs = sqliteTable("weight_logs", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  log_date: text("log_date").notNull(), // not mapped: YYYY-MM-DD
  weight_kg: real("weight_kg").notNull(), // not mapped: > 0
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
