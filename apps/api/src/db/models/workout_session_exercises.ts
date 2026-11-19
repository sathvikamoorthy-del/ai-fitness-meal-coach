// knm-generated: db-design table=workout_session_exercises hash=3acdd9c3c316c48b; generated from the DB design, edit the design and regenerate
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { workout_sessions } from './workout_sessions';
import { exercises } from './exercises';
export const workout_session_exercises = sqliteTable("workout_session_exercises", {
  id: text("id").primaryKey(),
  workout_session_id: text("workout_session_id").notNull().references(() => workout_sessions.id, { onDelete: "cascade" }),
  exercise_id: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  position: integer("position").notNull(), // not mapped: >= 1
  sets: integer("sets").notNull(), // not mapped: > 0
  reps: integer("reps").notNull(), // not mapped: > 0
  weight_kg: real("weight_kg").notNull(), // not mapped: >= 0
}, (t) => [
  index("idx_workout_session_exercises_workout_session_id").on(t.workout_session_id),
  index("idx_workout_session_exercises_exercise_id").on(t.exercise_id),
]);
