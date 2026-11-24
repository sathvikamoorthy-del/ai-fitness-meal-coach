// Exercise library (REQ-408, WI-072): read-only list of the seeded exercises (0004_seed_exercises.sql).
//   GET /exercises -> 200 { exercises: [{ id, name }] }, A-Z ignoring letter case
// Needs a signed-in user (requireAuth; sessionCheck runs globally). There is no search parameter: the web app filters
// the loaded list (about 40 rows) as the user types. The browser calls this as /api/exercises.
import { sql } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { RouteEntry, wrapAsync } from '../http/app';
import type { Orm } from '../db/orm';
import { exercises } from '../db/models/exercises';
import { requireAuth } from '../auth/authMiddleware';

async function listExercises(req: Request, res: Response) {
  const orm = req.app.get('orm') as Orm;
  const rows = await orm.select({ id: exercises.id, name: exercises.name }).from(exercises)
    .orderBy(sql`${exercises.name} COLLATE NOCASE`, exercises.id);
  res.json({ exercises: rows });
}

export const exercisesRoute: RouteEntry = {
  id: 'exercises',
  mount: (router: Router) => {
    router.get('/exercises', requireAuth, wrapAsync(listExercises));
  }
};
