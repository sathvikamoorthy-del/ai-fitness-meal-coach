# Implementation plan: AI weekly workout plan

Work item WI-074 · Requirement REQ-409 · Feature FEAT-1372

Applications: api (APP-039, primary), web (APP-038)

## Decisions from the product owner (WI-074 Q&A, 2026-11-24)
REQ-409 is approved with its original text and open questions; these answers settle them for this work item.

| # | Question | Answer |
|---|---|---|
| q1 | AI provider and model | Anthropic Claude API, model Claude Haiku 5.5 (`claude-haiku-5-5`): fastest and cheapest. |
| q2 | Regenerate, edit, delete | Generate again creates a new AI plan, and older ones stay in the list. AI plans can be deleted but not edited. |
| q3 | Does a new AI plan become active? | Yes, like a newly saved manual plan (REQ-410). The previous active plan becomes inactive. |
| q4 | Workout days and rules | The AI picks 2 to 6 workout days, with rest days in between, from the goal and fitness level. The manual-plan rules apply: Day 1–7, sets 1–10, reps 1–100, at most 15 exercises a day, library exercises only. |
| q5 | Failure, slowness, broken plan | Show "Creating your plan..." while waiting. Retry once automatically on a broken plan. If it still fails, show "Could not create a plan. Please try again." and save nothing. |
| q6 | Who can generate, and where | Only users with a complete profile (all six REQ-406 fields). A "Generate AI plan" button on the Workouts screen. When the profile is incomplete it says "Complete your profile first." with a link to the profile. |

The open question "Fitness level is not in the profile" was already resolved by REQ-406, which added fitness level to the profile.

## Behaviour
1. On the Workouts screen, the signed-in user presses **Generate AI plan**, next to **Build my own plan**.
2. If the profile is incomplete, the screen shows "Complete your profile first." with a link to `/profile`. No AI request is made, and the API refuses the request the same way.
3. Otherwise the button is disabled and the screen shows "Creating your plan...".
4. The API asks Claude Haiku 5.5 for a seven-day plan. The request includes:
   - the user's goal, fitness level, age, sex, height and weight;
   - the exercise library (ids and names);
   - the rules.
5. The API checks the answer:
   - It runs the same `validatePlan` used for manual plans.
   - It also requires 2 to 6 workout days, and no two workout days in a row.
6. If the answer is broken, the API asks once more. A broken answer is any of these:
   - not valid JSON, or not in the expected shape;
   - it breaks a rule;
   - the model refused;
   - it was cut off at `max_tokens`.
7. If the answer is valid, the plan is saved as `source: ai` and made active, in one batch, as for a manual plan. The new plan is shown in the list as "AI plan · <date>" and marked Active.
8. If the second answer is also broken, or the API call fails (time-out, network, or the AI service's own error after the SDK's retry), nothing is saved. The screen shows "Could not create a plan. Please try again.".
9. AI plans can be opened, made active and deleted (with the same confirmation as manual plans). They cannot be edited: `PUT` still answers 403 `not-editable`, and the web shows no Edit.

## API (apps/api)
- **Dependency:** `@anthropic-ai/sdk` in `package.json`.
  - The key is read from `ANTHROPIC_API_KEY` in `apps/api/.env`, and on the host when deployed.
  - The key is never logged or returned. If it is missing, generation fails with the error below, and the server logs "ANTHROPIC_API_KEY is not set".
- **`src/ai/planGenerator.ts`** (new):
  - **Interface:** `PlanGenerator = (input: { profile, library: { id, name }[] }) => Promise<unknown>`, which returns the model's parsed JSON or throws.
  - **Real generator:** `new Anthropic({ timeout: 30_000, maxRetries: 1 })`, then `client.messages.create` with:
    - model `claude-haiku-5-5`;
    - `max_tokens` 4000;
    - `output_config: { effort: 'low', format: { type: 'json_schema', schema } }`;
    - the schema: `{ days: [{ dayNumber, exercises: [{ exerciseId, sets, reps }] }] }`, with `additionalProperties: false` and the integer and enum limits;
    - `exerciseId` an enum of the library ids.
  - It checks `stop_reason` (`refusal` and `max_tokens` count as broken) before reading the text block, then runs `JSON.parse`.
  - **System prompt:** the rules in plain words. Use only the given exercise ids. Choose 2–6 workout days that fit the goal and fitness level, with rest days in between. Keep sets 1–10, reps 1–100, at most 15 exercises a day, and no exercise twice in a day.
  - **Provider:** `aiPlanProvider` registers the real generator with `app.set('planGenerator', …)`. Tests set a fake one, so they never call the network.
- **`src/glue/providers.ts`:** register `aiPlanProvider` outside the knm markers, like the app routes.
- **`src/workouts/aiPlanRules.ts`** (new): `checkAiPlan(value, libraryMap)`.
  - It runs `validatePlan`, then counts workout days (2–6) and rejects two workout days in a row.
  - It returns `{ ok, value | errors }`. The errors are for the server log only.
- **`src/routes/workoutPlans.ts`:**
  - **`POST /workout-plans/generate` → 201 `{ plan }`:**
    - Returns 400 `profile-incomplete` when the profile is missing or any of the six fields is empty.
    - Otherwise it calls the generator. On a thrown error or a failed `checkAiPlan` it tries one more time.
    - When both tries fail, it returns 502 `ai-failed` and saves nothing.
    - On success, one batch clears the active plan, inserts the plan with `source: 'ai'` and `is_active: 1`, and inserts the seven days (the existing `dayInserts`).
  - **`DELETE /workout-plans/:id`:** AI plans may now be deleted. Only `PUT` keeps the `not-editable` check.
  - The route is registered before `/workout-plans/:id`. The header comment is updated.

## Web (apps/web)
- **`src/features/workouts/WorkoutsPage.tsx`:**
  - On load it also calls `GET /api/profile` to know whether the profile is complete (all six fields set).
  - The **Generate AI plan** button, next to **Build my own plan**:
    - With an incomplete profile it shows "Complete your profile first." with a link "Go to profile" to `/profile`.
    - Otherwise it posts to `/api/workout-plans/generate` and shows "Creating your plan..." while waiting.
    - On 201 it reloads the list. On 400 `profile-incomplete` it shows the profile message. On any other failure it shows "Could not create a plan. Please try again.".
  - Delete is offered for AI plans too, with the same confirmation. Edit stays manual-only.
- **`src/features/workouts/PlanViewPage.tsx`:** Delete is shown for AI plans. Edit stays manual-only.

## Tests
- **API:**
  - `tests/workouts/aiPlanRules.test.ts` (day count, rest between workout days, library and limits through `validatePlan`).
  - `tests/routes/workoutPlans.test.ts` additions, using a fake generator:
    - valid first try;
    - broken then valid (two calls);
    - broken twice (502, nothing saved);
    - thrown error twice (502);
    - incomplete or missing profile (400, generator not called);
    - the new AI plan is active and the old one is not;
    - DELETE of an AI plan answers 204, and PUT still answers 403;
    - no token gives 401.
  - The existing assertion that DELETE of an AI plan answers 403 is replaced (REQ-409 q2 supersedes it).
- **Web:**
  - `WorkoutsPage.test.tsx` additions:
    - the button and the incomplete-profile message with its link;
    - "Creating your plan..." while waiting;
    - success reloads the list;
    - the failure message.
  - Delete is now offered for AI plans: this replaces the "no Edit or Delete" test.
  - `PlanViewPage.test.tsx`: Delete is shown for an AI plan, and there is no Edit.
- **Manual check:** against Turso with a real key and a throwaway account (deleted at the end). Generate a plan, check it follows the rules and is active, generate again (two AI plans, the newest active), then delete one.

## Files likely affected
- `apps/api/package.json` and the lockfile (`@anthropic-ai/sdk`)
- `apps/api/src/ai/planGenerator.ts` (new)
- `apps/api/src/workouts/aiPlanRules.ts` (new)
- `apps/api/src/routes/workoutPlans.ts`
- `apps/api/src/glue/providers.ts`
- `apps/api/tests/workouts/aiPlanRules.test.ts` (new)
- `apps/api/tests/routes/workoutPlans.test.ts`
- `apps/web/src/features/workouts/WorkoutsPage.tsx`
- `apps/web/src/features/workouts/PlanViewPage.tsx`
- `apps/web/tests/features/workouts/WorkoutsPage.test.tsx`
- `apps/web/tests/features/workouts/PlanViewPage.test.tsx`

## Schema
No database change. `workout_plans.source = 'ai'` already exists (seeded by migration 0005), and AI plans use the same day and exercise tables.

## Risks and assumptions
- **Waiting time:** each call times out after 30 s, and the SDK retries a failed call once. With the one retry for a broken plan, the worst case is about two minutes before the error shows. The waiting text stays visible the whole time.
- **Cost:** Haiku 5.5 is $0.10 per million input tokens and $0.50 per million output tokens. One plan is about 2,000 tokens in and up to about 1,500 out, so well under one cent per try.
- **Rate limit:** nothing stops a user pressing Generate many times. Each press makes at most two AI calls, and the button is disabled while one is running. A per-user limit is out of scope.
- **Prompt content:** the profile values sent to the AI are the six profile fields only, never the email or the user id.
- **TC-049 S19:** it expects no Delete for AI plans. That changes with q2, and its tests are updated here. The test plan for REQ-409 will state the new rule.
