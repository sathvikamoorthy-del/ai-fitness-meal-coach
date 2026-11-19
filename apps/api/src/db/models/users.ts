// knm-generated: db-design table=users hash=032a3bf8a723ff1c; generated from the DB design, edit the design and regenerate
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(), // not mapped: COLLATE NOCASE
  password_hash: text("password_hash").notNull(),
  created_at: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updated_at: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [
  index("idx_users_email").on(t.email),
]);
