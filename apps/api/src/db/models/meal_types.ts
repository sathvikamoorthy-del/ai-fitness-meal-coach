// knm-generated: db-design table=meal_types hash=11feaab0664ababd; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const meal_types = sqliteTable("meal_types", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});
