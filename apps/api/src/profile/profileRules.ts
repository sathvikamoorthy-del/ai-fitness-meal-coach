// Profile validation (REQ-406, WI-070): six required fields, inclusive ranges, metric units only. Every bad field is
// reported at once with its message. The web app has the same rules (apps/web/src/features/profile/profileRules.ts) to
// check the form before sending; this one is the authority.
import type { Goal, Sex } from './calorieTarget';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export interface ProfileInput { age: number; sex: Sex; heightCm: number; weightKg: number; goal: Goal; fitnessLevel: FitnessLevel }
export type ProfileField = keyof ProfileInput;

export const SEXES: readonly Sex[] = ['female', 'male'];
export const GOALS: readonly Goal[] = ['lose', 'gain', 'maintain'];
export const FITNESS_LEVELS: readonly FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];
export const RANGES = { age: [13, 100], heightCm: [100, 250], weightKg: [30, 300] } as const;

export const MESSAGES: Record<ProfileField, { required: string; range?: string }> = {
  age: { required: 'Age is required.', range: 'Age must be a whole number between 13 and 100.' },
  sex: { required: 'Sex is required.' },
  heightCm: { required: 'Height is required.', range: 'Height must be between 100 and 250 cm.' },
  weightKg: { required: 'Weight is required.', range: 'Weight must be between 30 and 300 kg.' },
  goal: { required: 'Goal is required.' },
  fitnessLevel: { required: 'Fitness level is required.' }
};

export type ValidationResult =
  | { ok: true; value: ProfileInput }
  | { ok: false; fields: Partial<Record<ProfileField, string>> };

const missing = (v: unknown) => v === undefined || v === null || v === '';

export function validateProfile(body: unknown): ValidationResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const fields: Partial<Record<ProfileField, string>> = {};

  const number = (field: 'age' | 'heightCm' | 'weightKg', whole = false) => {
    const v = b[field];
    if (missing(v)) { fields[field] = MESSAGES[field].required; return; }
    const [min, max] = RANGES[field];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (whole && !Number.isInteger(v))) {
      fields[field] = MESSAGES[field].range!;
    }
  };
  const choice = (field: 'sex' | 'goal' | 'fitnessLevel', allowed: readonly string[]) => {
    const v = b[field];
    if (typeof v !== 'string' || !allowed.includes(v)) fields[field] = MESSAGES[field].required;   // only the offered choices exist
  };

  number('age', true);
  choice('sex', SEXES);
  number('heightCm');
  number('weightKg');
  choice('goal', GOALS);
  choice('fitnessLevel', FITNESS_LEVELS);

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    value: { age: b.age as number, sex: b.sex as Sex, heightCm: b.heightCm as number, weightKg: b.weightKg as number, goal: b.goal as Goal, fitnessLevel: b.fitnessLevel as FitnessLevel }
  };
}
