// Workout plan rules (REQ-410, WI-073).
import { validatePlan } from '../../src/workouts/planRules';

const library = new Map([['sq', 'Back squat'], ['bp', 'Bench press'], ['dl', 'Deadlift']]);
const plan = (perDay: Record<number, { exerciseId: string; sets: unknown; reps: unknown }[]> = {}) =>
  ({ days: Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, exercises: perDay[i + 1] ?? [] })) });
const errorsOf = (body: unknown) => { const r = validatePlan(body, library); return r.ok ? [] : r.errors; };
const many = (n: number) => Array.from({ length: n }, (_, i) => ({ exerciseId: `x${i}`, sets: 3, reps: 10 }));
const bigLibrary = new Map(Array.from({ length: 20 }, (_, i) => [`x${i}`, `Exercise ${i}`] as [string, string]));

describe('validatePlan', () => {
  it('accepts a plan with exercises on some days and rest days elsewhere', () => {
    const body = plan({ 1: [{ exerciseId: 'sq', sets: 3, reps: 8 }, { exerciseId: 'bp', sets: 3, reps: 10 }], 4: [{ exerciseId: 'sq', sets: 5, reps: 5 }] });
    expect(validatePlan(body, library)).toEqual({ ok: true, value: body });
  });

  it('needs exactly Day 1 to Day 7 in order', () => {
    const msg = ['A plan has exactly seven days, Day 1 to Day 7.'];
    expect(errorsOf({})).toEqual(msg);
    expect(errorsOf({ days: plan().days.slice(0, 6) })).toEqual(msg);
    expect(errorsOf({ days: [...plan().days].reverse() })).toEqual(msg);
    expect(errorsOf({ days: plan().days.map((d, i) => (i === 2 ? { dayNumber: 3 } : d)) })).toEqual(msg);
  });

  it('checks sets 1-10 and reps 1-100 as whole numbers (ends included)', () => {
    expect(validatePlan(plan({ 1: [{ exerciseId: 'sq', sets: 1, reps: 1 }, { exerciseId: 'bp', sets: 10, reps: 100 }] }), library).ok).toBe(true);
    for (const sets of [0, 11, 2.5, '3', null]) expect(errorsOf(plan({ 2: [{ exerciseId: 'sq', sets, reps: 8 }] }))).toEqual(['Day 2: Sets must be a whole number from 1 to 10.']);
    for (const reps of [0, 101, 8.5, '8']) expect(errorsOf(plan({ 3: [{ exerciseId: 'sq', sets: 3, reps }] }))).toEqual(['Day 3: Reps must be a whole number from 1 to 100.']);
  });

  it('refuses an exercise that is not in the library', () => {
    expect(errorsOf(plan({ 5: [{ exerciseId: 'zumba', sets: 3, reps: 8 }] }))).toEqual(['Day 5: Choose an exercise from the library.']);
  });

  it('refuses the same exercise twice in one day, but allows it on other days', () => {
    expect(errorsOf(plan({ 3: [{ exerciseId: 'sq', sets: 3, reps: 8 }, { exerciseId: 'sq', sets: 5, reps: 5 }] }))).toEqual(['Day 3: Back squat is already in this day.']);
    expect(validatePlan(plan({ 1: [{ exerciseId: 'sq', sets: 3, reps: 8 }], 2: [{ exerciseId: 'sq', sets: 3, reps: 8 }] }), library).ok).toBe(true);
  });

  it('allows 15 exercises in a day and refuses 16', () => {
    expect(validatePlan(plan({ 1: many(15) }), bigLibrary).ok).toBe(true);
    const r = validatePlan(plan({ 1: many(16) }), bigLibrary);
    expect(r.ok ? [] : r.errors).toEqual(['Day 1: A day can have at most 15 exercises.']);
  });

  it('refuses a plan with no exercises at all', () => {
    expect(errorsOf(plan())).toEqual(['Add at least one exercise to the plan.']);
  });

  it('lists every problem in day order', () => {
    expect(errorsOf(plan({
      2: [{ exerciseId: 'sq', sets: 11, reps: 8 }],
      5: [{ exerciseId: 'bp', sets: 3, reps: 0 }, { exerciseId: 'bp', sets: 3, reps: 8 }]
    }))).toEqual([
      'Day 2: Sets must be a whole number from 1 to 10.',
      'Day 5: Reps must be a whole number from 1 to 100.',
      'Day 5: Bench press is already in this day.'
    ]);
  });
});
