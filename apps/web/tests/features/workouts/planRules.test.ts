// Workout plan rules (REQ-410, WI-073): same messages and range ends as the API rules; plan label.
import { canAdd, checkPlan, planLabel, PlanDay } from '../../../src/features/workouts/planRules';

const library = new Map([['sq', 'Back squat'], ['bp', 'Bench press']]);
const plan = (perDay: Record<number, [string, number, number][]> = {}): PlanDay[] =>
  Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, exercises: (perDay[i + 1] ?? []).map(([exerciseId, sets, reps]) => ({ exerciseId, sets, reps })) }));
const bigLibrary = new Map(Array.from({ length: 20 }, (_, i) => [`x${i}`, `Exercise ${i}`] as [string, string]));
const many = (n: number): [string, number, number][] => Array.from({ length: n }, (_, i) => [`x${i}`, 3, 10]);

describe('checkPlan', () => {
  it('accepts a valid plan with rest days', () => {
    expect(checkPlan(plan({ 1: [['sq', 1, 1], ['bp', 10, 100]] }), library)).toEqual([]);
  });

  it('checks sets 1-10 and reps 1-100 as whole numbers', () => {
    for (const sets of [0, 11, 2.5, Number.NaN]) expect(checkPlan(plan({ 2: [['sq', sets, 8]] }), library)).toEqual(['Day 2: Sets must be a whole number from 1 to 10.']);
    for (const reps of [0, 101, 8.5, Number.NaN]) expect(checkPlan(plan({ 3: [['sq', 3, reps]] }), library)).toEqual(['Day 3: Reps must be a whole number from 1 to 100.']);
  });

  it('refuses a duplicate in a day, an unknown exercise, a 16th exercise and an empty plan', () => {
    expect(checkPlan(plan({ 4: [['sq', 3, 8], ['sq', 3, 8]] }), library)).toEqual(['Day 4: Back squat is already in this day.']);
    expect(checkPlan(plan({ 5: [['zumba', 3, 8]] }), library)).toEqual(['Day 5: Choose an exercise from the library.']);
    expect(checkPlan(plan({ 1: many(15) }), bigLibrary)).toEqual([]);
    expect(checkPlan(plan({ 1: many(16) }), bigLibrary)).toEqual(['Day 1: A day can have at most 15 exercises.']);
    expect(checkPlan(plan(), library)).toEqual(['Add at least one exercise to the plan.']);
    expect(checkPlan(plan().slice(0, 6), library)).toEqual(['A plan has exactly seven days, Day 1 to Day 7.']);
  });
});

describe('canAdd', () => {
  const day = (exercises: [string, number, number][]) => plan({ 1: exercises })[0];
  it('allows a new exercise and explains a refusal', () => {
    expect(canAdd(day([]), 'sq', library)).toBeNull();
    expect(canAdd(day([]), '', library)).toBe('Day 1: Choose an exercise from the library.');
    expect(canAdd(day([['sq', 3, 8]]), 'sq', library)).toBe('Day 1: Back squat is already in this day.');
    expect(canAdd(plan({ 1: many(15) })[0], 'x15', bigLibrary)).toBe('Day 1: A day can have at most 15 exercises.');
  });
});

describe('planLabel', () => {
  it('shows the source and the creation date', () => {
    expect(planLabel('manual', '2026-11-24T10:00:00.000Z')).toBe('My plan · 24 Nov 2026');
    expect(planLabel('ai', '2026-11-20T10:00:00.000Z')).toBe('AI plan · 20 Nov 2026');
  });
});
