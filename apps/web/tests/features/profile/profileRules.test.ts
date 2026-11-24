// Profile form rules (REQ-406, WI-070): same range ends and messages as the API rules.
import { checkProfile, EMPTY_FORM, formatKcal, ProfileForm, toRequestBody } from '../../../src/features/profile/profileRules';

const valid: ProfileForm = { age: '32', sex: 'female', heightCm: '163', weightKg: '68.4', goal: 'lose', fitnessLevel: 'beginner' };

describe('checkProfile', () => {
  it('accepts a complete, valid form', () => {
    expect(checkProfile(valid)).toEqual({});
  });

  it('names every empty field at once', () => {
    expect(checkProfile(EMPTY_FORM)).toEqual({
      age: 'Age is required.', sex: 'Sex is required.', heightCm: 'Height is required.',
      weightKg: 'Weight is required.', goal: 'Goal is required.', fitnessLevel: 'Fitness level is required.'
    });
    expect(checkProfile({ ...valid, age: '   ' })).toEqual({ age: 'Age is required.' });
  });

  it.each([
    ['age', ['13', '100'], ['12', '101', '32.5', 'abc'], 'Age must be a whole number between 13 and 100.'],
    ['heightCm', ['100', '250', '163.5'], ['99.9', '250.1'], 'Height must be between 100 and 250 cm.'],
    ['weightKg', ['30', '300', '68.4'], ['29.9', '300.1'], 'Weight must be between 30 and 300 kg.']
  ] as const)('checks the %s range (ends included)', (field, ok, bad, message) => {
    for (const v of ok) expect(checkProfile({ ...valid, [field]: v })).toEqual({});
    for (const v of bad) expect(checkProfile({ ...valid, [field]: v })).toEqual({ [field]: message });
  });

  it('refuses codes that are not offered', () => {
    expect(checkProfile({ ...valid, sex: 'other', goal: 'bulk', fitnessLevel: 'expert' })).toEqual({
      sex: 'Sex is required.', goal: 'Goal is required.', fitnessLevel: 'Fitness level is required.'
    });
  });
});

describe('toRequestBody and formatKcal', () => {
  it('sends numbers as numbers and empty fields as null', () => {
    expect(toRequestBody(valid)).toEqual({ age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner' });
    expect(toRequestBody(EMPTY_FORM)).toEqual({ age: null, sex: null, heightCm: null, weightKg: null, goal: null, fitnessLevel: null });
  });
  it('formats kcal with a thousands separator', () => {
    expect(formatKcal(1434)).toBe('1,434 kcal');
    expect(formatKcal(370)).toBe('370 kcal');
  });
});
