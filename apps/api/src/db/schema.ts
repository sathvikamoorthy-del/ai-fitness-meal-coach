// The app's tables, as Drizzle definitions. The app tables are generated from docs/project/db_design.md into ./models
// (one file per table, knm-generated: change the design and run /knm:implement-db-design, do not edit them by hand).
// Their SQL is in ./migrations (applied with `npm run db:migrate`).
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export * from './models';

// Starter table of the drizzle-sqlite module. It is not part of the DB design and no migration creates it; it is kept
// only because the module's contract and fit tests (tests/modules/drizzle-sqlite) use it with their own in-memory table.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull()
});

export type Setting = typeof settings.$inferSelect;
