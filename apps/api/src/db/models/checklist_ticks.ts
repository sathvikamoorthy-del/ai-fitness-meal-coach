// knm-generated: db-design table=checklist_ticks hash=60e09093c847eeda; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { workout_plan_days } from './workout_plan_days';
import { meal_plan_meals } from './meal_plan_meals';
import { sql } from 'drizzle-orm';
export const checklist_ticks = sqliteTable("checklist_ticks", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  item_date: text("item_date").notNull(), // not mapped: YYYY-MM-DD
  workout_plan_day_id: text("workout_plan_day_id").references(() => workout_plan_days.id, { onDelete: "cascade" }),
  meal_plan_meal_id: text("meal_plan_meal_id").references(() => meal_plan_meals.id, { onDelete: "cascade" }), // not mapped: exactly one of the two FKs set; not mapped: UQ (user_id, item_date, workout_plan_day_id) where workout_plan_day_id is not null; not mapped: UQ (user_id, item_date, meal_plan_meal_id) where meal_plan_meal_id is not null
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
