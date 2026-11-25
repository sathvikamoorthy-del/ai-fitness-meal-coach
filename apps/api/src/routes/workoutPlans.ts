// Workout plans (REQ-410, WI-073). Every route needs a signed-in user (requireAuth; sessionCheck runs globally). A plan of
// another user, or one that does not exist, answers 404. The browser calls these as /api/workout-plans...
//   GET    /workout-plans               -> 200 { plans: [{ id, source, isActive, createdAt }] }   newest first
//   POST   /workout-plans { days }      -> 201 { plan }   a manual plan, made active        | 400 invalid-plan { errors }
//   GET    /workout-plans/:id           -> 200 { plan }   all seven days, exercises in position order, [] = rest day
//   PUT    /workout-plans/:id { days }  -> 200 { plan }   manual only, active status kept   | 400 | 403 not-editable
//   DELETE /workout-plans/:id           -> 204            manual and AI plans (REQ-409, WI-074 q2)
//   POST   /workout-plans/:id/activate  -> 200 { plan }   any plan of the user
//   POST   /workout-plans/generate      -> 201 { plan }   an AI plan, made active (REQ-409, WI-074)
//                                        | 400 profile-incomplete (any of the six profile fields missing; no AI call)
//                                        | 502 ai-failed (two tries without a valid plan; nothing saved)
// Each write is one batch (all or nothing). The previously active plan is cleared before another is set active, because
// the database allows one active plan per user (uq_workout_plans_one_active).
import crypto from 'crypto';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { RouteEntry, wrapAsync } from '../http/app';
import type { Orm } from '../db/orm';
import { exercises } from '../db/models/exercises';
import { workout_plans } from '../db/models/workout_plans';
import { workout_plan_days } from '../db/models/workout_plan_days';
import { workout_plan_exercises } from '../db/models/workout_plan_exercises';
import { requireAuth } from '../auth/authMiddleware';
import type { AuthClaims } from '../auth/jwt';
import { profiles } from '../db/models/profiles';
import { DAYS, PlanInput, validatePlan } from '../workouts/planRules';
import { checkAiPlan } from '../workouts/aiPlanRules';
import type { AiPlanProfile, PlanGenerator } from '../ai/planGenerator';

const AI_TRIES = 2;   // the first try and one automatic retry on a broken plan (WI-074 q5)

const NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;
const ormOf = (req: Request) => req.app.get('orm') as Orm;
const userIdOf = (req: Request) => (req as Request & { auth: AuthClaims }).auth.userId;

async function library(orm: Orm): Promise<Map<string, string>> {
  const rows = await orm.select({ id: exercises.id, name: exercises.name }).from(exercises);
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function ownPlan(orm: Orm, userId: string, id: string) {
  const [plan] = await orm.select().from(workout_plans).where(and(eq(workout_plans.id, id), eq(workout_plans.user_id, userId))).limit(1);
  return plan;
}

async function readPlan(orm: Orm, plan: typeof workout_plans.$inferSelect) {
  const days = await orm.select().from(workout_plan_days).where(eq(workout_plan_days.workout_plan_id, plan.id)).orderBy(asc(workout_plan_days.day_number));
  const dayIds = days.map((d) => d.id);
  const rows = dayIds.length
    ? await orm.select({ dayId: workout_plan_exercises.workout_plan_day_id, exerciseId: workout_plan_exercises.exercise_id, name: exercises.name, sets: workout_plan_exercises.sets, reps: workout_plan_exercises.reps })
        .from(workout_plan_exercises).innerJoin(exercises, eq(exercises.id, workout_plan_exercises.exercise_id))
        .where(inArray(workout_plan_exercises.workout_plan_day_id, dayIds)).orderBy(asc(workout_plan_exercises.position))
    : [];
  const byDay = new Map(days.map((d) => [d.day_number, d.id]));
  return {
    id: plan.id, source: plan.source, isActive: plan.is_active === 1, createdAt: plan.created_at,
    days: Array.from({ length: DAYS }, (_, i) => ({
      dayNumber: i + 1,
      exercises: rows.filter((r) => r.dayId === byDay.get(i + 1)).map(({ exerciseId, name, sets, reps }) => ({ exerciseId, name, sets, reps }))
    }))
  };
}

/** Inserts for the seven days and their exercises (position 1..n per day, in the order sent). */
function dayInserts(orm: Orm, planId: string, input: PlanInput) {
  const writes: any[] = [];
  for (const day of input.days) {
    const dayId = crypto.randomUUID();
    writes.push(orm.insert(workout_plan_days).values({ id: dayId, workout_plan_id: planId, day_number: day.dayNumber }));
    day.exercises.forEach((e, i) => writes.push(orm.insert(workout_plan_exercises).values({
      id: crypto.randomUUID(), workout_plan_day_id: dayId, exercise_id: e.exerciseId, position: i + 1, sets: e.sets, reps: e.reps
    })));
  }
  return writes;
}

/** Deletes a plan's exercises, then its days (explicitly, not relying on ON DELETE CASCADE). */
function dayDeletes(orm: Orm, planId: string) {
  const dayIds = orm.select({ id: workout_plan_days.id }).from(workout_plan_days).where(eq(workout_plan_days.workout_plan_id, planId));
  return [
    orm.delete(workout_plan_exercises).where(inArray(workout_plan_exercises.workout_plan_day_id, dayIds)),
    orm.delete(workout_plan_days).where(eq(workout_plan_days.workout_plan_id, planId))
  ];
}

const batch = (orm: Orm, writes: any[]) => orm.batch(writes as [any, ...any[]]);

async function listPlans(req: Request, res: Response) {
  const rows = await ormOf(req).select().from(workout_plans).where(eq(workout_plans.user_id, userIdOf(req)))
    .orderBy(desc(workout_plans.created_at), desc(workout_plans.id));
  res.json({ plans: rows.map((p) => ({ id: p.id, source: p.source, isActive: p.is_active === 1, createdAt: p.created_at })) });
}

/** Saves a new plan of the user as the active one (the previous active plan is cleared first), in one batch. */
async function saveNewActivePlan(orm: Orm, userId: string, source: 'manual' | 'ai', input: PlanInput) {
  const id = crypto.randomUUID();
  await batch(orm, [
    orm.update(workout_plans).set({ is_active: 0, updated_at: NOW }).where(and(eq(workout_plans.user_id, userId), eq(workout_plans.is_active, 1))),
    orm.insert(workout_plans).values({ id, user_id: userId, source, is_active: 1 }),
    ...dayInserts(orm, id, input)
  ]);
  return readPlan(orm, (await ownPlan(orm, userId, id))!);
}

async function createPlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const result = validatePlan(req.body, await library(orm));
  if (!result.ok) return void res.status(400).json({ error: 'invalid-plan', errors: result.errors });
  res.status(201).json({ plan: await saveNewActivePlan(orm, userIdOf(req), 'manual', result.value) });
}

/** The six REQ-406 fields, or null when the profile is missing or any of them is empty (WI-074 q6). */
async function completeProfile(orm: Orm, userId: string): Promise<AiPlanProfile | null> {
  const [p] = await orm.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  if (!p || p.age == null || !p.sex || p.height_cm == null || p.weight_kg == null || !p.goal_type || !p.fitness_level) return null;
  return { age: p.age, sex: p.sex, heightCm: p.height_cm, weightKg: p.weight_kg, goal: p.goal_type, fitnessLevel: p.fitness_level };
}

async function generatePlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const userId = userIdOf(req);
  const profile = await completeProfile(orm, userId);
  if (!profile) return void res.status(400).json({ error: 'profile-incomplete' });
  const generator = req.app.get('planGenerator') as PlanGenerator | undefined;
  if (!generator) throw new Error('no plan generator registered (app.get("planGenerator") is empty)');
  const lib = await library(orm);
  const exerciseList = [...lib].map(([id, name]) => ({ id, name }));
  for (let attempt = 1; attempt <= AI_TRIES; attempt++) {
    try {
      const checked = checkAiPlan(await generator({ profile, library: exerciseList }), lib);
      if (checked.ok) return void res.status(201).json({ plan: await saveNewActivePlan(orm, userId, 'ai', checked.value) });
      console.warn(`AI plan try ${attempt} broke the rules: ${checked.errors.join(' ')}`);
    } catch (err) {
      console.warn(`AI plan try ${attempt} failed: ${err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error'}`);
    }
  }
  res.status(502).json({ error: 'ai-failed' });
}

async function getPlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const plan = await ownPlan(orm, userIdOf(req), req.params.id);
  if (!plan) return void res.status(404).json({ error: 'not-found' });
  res.json({ plan: await readPlan(orm, plan) });
}

async function updatePlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const plan = await ownPlan(orm, userIdOf(req), req.params.id);
  if (!plan) return void res.status(404).json({ error: 'not-found' });
  if (plan.source !== 'manual') return void res.status(403).json({ error: 'not-editable' });
  const result = validatePlan(req.body, await library(orm));
  if (!result.ok) return void res.status(400).json({ error: 'invalid-plan', errors: result.errors });
  await batch(orm, [
    ...dayDeletes(orm, plan.id),
    ...dayInserts(orm, plan.id, result.value),
    orm.update(workout_plans).set({ updated_at: NOW }).where(eq(workout_plans.id, plan.id))   // is_active unchanged
  ]);
  res.json({ plan: await readPlan(orm, (await ownPlan(orm, plan.user_id, plan.id))!) });
}

async function deletePlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const plan = await ownPlan(orm, userIdOf(req), req.params.id);
  if (!plan) return void res.status(404).json({ error: 'not-found' });
  await batch(orm, [...dayDeletes(orm, plan.id), orm.delete(workout_plans).where(eq(workout_plans.id, plan.id))]);
  res.status(204).end();
}

async function activatePlan(req: Request, res: Response) {
  const orm = ormOf(req);
  const userId = userIdOf(req);
  const plan = await ownPlan(orm, userId, req.params.id);
  if (!plan) return void res.status(404).json({ error: 'not-found' });
  if (plan.is_active !== 1) {
    await batch(orm, [
      orm.update(workout_plans).set({ is_active: 0, updated_at: NOW }).where(and(eq(workout_plans.user_id, userId), ne(workout_plans.id, plan.id), eq(workout_plans.is_active, 1))),
      orm.update(workout_plans).set({ is_active: 1, updated_at: NOW }).where(eq(workout_plans.id, plan.id))
    ]);
  }
  res.json({ plan: await readPlan(orm, (await ownPlan(orm, userId, plan.id))!) });
}

export const workoutPlansRoute: RouteEntry = {
  id: 'workout-plans',
  mount: (router: Router) => {
    router.get('/workout-plans', requireAuth, wrapAsync(listPlans));
    router.post('/workout-plans', requireAuth, wrapAsync(createPlan));
    router.post('/workout-plans/generate', requireAuth, wrapAsync(generatePlan));
    router.get('/workout-plans/:id', requireAuth, wrapAsync(getPlan));
    router.put('/workout-plans/:id', requireAuth, wrapAsync(updatePlan));
    router.delete('/workout-plans/:id', requireAuth, wrapAsync(deletePlan));
    router.post('/workout-plans/:id/activate', requireAuth, wrapAsync(activatePlan));
  }
};
