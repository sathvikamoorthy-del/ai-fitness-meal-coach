// AI plan rules (REQ-409, WI-074 q4): the manual-plan rules (validatePlan) plus 2 to 6 workout days, so every AI plan has
// at least one rest day. Spreading the rest days through the week is asked of the model, not enforced: a strict "never two
// workout days in a row" would allow at most four workout days, which contradicts q4. The messages go to the server log
// only: the user sees one failure message (WI-074 q5).
import { PlanValidation, validatePlan } from './planRules';

export const MIN_WORKOUT_DAYS = 2;
export const MAX_WORKOUT_DAYS = 6;

export const AI_PLAN_MESSAGES = {
  workoutDays: `An AI plan has ${MIN_WORKOUT_DAYS} to ${MAX_WORKOUT_DAYS} workout days.`
};

export function checkAiPlan(value: unknown, library: Map<string, string>): PlanValidation {
  const result = validatePlan(value, library);
  if (!result.ok) return result;
  const count = result.value.days.filter((d) => d.exercises.length > 0).length;
  if (count < MIN_WORKOUT_DAYS || count > MAX_WORKOUT_DAYS) return { ok: false, errors: [AI_PLAN_MESSAGES.workoutDays] };
  return result;
}
