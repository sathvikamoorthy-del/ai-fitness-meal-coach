// Diet preference and allergies (REQ-407, WI-071): a section of the Profile screen with its own Save (q1), so its own
// endpoint. Both routes need a signed-in user (requireAuth; sessionCheck runs globally).
//   GET /profile/diet -> 200 { diet, allergies }   (diet null when unset; allergies sorted ignoring case)
//   PUT /profile/diet { diet, allergies }
//     -> 200 { diet, allergies }
//     -> 400 { error: 'invalid-diet', fields: { diet?, allergies? } }   nothing changed
// The saved allergy list becomes exactly the sent list. Diet and allergies are written in one batch. The six REQ-406
// profile fields and the calorie target are never touched. The browser calls these as /api/profile/diet.
import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { RouteEntry, wrapAsync } from '../http/app';
import type { Orm } from '../db/orm';
import { profiles } from '../db/models/profiles';
import { user_allergies } from '../db/models/user_allergies';
import { requireAuth } from '../auth/authMiddleware';
import type { AuthClaims } from '../auth/jwt';
import { sortAllergies, validateDiet } from '../profile/dietRules';

const ormOf = (req: Request) => req.app.get('orm') as Orm;
const userIdOf = (req: Request) => (req as Request & { auth: AuthClaims }).auth.userId;
const NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

async function readDiet(orm: Orm, userId: string) {
  const [row] = await orm.select({ diet: profiles.diet_type }).from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  const names = await orm.select({ name: user_allergies.name }).from(user_allergies).where(eq(user_allergies.user_id, userId));
  return { diet: row?.diet ?? null, allergies: sortAllergies(names.map((n) => n.name)) };
}

async function getDiet(req: Request, res: Response) {
  res.json(await readDiet(ormOf(req), userIdOf(req)));
}

async function putDiet(req: Request, res: Response) {
  const result = validateDiet(req.body);
  if (!result.ok) return void res.status(400).json({ error: 'invalid-diet', fields: result.fields });
  const { diet, allergies } = result.value;
  const orm = ormOf(req);
  const userId = userIdOf(req);

  const [existing] = await orm.select({ user_id: profiles.user_id }).from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  const dietWrite = existing
    ? [orm.update(profiles).set({ diet_type: diet, updated_at: NOW }).where(eq(profiles.user_id, userId))]
    : diet !== null
      ? [orm.insert(profiles).values({ user_id: userId, diet_type: diet })
          .onConflictDoUpdate({ target: profiles.user_id, set: { diet_type: diet, updated_at: NOW } })]   // a concurrent first save
      : [];   // no profile and no diet: nothing to store
  const allergyWrites = [
    orm.delete(user_allergies).where(eq(user_allergies.user_id, userId)),
    ...allergies.map((name) => orm.insert(user_allergies).values({ id: crypto.randomUUID(), user_id: userId, name }))
  ];
  await orm.batch([...dietWrite, ...allergyWrites] as [any, ...any[]]);   // all or nothing

  res.json(await readDiet(orm, userId));
}

export const dietRoute: RouteEntry = {
  id: 'diet',
  mount: (router: Router) => {
    router.get('/profile/diet', requireAuth, wrapAsync(getDiet));
    router.put('/profile/diet', requireAuth, wrapAsync(putDiet));
  }
};
