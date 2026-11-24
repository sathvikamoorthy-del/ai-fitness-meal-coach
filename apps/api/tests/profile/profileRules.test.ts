// Profile validation (REQ-406, WI-070).
import { validateProfile } from '../../src/profile/profileRules';

const valid = { age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner' };
const fieldsOf = (body: unknown) => { const r = validateProfile(body); return r.ok ? {} : r.fields; };

describe('validateProfile', () => {
  it('accepts a complete, valid profile and returns its values', () => {
    expect(validateProfile(valid)).toEqual({ ok: true, value: valid });
  });

  it.each([
    ['age', 'Age is required.'], ['sex', 'Sex is required.'], ['heightCm', 'Height is required.'],
    ['weightKg', 'Weight is required.'], ['goal', 'Goal is required.'], ['fitnessLevel', 'Fitness level is required.']
  ])('refuses a missing %s and names it', (field, message) => {
    for (const empty of [undefined, null, '']) {
      expect(fieldsOf({ ...valid, [field]: empty })).toEqual({ [field]: message });
    }
  });

  it('reports every bad field at once', () => {
    expect(fieldsOf({})).toEqual({
      age: 'Age is required.', sex: 'Sex is required.', heightCm: 'Height is required.',
      weightKg: 'Weight is required.', goal: 'Goal is required.', fitnessLevel: 'Fitness level is required.'
    });
    expect(validateProfile(null).ok).toBe(false);
  });

  it.each([
    ['age', [13, 100], [12, 101, 32.5], 'Age must be a whole number between 13 and 100.'],
    ['heightCm', [100, 250, 163.5], [99.9, 250.1], 'Height must be between 100 and 250 cm.'],
    ['weightKg', [30, 300, 68.4], [29.9, 300.1], 'Weight must be between 30 and 300 kg.']
  ] as const)('checks the %s range (ends included)', (field, ok, bad, message) => {
    for (const v of ok) expect(validateProfile({ ...valid, [field]: v }).ok).toBe(true);
    for (const v of bad) expect(fieldsOf({ ...valid, [field]: v })).toEqual({ [field]: message });
  });

  it('refuses numbers sent as strings, and non-finite numbers', () => {
    expect(fieldsOf({ ...valid, age: '32' })).toEqual({ age: 'Age must be a whole number between 13 and 100.' });
    expect(fieldsOf({ ...valid, heightCm: '163' })).toEqual({ heightCm: 'Height must be between 100 and 250 cm.' });
    expect(fieldsOf({ ...valid, weightKg: Number.NaN })).toEqual({ weightKg: 'Weight must be between 30 and 300 kg.' });
  });

  it('refuses codes that are not offered', () => {
    expect(fieldsOf({ ...valid, sex: 'other', goal: 'bulk', fitnessLevel: 'expert' })).toEqual({
      sex: 'Sex is required.', goal: 'Goal is required.', fitnessLevel: 'Fitness level is required.'
    });
  });
});
