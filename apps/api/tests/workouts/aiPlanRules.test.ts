// AI plan rules (REQ-409, WI-074 q4): the manual-plan rules plus 2 to 6 workout days.
import { checkAiPlan } from '../../src/workouts/aiPlanRules';
import { planSchema } from '../../src/ai/planGenerator';

const library = new Map([['sq', 'Back squat'], ['bp', 'Bench press']]);
const plan = (workoutDays: number[], exercise: [string, number, number] = ['sq', 3, 8]) => ({
  days: Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    exercises: workoutDays.includes(i + 1) ? [{ exerciseId: exercise[0], sets: exercise[1], reps: exercise[2] }] : []
  }))
});

describe('checkAiPlan', () => {
  it('accepts 2 to 6 workout days, back-to-back days included', () => {
    for (const days of [[1, 4], [1, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4, 5, 6]]) expect(checkAiPlan(plan(days), library).ok).toBe(true);
  });

  it('refuses fewer than 2 or more than 6 workout days', () => {
    for (const days of [[3], [1, 2, 3, 4, 5, 6, 7]]) expect(checkAiPlan(plan(days), library)).toEqual({ ok: false, errors: ['An AI plan has 2 to 6 workout days.'] });
  });

  it('applies the manual-plan rules first: library, sets, reps, seven days, empty plan', () => {
    expect(checkAiPlan(plan([1, 3], ['zumba', 3, 8]), library)).toEqual({ ok: false, errors: ['Day 1: Choose an exercise from the library.', 'Day 3: Choose an exercise from the library.'] });
    expect(checkAiPlan(plan([2, 4], ['sq', 11, 8]), library).ok).toBe(false);
    expect(checkAiPlan(plan([2, 4], ['sq', 3, 101]), library).ok).toBe(false);
    expect(checkAiPlan({ days: plan([1, 3]).days.slice(0, 6) }, library)).toEqual({ ok: false, errors: ['A plan has exactly seven days, Day 1 to Day 7.'] });
    expect(checkAiPlan(plan([]), library)).toEqual({ ok: false, errors: ['Add at least one exercise to the plan.'] });
    expect(checkAiPlan('not a plan', library).ok).toBe(false);
  });
});

describe('planSchema', () => {
  it('only allows library exercise ids and Day 1 to 7, with no extra fields', () => {
    const s = planSchema(['sq', 'bp']) as any;
    const day = s.properties.days.items;
    const exercise = day.properties.exercises.items;
    expect(exercise.properties.exerciseId.enum).toEqual(['sq', 'bp']);
    expect(day.properties.dayNumber.enum).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect([s.additionalProperties, day.additionalProperties, exercise.additionalProperties]).toEqual([false, false, false]);
    expect(exercise.required).toEqual(['exerciseId', 'sets', 'reps']);
  });
});
