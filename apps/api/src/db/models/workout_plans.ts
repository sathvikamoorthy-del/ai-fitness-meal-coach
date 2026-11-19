// knm-generated: db-design table=workout_plans hash=218ff6fee017bc87; generated from the DB design, edit the design and regenerate
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { plan_sources } from './plan_sources';
import { sql } from 'drizzle-orm';
export const workout_plans = sqliteTable("workout_plans", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull().references(() => plan_sources.code),
  is_active: integer("is_active").notNull().default(0), // not mapped: in (0,1); not mapped: UQ (user_id) where is_active = 1
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_workout_plans_user_id").on(t.user_id),
]);
