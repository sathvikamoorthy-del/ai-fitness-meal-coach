// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
import { aiPlanProvider } from '../ai/planGenerator'; // app provider (outside the knm markers)
// knm:imports
import { ormProvider } from '../db/orm'; // knm:module drizzle-sqlite
import { databaseProvider } from '../db/provider'; // knm:module sqlite-database

export const providers = [
  // knm:entries
  { id: 'sqlite-database', register: databaseProvider }, // knm:module sqlite-database
  { id: 'drizzle-sqlite', register: ormProvider }, // knm:module drizzle-sqlite
  // knm:entries-end
  { id: 'ai-plan-generator', register: aiPlanProvider }, // app provider (outside the knm markers)
];
