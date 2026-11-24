// Diet and allergies rules (REQ-407, WI-071): same ends and messages as the API rules.
import { addAllergy, checkAllergies, DIET_OPTIONS } from '../../../src/features/profile/dietRules';

const names = (n: number) => Array.from({ length: n }, (_, i) => `allergy ${i + 1}`);

describe('addAllergy', () => {
  it('adds a trimmed name with the user\'s spelling (q3)', () => {
    expect(addAllergy(['Egg'], '  Tree nuts ')).toEqual({ list: ['Egg', 'Tree nuts'] });
  });

  it('refuses a duplicate ignoring letter case and spaces (q3)', () => {
    expect(addAllergy(['Peanuts'], ' peanuts')).toEqual({ error: "'peanuts' is already in your list." });
  });

  it('checks the length 1 to 50 characters after trimming (q4)', () => {
    const msg = { error: 'Allergy names must be 1 to 50 characters.' };
    expect(addAllergy([], '')).toEqual(msg);
    expect(addAllergy([], '   ')).toEqual(msg);
    expect(addAllergy([], 'x'.repeat(51))).toEqual(msg);
    expect(addAllergy([], 'x'.repeat(50))).toEqual({ list: ['x'.repeat(50)] });
    expect(addAllergy([], 'é'.repeat(50))).toEqual({ list: ['é'.repeat(50)] });
  });

  it('allows the 20th allergy and refuses the 21st (q4)', () => {
    expect('list' in addAllergy(names(19), 'last')).toBe(true);
    expect(addAllergy(names(20), 'one more')).toEqual({ error: 'You can list at most 20 allergies.' });
  });
});

describe('checkAllergies and options', () => {
  it('finds the first problem in a whole list, or null', () => {
    expect(checkAllergies(['Egg', 'Milk'])).toBeNull();
    expect(checkAllergies(['Egg', 'EGG'])).toBe("'EGG' is already in your list.");
    expect(checkAllergies(names(21))).toBe('You can list at most 20 allergies.');
  });
  it('offers vegetarian and non-vegetarian', () => {
    expect(DIET_OPTIONS.map((o) => [o.code, o.label])).toEqual([['vegetarian', 'Vegetarian'], ['non_vegetarian', 'Non-vegetarian']]);
  });
});
