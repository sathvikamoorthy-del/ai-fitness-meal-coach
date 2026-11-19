// knm-generated: db-design table=diet_types hash=8ef5e4682fc7be7e; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const diet_types = sqliteTable("diet_types", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});
