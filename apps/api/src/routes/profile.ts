// Profile and daily calorie target (REQ-406, WI-070). Both routes need a signed-in user (requireAuth; sessionCheck runs globally).
//   GET /profile -> 200 { profile } (six fields + dailyCalorieTarget, or null when the user has no profile yet)
//   PUT /profile { age, sex, heightCm, weightKg, goal, fitnessLevel }
//     -> 200 { profile, profileComplete: true }
//     -> 400 { error: 'invalid-profile', fields: { <field>: message } }      nothing saved
//     -> 400 { error: 'calorie-target-too-low', message }                     nothing saved (WI-070 q1: target <= 0 kcal)
// The browser calls these as /api/profile (the proxy strips /api). PUT never touches diet_type (REQ-407) or the daily water
// target (database default 2000 on a new row), and neither is returned: they are not shown on the profile.
import { eq, sql } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { RouteEntry, wrapAsync } from '../http/app';
import type { Orm } from '../db/orm';
import { profiles } from '../db/models/profiles';
import { requireAuth } from '../auth/authMiddleware';
import type { AuthClaims } from '../auth/jwt';
import { CALORIE_TARGET_TOO_LOW_MESSAGE, dailyCalorieTarget } from '../profile/calorieTarget';
import { validateProfile } from '../profile/profileRules';

type Row = typeof profiles.$inferSelect;

const toProfile = (row: Row) => ({
  age: row.age ?? null,
  sex: row.sex ?? null,
  heightCm: row.height_cm ?? null,
  weightKg: row.weight_kg ?? null,
  goal: row.goal_type ?? null,
  fitnessLevel: row.fitness_level ?? null,
  dailyCalorieTarget: row.daily_calorie_target ?? null
});

const ormOf = (req: Request) => req.app.get('orm') as Orm;
const userIdOf = (req: Request) => (req as Request & { auth: AuthClaims }).auth.userId;

async function readRow(orm: Orm, userId: string): Promise<Row | undefined> {
  const [row] = await orm.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  return row;
}

async function getProfile(req: Request, res: Response) {
  const row = await readRow(ormOf(req), userIdOf(req));
  res.json({ profile: row ? toProfile(row) : null });
}

async function putProfile(req: Request, res: Response) {
  const result = validateProfile(req.body);
  if (!result.ok) return void res.status(400).json({ error: 'invalid-profile', fields: result.fields });
  const p = result.value;

  const target = dailyCalorieTarget({ sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, goal: p.goal });
  if (target <= 0) return void res.status(400).json({ error: 'calorie-target-too-low', message: CALORIE_TARGET_TOO_LOW_MESSAGE });

  const values = {
    age: p.age, sex: p.sex, height_cm: p.heightCm, weight_kg: p.weightKg,
    goal_type: p.goal, fitness_level: p.fitnessLevel, daily_calorie_target: target
  };
  const orm = ormOf(req);
  const userId = userIdOf(req);
  await orm.insert(profiles).values({ user_id: userId, ...values })
    .onConflictDoUpdate({ target: profiles.user_id, set: { ...values, updated_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))` } });

  res.json({ profile: toProfile((await readRow(orm, userId))!), profileComplete: true });
}

export const profileRoute: RouteEntry = {
  id: 'profile',
  mount: (router: Router) => {
    router.get('/profile', requireAuth, wrapAsync(getProfile));
    router.put('/profile', requireAuth, wrapAsync(putProfile));
  }
};
