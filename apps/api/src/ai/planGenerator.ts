// AI weekly workout plan generator (REQ-409, WI-074). The route asks the generator registered as app.get('planGenerator')
// for a plan, then checks it (src/workouts/aiPlanRules.ts) before saving. Tests register a fake generator, so they never
// call the network. The real one asks Claude Haiku 5.5 (WI-074 q1) for JSON in a fixed shape that only allows library
// exercise ids. Only the six profile fields are sent, never the email or the user id. The key comes from
// ANTHROPIC_API_KEY (apps/api/.env, and the host when deployed). It is never logged or returned.
import Anthropic from '@anthropic-ai/sdk';
import type { AppLike } from '../db/orm';
import { DAYS, MAX_EXERCISES_PER_DAY, REPS, SETS } from '../workouts/planRules';
import { MAX_WORKOUT_DAYS, MIN_WORKOUT_DAYS } from '../workouts/aiPlanRules';

export const AI_PLAN_MODEL = 'claude-haiku-5-5';
const TIMEOUT_MS = 30_000;   // per call; the SDK retries a failed call once (maxRetries 1)

export interface AiPlanProfile { age: number; sex: string; heightCm: number; weightKg: number; goal: string; fitnessLevel: string }
export interface AiPlanRequest { profile: AiPlanProfile; library: { id: string; name: string }[] }
/** Returns the model's parsed JSON (checked by the caller), or throws when there is no usable answer. */
export type PlanGenerator = (input: AiPlanRequest) => Promise<unknown>;

/** No usable answer: refused, cut off, no text, or not JSON. The route treats it like a broken plan and tries once more. */
export class BrokenAnswerError extends Error {}

const SYSTEM = [
  'You are a fitness coach who writes one week of workouts for a user of a fitness app.',
  `The week has exactly ${DAYS} days, Day 1 to Day ${DAYS}, in order. A day with no exercises is a rest day.`,
  `Choose between ${MIN_WORKOUT_DAYS} and ${MAX_WORKOUT_DAYS} workout days to fit the user's goal and fitness level, and spread the rest days through the week so that hard sessions are not crowded together.`,
  'Use only exercises from the library you are given, by their id. Do not use the same exercise twice in one day.',
  `Each exercise has whole-number sets from ${SETS[0]} to ${SETS[1]} and reps from ${REPS[0]} to ${REPS[1]}. A day has at most ${MAX_EXERCISES_PER_DAY} exercises.`,
  'Beginners get fewer workout days, fewer exercises and fewer sets than advanced users. For weight loss favour full-body and conditioning work; for weight gain favour strength work with lower reps.'
].join('\n');

/** JSON schema of the answer. The numeric limits are in the instructions and checked afterwards by checkAiPlan. */
export function planSchema(libraryIds: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['days'],
    properties: {
      days: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dayNumber', 'exercises'],
          properties: {
            dayNumber: { type: 'integer', enum: Array.from({ length: DAYS }, (_, i) => i + 1) },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['exerciseId', 'sets', 'reps'],
                properties: {
                  exerciseId: { type: 'string', enum: libraryIds },
                  sets: { type: 'integer', description: `${SETS[0]} to ${SETS[1]}` },
                  reps: { type: 'integer', description: `${REPS[0]} to ${REPS[1]}` }
                }
              }
            }
          }
        }
      }
    }
  };
}

export function createClaudePlanGenerator(): PlanGenerator {
  let client: Anthropic | undefined;
  return async ({ profile, library }) => {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.messages.create({
      model: AI_PLAN_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: planSchema(library.map((e) => e.id)) } },
      messages: [{
        role: 'user',
        content: `User profile:\n${JSON.stringify(profile)}\n\nExercise library (id and name):\n${JSON.stringify(library)}\n\nWrite the week of workouts.`
      }]
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') throw new BrokenAnswerError(`stop_reason ${response.stop_reason}`);
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
    if (!text) throw new BrokenAnswerError('no text in the answer');
    try {
      return JSON.parse(text);
    } catch {
      throw new BrokenAnswerError('the answer is not JSON');
    }
  };
}

// Registered in the providers glue: `app.get('planGenerator')`.
export function aiPlanProvider(app: AppLike): void {
  app.set('planGenerator', createClaudePlanGenerator());
}
