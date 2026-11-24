// Workout plan rules (REQ-410, WI-073). The web app has the same rules (apps/web/src/features/workouts/planRules.ts) to
// check before sending; this one is the authority. Every problem is listed, in day order, each naming its day.
//   exactly seven days, Day 1 to Day 7 (an empty day is a rest day)
//   each exercise from the library; sets 1-10 and reps 1-100, whole numbers
//   the same exercise at most once per day; at most 15 exercises per day; at least one exercise in the plan
export const DAYS = 7;
export const SETS = [1, 10] as const;
export const REPS = [1, 100] as const;
export const MAX_EXERCISES_PER_DAY = 15;

export const PLAN_MESSAGES = {
  days: 'A plan has exactly seven days, Day 1 to Day 7.',
  exercise: (day: number) => `Day ${day}: Choose an exercise from the library.`,
  sets: (day: number) => `Day ${day}: Sets must be a whole number from ${SETS[0]} to ${SETS[1]}.`,
  reps: (day: number) => `Day ${day}: Reps must be a whole number from ${REPS[0]} to ${REPS[1]}.`,
  duplicate: (day: number, name: string) => `Day ${day}: ${name} is already in this day.`,
  tooMany: (day: number) => `Day ${day}: A day can have at most ${MAX_EXERCISES_PER_DAY} exercises.`,
  empty: 'Add at least one exercise to the plan.'
};

export interface PlanExercise { exerciseId: string; sets: number; reps: number }
export interface PlanDay { dayNumber: number; exercises: PlanExercise[] }
export interface PlanInput { days: PlanDay[] }
export type PlanValidation = { ok: true; value: PlanInput } | { ok: false; errors: string[] };

const wholeIn = (v: unknown, [min, max]: readonly [number, number]) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** `library` maps exercise id to name (the exercise library, REQ-408). */
export function validatePlan(body: unknown, library: Map<string, string>): PlanValidation {
  const days = (body && typeof body === 'object' ? (body as Record<string, unknown>).days : undefined);
  if (!Array.isArray(days) || days.length !== DAYS
    || days.some((d, i) => !d || typeof d !== 'object' || (d as any).dayNumber !== i + 1 || !Array.isArray((d as any).exercises))) {
    return { ok: false, errors: [PLAN_MESSAGES.days] };
  }

  const errors: string[] = [];
  let total = 0;
  const value: PlanDay[] = [];
  for (const d of days as { dayNumber: number; exercises: unknown[] }[]) {
    const day = d.dayNumber;
    const dayErrors = new Set<string>();
    const seen = new Set<string>();
    const exercises: PlanExercise[] = [];
    for (const raw of d.exercises) {
      const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const id = typeof e.exerciseId === 'string' ? e.exerciseId : '';
      if (!library.has(id)) { dayErrors.add(PLAN_MESSAGES.exercise(day)); continue; }
      if (!wholeIn(e.sets, SETS)) dayErrors.add(PLAN_MESSAGES.sets(day));
      if (!wholeIn(e.reps, REPS)) dayErrors.add(PLAN_MESSAGES.reps(day));
      if (seen.has(id)) dayErrors.add(PLAN_MESSAGES.duplicate(day, library.get(id)!));
      seen.add(id);
      exercises.push({ exerciseId: id, sets: e.sets as number, reps: e.reps as number });
    }
    if (d.exercises.length > MAX_EXERCISES_PER_DAY) dayErrors.add(PLAN_MESSAGES.tooMany(day));
    total += d.exercises.length;
    errors.push(...dayErrors);
    value.push({ dayNumber: day, exercises });
  }
  if (total === 0) errors.push(PLAN_MESSAGES.empty);

  return errors.length ? { ok: false, errors } : { ok: true, value: { days: value } };
}
