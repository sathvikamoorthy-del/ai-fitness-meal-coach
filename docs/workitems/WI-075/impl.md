# Implementation plan: Log a workout session

Work item WI-075 · Requirement REQ-411 · Feature FEAT-1374

Applications: api (APP-039, primary), web (APP-038)

## Decisions from the product owner (WI-075 Q&A, 2026-11-25)
REQ-411 is approved with two open questions. The DB design (status Final) answers "what is recorded per exercise": sets, reps and weight in kg (0 or more). The Q&A answers the rest.

| # | Question | Answer |
|---|---|---|
| q1 | How logging starts | Prefilled from the active plan. **Log workout** copies the exercises, sets and reps of the plan day that matches today (Day 1 = Monday … Day 7 = Sunday). The user adds weights, adjusts and saves. Without an active plan, or on a rest day, the log starts empty. |
| q2 | How the 30-second target is checked | A design target only. A session of up to 5 exercises from the plan needs at most one tap per exercise plus Save. It is checked by hand in the test, not measured in the app. |
| q3 | Dates | Today by default. The user can pick a past date, not a future one. Several sessions on the same date are allowed. |
| q4 | Limits | The same as plans: sets 1–10, reps 1–100, at most 15 exercises. Weight 0 to 500 kg in steps of 0.5 (0 = bodyweight). Each exercise at most once per session. A session has at least one exercise. |
| q5 | Changing a saved session | Edit and delete. Delete asks for confirmation, like plans. |
| q6 | Placement | A **Log workout** button on the Workouts screen opens the log form. After saving, a **Recent sessions** list on the Workouts screen shows the last 5 sessions (date and number of exercises). The full history stays with REQ-412. |

## Behaviour
1. On the Workouts screen the user presses **Log workout**, which opens `/workouts/log`.
2. The form has:
   - a **Date** field, today by default, with the browser's local date as its maximum;
   - one row per exercise: exercise (library select, A–Z), sets, reps and weight in kg;
   - **Remove** on each row, **+ exercise**, **Save** and **Cancel**.
3. **Prefill (q1):**
   - When the form opens for a new session, it loads the active plan. It copies the plan day for today's weekday, in plan order: Monday is Day 1 and Sunday is Day 7, using the browser's local date.
   - Each prefilled weight is the user's most recent logged weight for that exercise, or 0 if the exercise has never been logged. So repeating last week's session needs only Save, and a heavier set needs one change per exercise. This is how the q2 target is met.
   - Without an active plan, or on a rest day, the form starts with one empty row.
   - Changing the date afterwards does not refill the form.
4. **Save:**
   - Save checks the q4 rules in the browser first and lists every problem.
   - It then sends `POST /api/workout-sessions` and returns to `/workouts`.
   - On the Workouts screen, the new session is listed under **Recent sessions**.
5. **Recent sessions (q6):**
   - The 5 most recent sessions: the newest date first, and the most recently saved first within a date.
   - Each shows its date (for example "Wed 25 Nov 2026") and its exercise count ("4 exercises", "1 exercise").
   - Each has **Edit**, which opens `/workouts/sessions/:id/edit` with the same form filled from the session, and **Delete**.
   - Delete asks "Delete this session? This cannot be undone." and then removes the session with its exercises (q5).
   - With no sessions, the list says "No sessions logged yet."
6. A failed request shows the existing fallback message, "Something went wrong. Please try again.", and keeps what the user typed.

## API (apps/api)
New route file `src/routes/workoutSessions.ts`, registered in `src/glue/routes.ts` outside the knm markers. Every endpoint needs a signed-in user (`requireAuth`) and only sees that user's sessions. Another user's id gives 404 `not-found`.

| Method and path | Body / query | Answer |
|---|---|---|
| `GET /workout-sessions` | `limit` 1–50, default 5 | 200 `{ sessions: [{ id, sessionDate, exerciseCount, createdAt }] }`, sorted by `session_date` desc, `created_at` desc, `id` desc |
| `GET /workout-sessions/last-weights` | none | 200 `{ weights: { [exerciseId]: weightKg } }`: for each exercise, the weight from the user's latest session that has it (latest `session_date`, then `created_at`) |
| `GET /workout-sessions/:id` | none | 200 `{ session: { id, sessionDate, createdAt, exercises: [{ exerciseId, name, sets, reps, weightKg }] } }`, exercises in position order |
| `POST /workout-sessions` | `{ sessionDate, exercises: [{ exerciseId, sets, reps, weightKg }] }` | 201 `{ session }`, or 400 `{ error: 'invalid-session', errors: [...] }` |
| `PUT /workout-sessions/:id` | the same body | 200 `{ session }`; it replaces the date and all exercises; 400 as above; 404 |
| `DELETE /workout-sessions/:id` | none | 204; 404 |

`last-weights` is registered before `/:id`.

**Rules** (`src/workouts/sessionRules.ts`, the authority; every problem is listed, in row order, without repeats):
- `sessionDate` is a real `YYYY-MM-DD` date and not in the future: "Choose a date that is not in the future." The server cannot know the user's time zone, so it accepts dates up to the UTC date plus one day. The browser enforces the user's local today.
- Each exercise is in the library: "Choose an exercise from the library."
- Sets: "Sets must be a whole number from 1 to 10."
- Reps: "Reps must be a whole number from 1 to 100."
- Weight is a number from 0 to 500 that is a multiple of 0.5: "Weight must be from 0 to 500 kg in steps of 0.5."
- No repeats: "<name> is already in this session."
- At most 15 exercises: "A session can have at most 15 exercises."
- At least one exercise: "Add at least one exercise."

The limits reuse `SETS`, `REPS` and `MAX_EXERCISES_PER_DAY` from `planRules.ts`.

**Writes** use one `orm.batch` (all or nothing), like plans:
- Create: insert the session, then its exercises with `position` 1..n in the order sent.
- Update: update `session_date` and `updated_at`, delete the old exercise rows and insert the new ones.
- Delete: delete the exercise rows explicitly, then the session.

The schema's CHECK constraints (date format, position ≥ 1, sets/reps > 0, weight ≥ 0) stay as a second safety net.

## Web (apps/web)
- **`src/features/workouts/sessionRules.ts`:** the same rules and messages as the API, so the form can check before sending. It also has `planDayFor(date)`, which maps Monday to 1 … Sunday to 7, and `todayLocal()`.
- **`src/features/workouts/LogSessionPage.tsx`:** the form described above, for both new and edit.
  - New: it loads `/api/exercises`, `/api/workout-plans` (to find the active plan), then that plan and `/api/workout-sessions/last-weights`.
  - Edit: it loads the session. An unknown session shows "Session not found." with a link back to Workouts.
  - Weight inputs use `step="0.5"` and `inputMode="decimal"`. Save is disabled while saving.
- **`src/features/workouts/WorkoutsPage.tsx`:**
  - a **Log workout** button next to the plan buttons;
  - a **Recent sessions** section (`aria-label="Recent sessions"`) loaded from `GET /api/workout-sessions?limit=5`;
  - Edit and Delete on each session, with the same confirm dialog component as plans.
- **`src/app/router.tsx`:** routes `/workouts/log` and `/workouts/sessions/:id/edit`, outside the knm markers. React Router ranks the static `/workouts/log` above `/workouts/:id`.

## Tests
**API (jest, in-memory DB with the seeded library):**
- `tests/workouts/sessionRules.test.ts`:
  - each rule and message, including the edges: sets 1/10/0/11, reps 1/100/0/101, weight 0, 0.5, 500, 500.5, 2.3 and -0.5, 15 and 16 exercises, a repeat, an empty list, an unknown exercise, a bad date, tomorrow+1 UTC, and today.
- `tests/routes/workoutSessions.test.ts`:
  - create, then list and read back;
  - several sessions on one date, and the list order and limit;
  - a past date is accepted and a future one refused;
  - edit replaces the exercises, and delete gives 204 and removes its rows;
  - another user's session gives 404;
  - no token gives 401;
  - `last-weights` returns the latest weight per exercise;
  - a refused write saves nothing.

**Web (vitest/jest with the API mocked):**
- `tests/features/workouts/sessionRules.test.ts`: the rules, plus `planDayFor` for Monday→1 and Sunday→7.
- `tests/features/workouts/LogSessionPage.test.tsx`:
  - prefill from the active plan with the last weights;
  - an empty form on a rest day and without a plan;
  - the error list;
  - save sends the right body and returns to Workouts;
  - edit mode loads and PUTs;
  - the date cannot be in the future.
- `tests/features/workouts/WorkoutsPage.test.tsx`: the Log workout button, Recent sessions (date, count, empty text), and Delete with confirmation.

**Manual (TC for REQ-411):** check the q2 30-second target by hand. Use a plan day of 5 exercises: open Log workout, change at most one weight per exercise, and press Save.

## Files likely affected
- `apps/api/src/workouts/sessionRules.ts` (new)
- `apps/api/src/routes/workoutSessions.ts` (new)
- `apps/api/src/glue/routes.ts`
- `apps/api/tests/workouts/sessionRules.test.ts` (new)
- `apps/api/tests/routes/workoutSessions.test.ts` (new)
- `apps/web/src/features/workouts/sessionRules.ts` (new)
- `apps/web/src/features/workouts/LogSessionPage.tsx` (new)
- `apps/web/src/features/workouts/WorkoutsPage.tsx`
- `apps/web/src/app/router.tsx`
- `apps/web/tests/features/workouts/sessionRules.test.ts` (new)
- `apps/web/tests/features/workouts/LogSessionPage.test.tsx` (new)
- `apps/web/tests/features/workouts/WorkoutsPage.test.tsx`

## Schema
None. `workout_sessions` and `workout_session_exercises` already exist from migration `0001_db_design.sql`, with their Drizzle models, and match the DB design.

## Risks and assumptions
- **Prefilled weight:**
  - Reaching q2's "one tap per exercise" means the weight has to be prefilled.
  - It uses the last logged weight for that exercise, or 0 the first time. That first time needs typing, which is still within the 30-second target for 5 exercises.
  - If the product owner wants weights to start empty instead, only the prefill changes.
- **"Today":**
  - Both "today" and the plan day for today come from the browser's local date.
  - The API allows one day past the UTC date, so users ahead of UTC are not refused. It means a date at most one day ahead could slip through a direct API call; the form never sends one.
- **Plan and log are separate:**
  - Editing or deleting a plan never changes logged sessions, and deleting a session never changes a plan.
- **Exercise library:**
  - Library exercises are seeded and never deleted (`on delete restrict`), so a logged exercise always keeps its name.
- **Best lifts and history:**
  - Editing or deleting a session changes the best lifts that REQ-412 derives from sessions. That is intended (q5).
  - REQ-412 owns the full history list and the best lifts.
