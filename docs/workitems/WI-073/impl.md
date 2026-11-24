# Workouts screen: build, view, activate, edit and delete manual plans

Applications: web (primary), api

Work item WI-073 · Requirement REQ-410 · Decision DEC-445 · Feature FEAT-1373
Builds on: WI-072 (exercise library, `GET /exercises`), WI-046 (`authFetch`, `RequireAuth`, `SignedInLayout`), and the seed migration pattern of WI-070 to WI-072.

## Approach

### api (APP-039, apps/api)

**Reference data:** a new migration, `src/db/migrations/0005_seed_plan_sources.sql`.
- `INSERT OR IGNORE INTO plan_sources`: (`manual`, "Manual") and (`ai`, "AI"), as in the final DB design.
- Today the table is empty, so creating a plan would fail on the `source` foreign key.
- It reaches Turso with `npm run db:migrate`.
- It has no semicolons in comments, because the runner splits on `;`.

**Plan rules:** a new file, `src/workouts/planRules.ts`, exports `validatePlan(body, libraryIds)`.
- The body is `{ days: [{ dayNumber, exercises: [{ exerciseId, sets, reps }] }] }`.
- `days` has exactly seven entries, with `dayNumber` 1 to 7 in order.
- It returns `{ ok: true, value }` or `{ ok: false, errors: string[] }`, listing every problem in day order:

| Rule | Message |
|---|---|
| `days` not seven entries for Day 1–7 | "A plan has exactly seven days, Day 1 to Day 7." |
| `exerciseId` not in the library | "Day N: Choose an exercise from the library." |
| `sets` not a whole number from 1 to 10 | "Day N: Sets must be a whole number from 1 to 10." |
| `reps` not a whole number from 1 to 100 | "Day N: Reps must be a whole number from 1 to 100." |
| The same `exerciseId` twice in one day | "Day N: <exercise name> is already in this day." |
| More than 15 exercises in a day | "Day N: A day can have at most 15 exercises." |
| No exercise in any day | "Add at least one exercise to the plan." |

**Routes:** a new file, `src/routes/workoutPlans.ts`, registered in `src/glue/routes.ts` outside the knm markers.
- Every route uses `requireAuth`, and `sessionCheck` runs globally.
- A plan that belongs to another user, or doesn't exist, answers 404 `{ error: "not-found" }`.
- In the browser these are called as `/api/workout-plans...`.

| Route | Does | Answers |
|---|---|---|
| `GET /workout-plans` | Lists the user's plans, newest first (`created_at` DESC) | 200 `{ plans: [{ id, source, isActive, createdAt }] }` |
| `POST /workout-plans` | Validates, then creates a **manual** plan and makes it active | 201 `{ plan }`, or 400 `{ error: "invalid-plan", errors }` |
| `GET /workout-plans/:id` | Returns one plan with all seven days | 200 `{ plan: { id, source, isActive, createdAt, days: [{ dayNumber, exercises: [{ exerciseId, name, sets, reps }] }] } }`. Exercises are in `position` order, and an empty `exercises` list is a rest day. |
| `PUT /workout-plans/:id` | Validates, then replaces the days and exercises of a **manual** plan. `is_active` is unchanged. | 200 `{ plan }`, 400 `invalid-plan`, or 403 `{ error: "not-editable" }` for an AI plan |
| `DELETE /workout-plans/:id` | Deletes a **manual** plan with its days and exercises | 204, or 403 `not-editable` for an AI plan |
| `POST /workout-plans/:id/activate` | Makes this plan (manual or AI) the active one | 200 `{ plan }` |

**How the writes are done:** each write is one `orm.batch`, so it all happens or nothing does.
- **Create:**
  1. Set `is_active = 0` on the user's active plan.
  2. Insert the plan with `source = "manual"` and `is_active = 1`.
  3. Insert seven `workout_plan_days` rows (day 1–7).
  4. Insert the `workout_plan_exercises` rows with `position` 1..n per day, in the order sent.

  Step 1 comes first because of the database index `uq_workout_plans_one_active`.
- **Edit:** delete the plan's `workout_plan_exercises` rows, then its days, then insert the new days and exercises, and set `updated_at`. The rows are deleted explicitly rather than relying on `ON DELETE CASCADE`.
- **Delete:** delete exercises, then days, then the plan. When it was the active plan, no plan is active afterwards.
- **Activate:** set `is_active = 0` on the user's other plans, then `is_active = 1` on this one, and set `updated_at`.

`GET /exercises` (WI-072) is unchanged; the web editor uses it for the library picker.

### web (APP-038, apps/web)

**Rules:** a new file, `src/features/workouts/planRules.ts`, with the same rules and messages as the API, used before sending. It also holds `planLabel(source, createdAt)`, which gives "My plan · 24 Nov 2026" or "AI plan · 24 Nov 2026" from `created_at`, formatted `en-GB` as day, short month and year in the browser's local time.

**Workouts list:** a new file, `src/features/workouts/WorkoutsPage.tsx`, at `/workouts`.
- Heading "Workouts" and a **Build my own plan** button that goes to `/workouts/new`.
- One row per plan with its label, an "Active" badge on the active one, and these buttons:
  - **Make active** on inactive plans;
  - **Open** (`/workouts/:id`);
  - **Edit** (`/workouts/:id/edit`) and **Delete**, on manual plans only.
- With no plans: "No workout plans yet.".
- **Delete** opens a Chakra `AlertDialog` saying "Delete this plan? This cannot be undone." with Cancel and Delete. Delete calls the API and refreshes the list.

**Plan editor:** a new file, `src/features/workouts/PlanEditorPage.tsx`, at `/workouts/new` and `/workouts/:id/edit`.
- It shows Day 1 to Day 7. Each day lists its exercises in order, each with sets and reps inputs and a **Remove** button. A day with no exercises shows "Rest day".
- Under each day are an **Exercise** select with the library A–Z (from `GET /api/exercises`, placeholder "Choose an exercise") and an **Add** button.
- A new exercise starts with sets 3 and reps 10, which the user can change. This is a starting value only; the rules still apply.
- **Save plan:**
  1. Run the rules and show all messages in a list above the buttons. Nothing is sent while any rule fails.
  2. Send `POST` (new) or `PUT` (edit).
  3. On success, go back to `/workouts`.
  4. API errors are shown the same way.
- **Cancel:** goes back to `/workouts` without saving.
- **Edit mode:** loads the plan with `GET /api/workout-plans/:id`. An AI plan, or a 404, shows "This plan cannot be edited." with a link back.

**Plan view:** a new file, `src/features/workouts/PlanViewPage.tsx`, at `/workouts/:id`.
- The label, an "Active" badge, and Edit and Delete for manual plans. Delete uses the same confirmation, then goes back to `/workouts`.
- Day 1 to Day 7 with "Back squat 3 × 8 · Bench press 3 × 10", or "Rest day".

**Header link:** in `src/features/auth/SignedInLayout.tsx`, add a **Workouts** link to `/workouts`, left of Exercises.

**Router:** in `src/app/router.tsx`, add `/workouts`, `/workouts/new`, `/workouts/:id` and `/workouts/:id/edit`, each inside `RequireAuth` and `SignedInLayout`, outside the knm markers.

## Behaviour against the acceptance criteria
| REQ-410 acceptance criterion | How it is met |
|---|---|
| Open Workouts from the header; signed-out visitors go to sign-in | Header link, routes inside `RequireAuth`, and `requireAuth` on the API |
| Newest first, "My plan · <date>" / "AI plan · <date>", "Active" marked, empty text | `GET /workout-plans` ordered DESC, `planLabel`, the badge and the empty text |
| Day 1–7 builder: add and remove exercises with sets and reps | `PlanEditorPage` |
| Sets, reps, duplicate and per-day limits refused with a message naming the day | `validatePlan` on the web and the API |
| A plan with no exercises is refused | The "Add at least one exercise to the plan." rule |
| Saved plan shown again with days, exercises in order, sets, reps and "Rest day" | `GET /workout-plans/:id`, `position` order, `PlanViewPage` |
| A new plan becomes active, and the old one doesn't stay active | The create batch clears the old active plan first, and the unique index backs it up |
| Make any plan active, only one at a time | `POST /:id/activate` and the **Make active** button |
| Edit a manual plan, keeping its active status | `PUT` leaves `is_active` alone |
| Delete a manual plan after confirming; the active one leaves none active | The `AlertDialog`, then `DELETE` |

## Edge cases
- **AI plans:** they can't be created here, and `PUT` and `DELETE` answer 403 `not-editable`; REQ-409 owns AI plans. They can be opened and made active. Until REQ-409 exists, every plan is manual.
- **An exercise removed from the library later:** `workout_plan_exercises.exercise_id` is `ON DELETE RESTRICT`, so a library exercise in use cannot be deleted. Nothing removes exercises today.
- **Two tabs saving at once:** each write is one batch, and the unique index keeps at most one active plan. If two creates race, the second batch fails on the index and answers 500; the user can save again. This is rare, because it needs two saves in the same moment.
- **Very old plan dates:** the label shows the creation date only; `updated_at` is not shown.

## Existing code reused
- `apps/api/src/auth/authMiddleware.ts` (`requireAuth`), `src/auth/sessionCheck.ts`, `src/http/app.ts` (`wrapAsync`, `RouteEntry`).
- The generated models `workout_plans.ts`, `workout_plan_days.ts`, `workout_plan_exercises.ts`, `exercises.ts` and `plan_sources.ts`. The tables are not changed.
- `apps/api/src/routes/exercises.ts` (`GET /exercises`).
- `apps/web/src/app/authFetch.ts`, `src/features/auth/RequireAuth.tsx`, `SignedInLayout.tsx` and `src/testing/render`.

## Areas and files likely affected
- apps/api/src/db/migrations/0005_seed_plan_sources.sql (new).
- apps/api/src/workouts/planRules.ts (new).
- apps/api/src/routes/workoutPlans.ts (new).
- apps/api/src/glue/routes.ts: registers `workoutPlansRoute`.
- apps/api/tests/workouts/planRules.test.ts (new): each rule and its message, both ends of each range, 15 vs 16 exercises, the empty plan, several errors at once.
- apps/api/tests/routes/workoutPlans.test.ts (new):
  - 401 without a token
  - list empty, then newest first
  - create makes the plan active and the previous one inactive
  - view returns seven days in order with names
  - edit replaces the days and keeps the active status
  - activate switches the active plan
  - delete the active plan leaves none active
  - another user's plan gives 404
  - an AI plan cannot be edited or deleted (403)
  - invalid input gives 400 and nothing is written
  - the seed provides both sources
- apps/web/src/features/workouts/planRules.ts (new).
- apps/web/src/features/workouts/WorkoutsPage.tsx (new).
- apps/web/src/features/workouts/PlanEditorPage.tsx (new).
- apps/web/src/features/workouts/PlanViewPage.tsx (new).
- apps/web/src/features/auth/SignedInLayout.tsx: the Workouts link.
- apps/web/src/app/router.tsx: the four workout routes.
- apps/web/tests/features/workouts/planRules.test.ts (new).
- apps/web/tests/features/workouts/WorkoutsPage.test.tsx (new):
  - empty state
  - list with labels and the Active badge
  - Make active
  - delete with confirm and cancel
  - Edit and Delete hidden for AI plans
- apps/web/tests/features/workouts/PlanEditorPage.test.tsx (new):
  - Day 1–7 with "Rest day"
  - add and remove
  - sets and reps limits
  - duplicate in a day
  - 16th exercise
  - empty plan
  - save sends the body in order
  - edit loads and saves with `PUT`
  - API errors
  - an AI plan cannot be edited
- apps/web/tests/features/workouts/PlanViewPage.test.tsx (new): days, rest days, Active badge, delete.
- apps/web/tests/features/auth/SignedInLayout.test.tsx: the Workouts link and its place.

## Risks
- **The seed migration must also run on Turso** (`npm run db:migrate`). Until then, saving a plan fails with a 500 on the `source` foreign key.
- **The rules live in both the web and the API.** The tests check the same messages and range ends on both sides, as in WI-070 and WI-071.
- **REQ-409 will add AI plans to this list.** This plan leaves room for them: `source` is shown, and edit and delete are refused for `ai`.

## Assumptions
- **The exercise picker is a select listing the library A–Z,** matching mock.md's drop-down. Typing a letter in a select jumps to the matching names. A searchable picker is not asked for.
- **New exercises start at 3 sets × 10 reps,** to make adding quick. The user changes them before saving.
- **The plan date is shown in the browser's local time,** from `created_at` (UTC).
- **The header order is Workouts, Exercises, Sign out.**
