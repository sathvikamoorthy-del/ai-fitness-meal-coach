// knm-generated: db-design table=plan_sources hash=fd4048e819853731; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const plan_sources = sqliteTable("plan_sources", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});
