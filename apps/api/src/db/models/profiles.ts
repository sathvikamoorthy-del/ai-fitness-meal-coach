// knm-generated: db-design table=profiles hash=6024054c3bd39e37; generated from the DB design, edit the design and regenerate
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { goal_types } from './goal_types';
import { fitness_levels } from './fitness_levels';
import { diet_types } from './diet_types';
import { sql } from 'drizzle-orm';
export const profiles = sqliteTable("profiles", {
  user_id: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  age: integer("age"), // not mapped: > 0
  sex: text("sex"), // not mapped: in ('male','female')
  height_cm: real("height_cm"), // not mapped: > 0
  weight_kg: real("weight_kg"), // not mapped: > 0
  goal_type: text("goal_type").references(() => goal_types.code),
  fitness_level: text("fitness_level").references(() => fitness_levels.code),
  diet_type: text("diet_type").references(() => diet_types.code),
  daily_calorie_target: real("daily_calorie_target"), // not mapped: > 0
  daily_water_target_ml: integer("daily_water_target_ml").notNull().default(2000), // not mapped: > 0
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
