// knm-generated: db-design table=goal_types hash=faf3d59d746a66ef; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const goal_types = sqliteTable("goal_types", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});
