// knm-generated: db-design table=meal_log_items hash=b4be68e3cd8fd34b; generated from the DB design, edit the design and regenerate
import { index, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { meal_logs } from './meal_logs';
import { foods } from './foods';
export const meal_log_items = sqliteTable("meal_log_items", {
  id: text("id").primaryKey(),
  meal_log_id: text("meal_log_id").notNull().references(() => meal_logs.id, { onDelete: "cascade" }),
  food_id: text("food_id").notNull().references(() => foods.id, { onDelete: "restrict" }),
  amount_g: real("amount_g").notNull(), // not mapped: > 0
}, (t) => [
  index("idx_meal_log_items_meal_log_id").on(t.meal_log_id),
  index("idx_meal_log_items_food_id").on(t.food_id),
]);
