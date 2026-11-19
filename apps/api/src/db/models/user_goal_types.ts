// knm-generated: db-design table=user_goal_types hash=15a91c2f7e27bbf0; generated from the DB design, edit the design and regenerate
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const user_goal_types = sqliteTable("user_goal_types", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  unit: text("unit").notNull(),
});
