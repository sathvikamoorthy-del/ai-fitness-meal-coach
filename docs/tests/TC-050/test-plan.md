# Test plan: AI weekly workout plan

Test case TC-050 · Requirement REQ-409 · Work item WI-074 · Feature FEAT-1372

## Scope
This plan checks every acceptance criterion of REQ-409, using the product owner's answers recorded in WI-074 (2026-11-24):
- **q1:** Claude Haiku 5.5.
- **q2:** generating again adds a new plan; AI plans can be deleted, not edited.
- **q3:** a new AI plan becomes the active plan.
- **q4:** 2 to 6 workout days, under the manual-plan rules.
- **q5:** "Creating your plan..." while waiting, one retry on a broken plan, then an error with nothing saved.
- **q6:** a complete profile is needed; the button is on the Workouts screen.

It also covers the WI-074 correction: workout days may follow each other, because a strict alternation rule would allow at most four workout days.

## Setup
- **API tests:**
  - `apps/api/tests/workouts/aiPlanRules.test.ts` and `apps/api/tests/routes/workoutPlans.test.ts`.
  - They use the in-memory database with migrations `0001`–`0005` and the 40 seeded exercises.
  - The AI is replaced by a fake generator that returns a prepared answer or throws for each call, so the tests make no network call.
- **Web tests:**
  - `apps/web/tests/features/workouts/WorkoutsPage.test.tsx` and `PlanViewPage.test.tsx`.
  - The API is mocked.
- **Manual check (S16):**
  - The API runs against the project's Turso database, with `ANTHROPIC_API_KEY` set in `apps/api/.env`. The key is never printed.
  - It uses a throwaway account with a complete profile. The account is deleted again, with its profile, plans and sessions, at the end.

## Scenarios

### Plan rules (API)
| # | Steps | Expected |
|---|---|---|
| S1 | Check AI answers with 2, 3, 4 and 6 workout days, including workout days that follow each other (Days 1–6) | Accepted. |
| S2 | Check answers with 1 workout day and with 7 workout days | Refused: "An AI plan has 2 to 6 workout days.". |
| S3 | Check answers that break a manual-plan rule: an exercise not in the library, sets 11, reps 101, six days instead of seven, no exercises, not an object | Refused with the manual-plan message (for example "Day 1: Choose an exercise from the library."). The manual-plan rules are checked first. |
| S4 | Look at the answer format sent to the AI | `exerciseId` may only be a library id, `dayNumber` only 1–7, and no extra fields are allowed at any level. |

### Generate (API)
| # | Steps | Expected |
|---|---|---|
| S5 | User with a complete profile. The AI gives a valid plan first time. `POST /workout-plans/generate` | 201, with a plan that has `source: ai` and `isActive: true`, seven days in order, exercises with names, and empty days as rest days. The AI was called once. It received only the six profile fields (age, sex, height, weight, goal, fitness level) and the 40 library exercises as id and name. No email or user id was sent. |
| S6 | The first answer is broken, the second is valid. Run it four times, each with a different broken first answer: a broken rule, only one workout day, the wrong shape, and an error (time-out) | 201 each time. The AI was called twice, and exactly one plan was saved, active. |
| S7 | Both answers are broken, or both calls fail | 502 `ai-failed`. The AI was called twice and no plan was saved. |
| S8 | The user has an active manual plan, then generation fails | The manual plan stays active. |
| S9 | Generate twice | Two AI plans, newest first. Only the newer one is active. |
| S10 | No profile, or a profile with any one of the six fields empty | 400 `profile-incomplete`. The AI is not called. |
| S11 | No token | 401 `unauthorized`. |
| S12 | An AI plan: open it, make it active, edit it, delete it | Opening works and making it active works. `PUT` gives 403 `not-editable`. `DELETE` gives 204 and removes the plan with its days. |

### Workouts screen (web)
| # | Steps | Expected |
|---|---|---|
| S13 | Complete profile: press **Generate AI plan** | "Creating your plan..." is shown and the button is disabled while waiting. Afterwards the list shows "AI plan · <date>" first, marked Active. The previous plan is no longer Active. |
| S14 | The API answers 502 | "Could not create a plan. Please try again." is shown. The list is unchanged and the button can be pressed again. |
| S15 | Profile incomplete (one field empty, or no profile), or the API answers `profile-incomplete` | "Complete your profile first." with a **Go to profile** link to `/profile`. The button is disabled and no generate request is sent. When it comes from the API, the failure message is not shown. |
| S16 | An AI plan in the list and in the plan view | **Delete** is offered, asks "Delete this plan? This cannot be undone." and removes the plan. **Edit** is not offered. |

### End to end against Turso with the real AI (manual)
| # | Steps | Expected |
|---|---|---|
| S17 | Start the API with the key set and sign up a throwaway account. Save a complete profile (for example 30, female, 165 cm, 62 kg, lose, beginner). Generate a plan. Generate again. Delete the older AI plan. Then delete the account and its rows | Each generate answers 201 within about a minute. Each plan has seven days and 2–6 workout days, only library exercises, sets 1–10, reps 1–100, at most 15 exercises a day and no repeat within a day. The plan reads sensibly for the goal and level. After the second generate, the newer plan is the only active one. The delete answers 204. Afterwards no rows of the account remain. |

## Pass criteria
Every scenario gives the expected result. The automated API and web tests cover S1–S16. S17 is run by hand and needs `ANTHROPIC_API_KEY` in `apps/api/.env`. Without the key, S17 cannot be run and the test cannot be marked passed.

## Acceptance criteria coverage
| REQ-409 acceptance criterion (with the WI-074 answers) | Scenarios |
|---|---|
| A user with a saved profile and goal can ask for an AI weekly workout plan (complete profile only, button on Workouts) | S5, S10, S13, S15, S17 |
| The plan covers a week, with exercises for each workout day (seven days, 2–6 workout days) | S1, S2, S5, S17 |
| Every exercise in the plan is from the exercise library | S3, S4, S17 |
| The plan is saved and shown again when the user returns (active, listed, viewable) | S5, S9, S12, S13, S17 |
| A failure or broken plan: one retry, then a message and nothing saved (q5) | S6, S7, S8, S14 |
| Generate again adds a plan; AI plans can be deleted, not edited (q2) | S9, S12, S16, S17 |
| A new AI plan becomes active (q3) | S5, S9, S13, S17 |
