// knm-generated: db-design table=meal_plan_meals hash=7a28563cd926ae89; generated from the DB design, edit the design and regenerate
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { meal_plans } from './meal_plans';
import { meal_types } from './meal_types';
import { sql } from 'drizzle-orm';
export const meal_plan_meals = sqliteTable("meal_plan_meals", {
  id: text("id").primaryKey(),
  meal_plan_id: text("meal_plan_id").notNull().references(() => meal_plans.id, { onDelete: "cascade" }),
  day_number: integer("day_number").notNull().default(1), // not mapped: >= 1
  meal_type: text("meal_type").notNull().references(() => meal_types.code), // not mapped: UQ (meal_plan_id, day_number, meal_type)
  name: text("name").notNull(),
  description: text("description"),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_meal_plan_meals_meal_plan_id").on(t.meal_plan_id),
]);
