// knm-generated: db-design table=meal_plan_ingredients hash=08ea600451d67083; generated from the DB design, edit the design and regenerate
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { meal_plan_meals } from './meal_plan_meals';
export const meal_plan_ingredients = sqliteTable("meal_plan_ingredients", {
  id: text("id").primaryKey(),
  meal_plan_meal_id: text("meal_plan_meal_id").notNull().references(() => meal_plan_meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // not mapped: name = lower(trim(name))
  quantity_g: real("quantity_g"), // not mapped: > 0
  is_ticked: integer("is_ticked").notNull().default(0), // not mapped: in (0,1)
}, (t) => [
  index("idx_meal_plan_ingredients_meal_plan_meal_id").on(t.meal_plan_meal_id),
]);
