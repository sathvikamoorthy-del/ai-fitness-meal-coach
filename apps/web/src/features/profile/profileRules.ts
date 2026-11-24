// Profile form rules (REQ-406, WI-070): the same ranges and messages as the API (apps/api/src/profile/profileRules.ts), used
// to check the form before sending. The API is the authority; the tests of both sides check the same range ends.
export type ProfileField = 'age' | 'sex' | 'heightCm' | 'weightKg' | 'goal' | 'fitnessLevel';
export type FieldErrors = Partial<Record<ProfileField, string>>;

/** The form's values: numbers as typed (strings), choices as codes; '' = not filled in. */
export type ProfileForm = Record<ProfileField, string>;
export const EMPTY_FORM: ProfileForm = { age: '', sex: '', heightCm: '', weightKg: '', goal: '', fitnessLevel: '' };

export const SEX_OPTIONS = [{ code: 'female', label: 'Female' }, { code: 'male', label: 'Male' }] as const;
export const GOAL_OPTIONS = [
  { code: 'lose', label: 'Lose weight' }, { code: 'gain', label: 'Gain weight' }, { code: 'maintain', label: 'Maintain weight' }
] as const;
export const FITNESS_LEVEL_OPTIONS = [
  { code: 'beginner', label: 'Beginner' }, { code: 'intermediate', label: 'Intermediate' }, { code: 'advanced', label: 'Advanced' }
] as const;

export const RANGES = { age: [13, 100], heightCm: [100, 250], weightKg: [30, 300] } as const;

export const MESSAGES: Record<ProfileField, { required: string; range?: string }> = {
  age: { required: 'Age is required.', range: 'Age must be a whole number between 13 and 100.' },
  sex: { required: 'Sex is required.' },
  heightCm: { required: 'Height is required.', range: 'Height must be between 100 and 250 cm.' },
  weightKg: { required: 'Weight is required.', range: 'Weight must be between 30 and 300 kg.' },
  goal: { required: 'Goal is required.' },
  fitnessLevel: { required: 'Fitness level is required.' }
};

const codes = (options: readonly { code: string }[]) => options.map((o) => o.code) as string[];

/** Every bad field with its message; an empty object means the form can be sent. */
export function checkProfile(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};
  const number = (field: 'age' | 'heightCm' | 'weightKg', whole = false) => {
    const raw = form[field].trim();
    if (!raw) { errors[field] = MESSAGES[field].required; return; }
    const v = Number(raw);
    const [min, max] = RANGES[field];
    if (!Number.isFinite(v) || v < min || v > max || (whole && !Number.isInteger(v))) errors[field] = MESSAGES[field].range!;
  };
  const choice = (field: 'sex' | 'goal' | 'fitnessLevel', allowed: string[]) => {
    if (!allowed.includes(form[field])) errors[field] = MESSAGES[field].required;
  };
  number('age', true);
  choice('sex', codes(SEX_OPTIONS));
  number('heightCm');
  number('weightKg');
  choice('goal', codes(GOAL_OPTIONS));
  choice('fitnessLevel', codes(FITNESS_LEVEL_OPTIONS));
  return errors;
}

/** The request body: numbers as numbers, an empty field as null. */
export function toRequestBody(form: ProfileForm) {
  const num = (s: string) => (s.trim() === '' ? null : Number(s.trim()));
  const code = (s: string) => (s === '' ? null : s);
  return {
    age: num(form.age), sex: code(form.sex), heightCm: num(form.heightCm),
    weightKg: num(form.weightKg), goal: code(form.goal), fitnessLevel: code(form.fitnessLevel)
  };
}

export const formatKcal = (kcal: number) => `${kcal.toLocaleString('en-US')} kcal`;
