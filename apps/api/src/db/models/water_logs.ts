// knm-generated: db-design table=water_logs hash=0efa89da743a65e4; generated from the DB design, edit the design and regenerate
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const water_logs = sqliteTable("water_logs", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  log_date: text("log_date").notNull(), // not mapped: YYYY-MM-DD
  amount_ml: integer("amount_ml").notNull(), // not mapped: > 0
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
