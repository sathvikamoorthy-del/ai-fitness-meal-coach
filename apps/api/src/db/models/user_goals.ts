// knm-generated: db-design table=user_goals hash=f3629702ad15f9a5; generated from the DB design, edit the design and regenerate
import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { user_goal_types } from './user_goal_types';
import { sql } from 'drizzle-orm';
export const user_goals = sqliteTable("user_goals", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goal_type: text("goal_type").notNull().references(() => user_goal_types.code), // not mapped: UQ (user_id, goal_type)
  target_value: real("target_value").notNull(), // not mapped: > 0
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_user_goals_user_id").on(t.user_id),
]);
