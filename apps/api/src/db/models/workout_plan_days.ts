// knm-generated: db-design table=workout_plan_days hash=76224c62094870ec; generated from the DB design, edit the design and regenerate
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workout_plans } from './workout_plans';
export const workout_plan_days = sqliteTable("workout_plan_days", {
  id: text("id").primaryKey(),
  workout_plan_id: text("workout_plan_id").notNull().references(() => workout_plans.id, { onDelete: "cascade" }),
  day_number: integer("day_number").notNull(), // not mapped: >= 1; not mapped: UQ (workout_plan_id, day_number)
}, (t) => [
  index("idx_workout_plan_days_workout_plan_id").on(t.workout_plan_id),
]);
