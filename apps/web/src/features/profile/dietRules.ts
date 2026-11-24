// Diet and allergies rules (REQ-407, WI-071): the same as the API (apps/api/src/profile/dietRules.ts), used to check
// before sending. The API is the authority. Names are trimmed, the user's spelling is kept, duplicates are refused
// ignoring letter case (q3); 1 to 50 characters, at most 20 allergies (q4); the diet is optional (q2).
export type Diet = 'vegetarian' | 'non_vegetarian';
export const DIET_OPTIONS: readonly { code: Diet; label: string }[] = [
  { code: 'vegetarian', label: 'Vegetarian' },
  { code: 'non_vegetarian', label: 'Non-vegetarian' }
];
export const MAX_ALLERGY_LENGTH = 50;
export const MAX_ALLERGIES = 20;

export const DIET_MESSAGES = {
  diet: 'Choose vegetarian or non-vegetarian, or leave it empty.',
  notAList: 'Allergies must be a list of names.',
  length: `Allergy names must be 1 to ${MAX_ALLERGY_LENGTH} characters.`,
  tooMany: `You can list at most ${MAX_ALLERGIES} allergies.`,
  duplicate: (name: string) => `'${name}' is already in your list.`
};

const charLength = (s: string) => Array.from(s).length;
const key = (name: string) => name.trim().toLowerCase();

/** Adds one typed name to the list: the new list, or the message that explains why it was not added. */
export function addAllergy(list: string[], input: string): { list: string[] } | { error: string } {
  const name = input.trim();
  const len = charLength(name);
  if (len < 1 || len > MAX_ALLERGY_LENGTH) return { error: DIET_MESSAGES.length };
  if (list.some((a) => key(a) === key(name))) return { error: DIET_MESSAGES.duplicate(name) };
  if (list.length >= MAX_ALLERGIES) return { error: DIET_MESSAGES.tooMany };
  return { list: [...list, name] };
}

/** The whole list before saving: the first problem, or null when it can be sent. */
export function checkAllergies(list: string[]): string | null {
  let current: string[] = [];
  for (const a of list) {
    const r = addAllergy(current, a);
    if ('error' in r) return r.error;
    current = r.list;
  }
  return null;
}
