// Workout plan rules (REQ-410, WI-073): the same rules and messages as the API (apps/api/src/workouts/planRules.ts), used
// to check before sending. The API is the authority. Also the plan label shown in the list.
export const DAYS = 7;
export const SETS = [1, 10] as const;
export const REPS = [1, 100] as const;
export const MAX_EXERCISES_PER_DAY = 15;
export const DEFAULT_SETS = 3;   // starting values for a newly added exercise (WI-073 assumption, accepted)
export const DEFAULT_REPS = 10;

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

const wholeIn = (v: number, [min, max]: readonly [number, number]) => Number.isInteger(v) && v >= min && v <= max;

/** Every problem in day order; an empty list means the plan can be sent. `library` maps exercise id to name. */
export function checkPlan(days: PlanDay[], library: Map<string, string>): string[] {
  if (days.length !== DAYS || days.some((d, i) => d.dayNumber !== i + 1)) return [PLAN_MESSAGES.days];
  const errors: string[] = [];
  let total = 0;
  for (const d of days) {
    const dayErrors = new Set<string>();
    const seen = new Set<string>();
    for (const e of d.exercises) {
      if (!library.has(e.exerciseId)) { dayErrors.add(PLAN_MESSAGES.exercise(d.dayNumber)); continue; }
      if (!wholeIn(e.sets, SETS)) dayErrors.add(PLAN_MESSAGES.sets(d.dayNumber));
      if (!wholeIn(e.reps, REPS)) dayErrors.add(PLAN_MESSAGES.reps(d.dayNumber));
      if (seen.has(e.exerciseId)) dayErrors.add(PLAN_MESSAGES.duplicate(d.dayNumber, library.get(e.exerciseId)!));
      seen.add(e.exerciseId);
    }
    if (d.exercises.length > MAX_EXERCISES_PER_DAY) dayErrors.add(PLAN_MESSAGES.tooMany(d.dayNumber));
    total += d.exercises.length;
    errors.push(...dayErrors);
  }
  if (total === 0) errors.push(PLAN_MESSAGES.empty);
  return errors;
}

/** Why one more exercise cannot be added to a day, or null when it can. */
export function canAdd(day: PlanDay, exerciseId: string, library: Map<string, string>): string | null {
  if (!library.has(exerciseId)) return PLAN_MESSAGES.exercise(day.dayNumber);
  if (day.exercises.some((e) => e.exerciseId === exerciseId)) return PLAN_MESSAGES.duplicate(day.dayNumber, library.get(exerciseId)!);
  if (day.exercises.length >= MAX_EXERCISES_PER_DAY) return PLAN_MESSAGES.tooMany(day.dayNumber);
  return null;
}

/** "My plan · 24 Nov 2026" / "AI plan · 24 Nov 2026", from the source and created_at, in the browser's local time. */
export function planLabel(source: string, createdAt: string): string {
  const date = new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${source === 'ai' ? 'AI plan' : 'My plan'} · ${date}`;
}
