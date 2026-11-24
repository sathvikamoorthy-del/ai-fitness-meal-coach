// Daily calorie target (REQ-406, WI-070). The only place the formula lives; the daily summary (REQ-418) only reads the
// stored value, and a weight logged later (REQ-419) must not call this.
//   base   = 10 x weight_kg + 6.25 x height_cm - 5 x age, +5 male / -161 female   (Mifflin-St Jeor)
//   target = base x 1.4, then -500 lose / +300 gain / 0 maintain, rounded to the nearest whole kcal
export type Sex = 'female' | 'male';
export type Goal = 'lose' | 'gain' | 'maintain';

export interface CalorieInput { sex: Sex; age: number; heightCm: number; weightKg: number; goal: Goal }

export const ACTIVITY_FACTOR = 1.4;
export const GOAL_ADJUSTMENT: Record<Goal, number> = { lose: -500, gain: 300, maintain: 0 };

export function dailyCalorieTarget({ sex, age, heightCm, weightKg, goal }: CalorieInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  return Math.round(base * ACTIVITY_FACTOR + GOAL_ADJUSTMENT[goal]);
}

/** WI-070 q1: a target of 0 kcal or less is refused with this message, and nothing is saved. */
export const CALORIE_TARGET_TOO_LOW_MESSAGE = 'This goal gives a calorie target that is too low; choose maintain or gain weight.';
