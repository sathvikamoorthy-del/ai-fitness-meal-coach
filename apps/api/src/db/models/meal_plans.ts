// knm-generated: db-design table=meal_plans hash=6bc8b99e9391716d; generated from the DB design, edit the design and regenerate
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const meal_plans = sqliteTable("meal_plans", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // not mapped: in ('day','week')
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_meal_plans_user_id").on(t.user_id),
]);
