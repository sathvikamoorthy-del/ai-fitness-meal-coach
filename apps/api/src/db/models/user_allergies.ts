// knm-generated: db-design table=user_allergies hash=eba66145535e64ca; generated from the DB design, edit the design and regenerate
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const user_allergies = sqliteTable("user_allergies", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // not mapped: UQ (user_id, name)
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_user_allergies_user_id").on(t.user_id),
]);
