// Diet preference and allergies validation (REQ-407, WI-071). The web app has the same rules
// (apps/web/src/features/profile/dietRules.ts) to check before sending; this one is the authority.
//   diet:      'vegetarian' | 'non_vegetarian' | null (optional, can be cleared - q2); missing = null
//   allergies: list of free-text names (one row each, DB design); trimmed, user's spelling kept, 1-50 characters,
//              no duplicates ignoring letter case (q3), at most 20 (q4); missing = []
export type Diet = 'vegetarian' | 'non_vegetarian';
export const DIETS: readonly Diet[] = ['vegetarian', 'non_vegetarian'];
export const MAX_ALLERGY_LENGTH = 50;
export const MAX_ALLERGIES = 20;

export const DIET_MESSAGES = {
  diet: 'Choose vegetarian or non-vegetarian, or leave it empty.',
  notAList: 'Allergies must be a list of names.',
  length: `Allergy names must be 1 to ${MAX_ALLERGY_LENGTH} characters.`,
  tooMany: `You can list at most ${MAX_ALLERGIES} allergies.`,
  duplicate: (name: string) => `'${name}' is already in your list.`
};

export interface DietInput { diet: Diet | null; allergies: string[] }
export type DietValidation = { ok: true; value: DietInput } | { ok: false; fields: { diet?: string; allergies?: string } };

/** Length in characters (code points), so accented letters and emoji count as one. */
export const charLength = (s: string) => Array.from(s).length;
/** The key two names are compared on: trimmed, lower case. */
export const allergyKey = (name: string) => name.trim().toLowerCase();

export function validateDiet(body: unknown): DietValidation {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const fields: { diet?: string; allergies?: string } = {};

  const diet = b.diet === undefined ? null : b.diet;
  if (diet !== null && !DIETS.includes(diet as Diet)) fields.diet = DIET_MESSAGES.diet;

  const raw = b.allergies === undefined ? [] : b.allergies;
  const allergies: string[] = [];
  if (!Array.isArray(raw) || raw.some((a) => typeof a !== 'string')) {
    fields.allergies = DIET_MESSAGES.notAList;
  } else {
    const seen = new Set<string>();
    for (const a of raw as string[]) {
      const name = a.trim();
      const len = charLength(name);
      if (len < 1 || len > MAX_ALLERGY_LENGTH) { fields.allergies = DIET_MESSAGES.length; break; }
      if (seen.has(allergyKey(name))) { fields.allergies = DIET_MESSAGES.duplicate(name); break; }
      seen.add(allergyKey(name));
      allergies.push(name);
    }
    if (!fields.allergies && allergies.length > MAX_ALLERGIES) fields.allergies = DIET_MESSAGES.tooMany;
  }

  if (fields.diet || fields.allergies) return { ok: false, fields };
  return { ok: true, value: { diet: diet as Diet | null, allergies } };
}

/** Alphabetical, ignoring letter case (the order shown and returned). */
export const sortAllergies = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }) || a.localeCompare(b));
