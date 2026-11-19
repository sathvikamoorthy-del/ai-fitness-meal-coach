// knm-generated: db-design table=meal_logs hash=68738532df6a049f; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { meal_types } from './meal_types';
import { sql } from 'drizzle-orm';
export const meal_logs = sqliteTable("meal_logs", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  log_date: text("log_date").notNull(), // not mapped: YYYY-MM-DD
  meal_type: text("meal_type").notNull().references(() => meal_types.code),
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
