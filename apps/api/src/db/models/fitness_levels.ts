// knm-generated: db-design table=fitness_levels hash=10605d8515422e65; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const fitness_levels = sqliteTable("fitness_levels", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});
