// knm-generated: db-design table=sessions hash=8dccec8fb23d634e; generated from the DB design, edit the design and regenerate
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_sessions_user_id").on(t.user_id),
  index("idx_sessions_expires_at").on(t.expires_at),
]);
