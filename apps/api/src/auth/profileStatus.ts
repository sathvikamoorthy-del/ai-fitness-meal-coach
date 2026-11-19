// The one place that decides whether a user's profile is complete (REQ-406): a profiles row exists and all six fields are
// filled. Sign-in uses it to choose between the Profile screen and Today; later guards must call it too, never copy it.
import { eq } from 'drizzle-orm';
import type { Orm } from '../db/orm';
import { profiles } from '../db/models/profiles';

export const REQUIRED_PROFILE_FIELDS = ['age', 'sex', 'height_cm', 'weight_kg', 'goal_type', 'fitness_level'] as const;

export async function isProfileComplete(orm: Orm, userId: string): Promise<boolean> {
  const [row] = await orm.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
  if (!row) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => row[field] !== null && row[field] !== undefined && row[field] !== '');
}
