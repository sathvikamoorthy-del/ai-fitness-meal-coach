// Diet preference and allergies validation (REQ-407, WI-071).
import { sortAllergies, validateDiet } from '../../src/profile/dietRules';

const fieldsOf = (body: unknown) => { const r = validateDiet(body); return r.ok ? {} : r.fields; };
const names = (n: number) => Array.from({ length: n }, (_, i) => `allergy ${i + 1}`);

describe('validateDiet', () => {
  it('accepts both diets and null; a missing diet or list is null / empty (q2)', () => {
    for (const diet of ['vegetarian', 'non_vegetarian', null]) expect(validateDiet({ diet, allergies: [] })).toEqual({ ok: true, value: { diet, allergies: [] } });
    expect(validateDiet({})).toEqual({ ok: true, value: { diet: null, allergies: [] } });
  });

  it('refuses any other diet', () => {
    for (const diet of ['vegan', '', 1, true]) expect(fieldsOf({ diet })).toEqual({ diet: 'Choose vegetarian or non-vegetarian, or leave it empty.' });
  });

  it('trims names and keeps the user\'s spelling (q3)', () => {
    expect(validateDiet({ allergies: ['  Peanuts ', 'tree nuts', 'Sésame'] })).toEqual({ ok: true, value: { diet: null, allergies: ['Peanuts', 'tree nuts', 'Sésame'] } });
  });

  it('refuses a duplicate ignoring letter case and spaces, naming it (q3)', () => {
    expect(fieldsOf({ allergies: ['Peanuts', ' peanuts'] })).toEqual({ allergies: "'peanuts' is already in your list." });
    expect(fieldsOf({ allergies: ['MILK', 'milk'] })).toEqual({ allergies: "'milk' is already in your list." });
  });

  it('checks the name length 1 to 50 in characters, after trimming (q4)', () => {
    const msg = 'Allergy names must be 1 to 50 characters.';
    expect(validateDiet({ allergies: ['a', 'b'.repeat(50), `  ${'c'.repeat(50)}  `, 'é'.repeat(50)] }).ok).toBe(true);
    for (const bad of ['', '   ', 'd'.repeat(51)]) expect(fieldsOf({ allergies: [bad] })).toEqual({ allergies: msg });
  });

  it('allows 20 allergies and refuses 21 (q4)', () => {
    expect(validateDiet({ allergies: names(20) }).ok).toBe(true);
    expect(fieldsOf({ allergies: names(21) })).toEqual({ allergies: 'You can list at most 20 allergies.' });
  });

  it('refuses allergies that are not a list of strings, and reports diet and allergies together', () => {
    for (const allergies of ['peanuts', [1], [null], {}]) expect(fieldsOf({ allergies })).toEqual({ allergies: 'Allergies must be a list of names.' });
    expect(fieldsOf({ diet: 'vegan', allergies: 'x' })).toEqual({
      diet: 'Choose vegetarian or non-vegetarian, or leave it empty.', allergies: 'Allergies must be a list of names.'
    });
  });
});

describe('sortAllergies', () => {
  it('sorts alphabetically ignoring letter case', () => {
    expect(sortAllergies(['soy', 'Peanuts', 'egg', 'Milk'])).toEqual(['egg', 'Milk', 'Peanuts', 'soy']);
  });
});
