// knm-generated: db-design table=workout_plan_exercises hash=13ee77d000ce86db; generated from the DB design, edit the design and regenerate
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workout_plan_days } from './workout_plan_days';
import { exercises } from './exercises';
export const workout_plan_exercises = sqliteTable("workout_plan_exercises", {
  id: text("id").primaryKey(),
  workout_plan_day_id: text("workout_plan_day_id").notNull().references(() => workout_plan_days.id, { onDelete: "cascade" }),
  exercise_id: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  position: integer("position").notNull(), // not mapped: >= 1
  sets: integer("sets").notNull(), // not mapped: > 0
  reps: integer("reps").notNull(), // not mapped: > 0
}, (t) => [
  index("idx_workout_plan_exercises_workout_plan_day_id").on(t.workout_plan_day_id),
  index("idx_workout_plan_exercises_exercise_id").on(t.exercise_id),
]);
