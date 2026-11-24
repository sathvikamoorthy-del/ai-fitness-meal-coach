# Test plan: Manual workout plans (build, view, activate, edit, delete)

Test case TC-049 · Requirement REQ-410 · Work item WI-073 · Feature FEAT-1373

## Scope
Checks every acceptance criterion of REQ-410, including the product owner's answers recorded in it:
- seven numbered days;
- a new plan becomes active, and any plan can be made active;
- edit and delete, with confirmation;
- the sets, reps and per-day limits, and the empty-plan rule;
- the Workouts screen and the "My plan · date" label.

It also covers the edge cases in WI-073 `impl.md`, including that AI plans cannot be edited or deleted here.

## Setup
- **API tests:**
  - `apps/api/tests/workouts/planRules.test.ts` and `apps/api/tests/routes/workoutPlans.test.ts`.
  - They use the in-memory database (`:memory:`) with migrations `0001`–`0005`, and the exercises seeded by `0004`.
  - Requests are made as a signed-in user with a live session.
- **Web tests:**
  - `apps/web/tests/features/workouts/` (`planRules`, `WorkoutsPage`, `PlanEditorPage`, `PlanViewPage`) and `apps/web/tests/features/auth/SignedInLayout.test.tsx`.
  - The API is mocked.
- **Manual check (S20):**
  - The API runs against the project's Turso database after `npm run db:migrate`.
  - It uses a throwaway account, which is deleted again with all its plans at the end.

## Scenarios

### Rules (API and web)
| # | Steps | Expected |
|---|---|---|
| S1 | Save a plan with exercises on some days and none on others | Accepted. The empty days are rest days. |
| S2 | Sets 1 and 10, reps 1 and 100 | Accepted. |
| S3 | Sets 0, 11, 2.5 or a string; reps 0, 101, 8.5 or a string | "Day N: Sets must be a whole number from 1 to 10." / "Day N: Reps must be a whole number from 1 to 100.". |
| S4 | The same exercise twice in Day 3; the same exercise on Day 1 and Day 2 | Day 3 gives "Day 3: Back squat is already in this day.". Different days are accepted. |
| S5 | 15 exercises in a day, then 16 | 15 is accepted. 16 gives "Day 1: A day can have at most 15 exercises.". On the web, the 16th is refused when added. |
| S6 | An exercise id that is not in the library; on the web, Add with nothing chosen | "Day N: Choose an exercise from the library.". |
| S7 | Save with no exercises at all | "Add at least one exercise to the plan.". |
| S8 | Not exactly Day 1–7 in order (six days, reversed, a day without `exercises`) | "A plan has exactly seven days, Day 1 to Day 7.". |
| S9 | Several problems in one save | Every message is listed, in day order. Nothing is saved (API 400 `invalid-plan`; the web sends no request). |

### Create, list, view (API and web)
| # | Steps | Expected |
|---|---|---|
| S10 | Signed in: header **Workouts** link (left of Exercises), then `/workouts` with no plans | "No workout plans yet." and **Build my own plan**. Signed-out visitors are sent to sign-in. |
| S11 | Build my own plan: the editor shows Day 1–7 as "Rest day". Add Back squat and Bench press to Day 1 (they start at 3 × 10, change reps to 8), then Deadlift 5 × 5 to Day 3. Save plan | `POST` sends seven days in order with the exercises in the order added. 201 `source: manual`, `isActive: true`. Back to `/workouts`. |
| S12 | Open the plan | The label "My plan · <date>" and "Active". Day 1 "Back squat 3 × 8 · Bench press 3 × 10", Day 2 "Rest day", Day 3 "Deadlift 5 × 5", Days 4–7 "Rest day". |
| S13 | Create a second plan, then list | Newest first. The new plan is "Active", and the first no longer is. Only one plan is active. |

### Activate, edit, delete
| # | Steps | Expected |
|---|---|---|
| S14 | **Make active** on the older plan | It becomes the only active plan. Activating an already active plan changes nothing. |
| S15 | **Edit** an inactive manual plan: remove an exercise, add one to another day, save | `PUT` replaces the days. The plan stays inactive, still has 7 days, and the view shows the new exercises. |
| S16 | Edit or Save with an invalid change (for example an empty plan) | 400. The saved plan is unchanged. |
| S17 | **Delete** a plan: Cancel first, then Delete | "Delete this plan? This cannot be undone." appears. Cancel keeps the plan, Delete removes it with its days and exercises. Deleting the active plan leaves no plan active. From the plan view, Delete returns to `/workouts`. |

### Access and AI plans
| # | Steps | Expected |
|---|---|---|
| S18 | Another user's plan id, or an unknown id, for GET, PUT, DELETE and activate | 404 `not-found`. Lists only ever show the user's own plans. Every route without a token gives 401. |
| S19 | An AI plan (`source: ai`) in the user's list | Shown as "AI plan · <date>". It can be opened and made active. There is no Edit or Delete on the web, and the API refuses `PUT`/`DELETE` with 403 `not-editable`. The editor says "This plan cannot be edited.". |

### End to end against Turso (manual)
| # | Steps | Expected |
|---|---|---|
| S20 | Run `npm run db:migrate` on Turso, start the API and sign up a throwaway account. Then: create plan A, create plan B, list, activate A, edit B (inactive), delete A (active), list. Then delete the account and its rows | The migration applies `0005_seed_plan_sources` (or reports nothing to apply). Each new plan becomes active, with B newest first. After activate, only A is active. Editing keeps B inactive. After deleting A, no plan is active and only B remains. Afterwards no rows of the account remain. |

## Pass criteria
All scenarios give the expected result. The automated API and web tests cover S1–S19, and S20 is run by hand against Turso.

## Acceptance criteria coverage
| REQ-410 acceptance criterion | Scenarios |
|---|---|
| Open Workouts from the header link; signed-out visitors go to sign-in | S10, S18 |
| List newest first, "My plan · <date>" / "AI plan · <date>", Active marked, empty text | S10, S13, S19 |
| Day 1–7 builder: add exercises from the library with sets and reps, and remove them | S11, S15 |
| Sets, reps, duplicate and per-day limits refused with a message naming the day | S2–S6, S9 |
| An empty plan is refused | S7 |
| A saved plan is shown again with seven days, exercises in order, sets, reps, "Rest day" | S12 |
| A new plan becomes active, and the previous one does not stay active | S11, S13, S20 |
| Make any plan active, one at a time | S14, S20 |
| Edit a manual plan, keeping its active status | S15, S16, S20 |
| Delete after confirming; deleting the active plan leaves none active | S17, S20 |
