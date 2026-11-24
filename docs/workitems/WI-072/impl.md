# Exercise library screen with search

Applications: web (primary), api

Work item WI-072 · Requirement REQ-408 · Decision DEC-443 · Feature FEAT-1371
Builds on: WI-046 (`authFetch`, `RequireAuth`, `SignedInLayout`), WI-070 and WI-071 (seed migration pattern).

## Seed list for product-owner review
REQ-408 says the product owner reviews the drafted list before it is implemented. These 40 names are the draft. Accepting this work item's preview in KNM counts as that review; to change the list, ask for a refinement with the names to add, drop or rename.

All names are unique ignoring letter case. They are shown here in the order the screen will list them (A–Z, ignoring case):

| # | Name | # | Name |
|---|---|---|---|
| 1 | Back squat | 21 | Kettlebell swing |
| 2 | Bench press | 22 | Lat pulldown |
| 3 | Bicep curl | 23 | Lateral raise |
| 4 | Bicycle crunch | 24 | Leg curl |
| 5 | Bodyweight squat | 25 | Leg extension |
| 6 | Burpee | 26 | Leg press |
| 7 | Calf raise | 27 | Lunge |
| 8 | Chest fly | 28 | Mountain climber |
| 9 | Chin-up | 29 | Overhead press |
| 10 | Deadlift | 30 | Plank |
| 11 | Dumbbell row | 31 | Pull-up |
| 12 | Dumbbell shoulder press | 32 | Push-up |
| 13 | Face pull | 33 | Romanian deadlift |
| 14 | Front squat | 34 | Russian twist |
| 15 | Glute bridge | 35 | Seated cable row |
| 16 | Goblet squat | 36 | Side plank |
| 17 | Hammer curl | 37 | Step-up |
| 18 | Hip thrust | 38 | Tricep dip |
| 19 | Incline bench press | 39 | Tricep pushdown |
| 20 | Jumping jack | 40 | Walking lunge |

The list covers gym lifts, dumbbell and cable work, and bodyweight moves. It includes the three exercises the walkthrough uses: Goblet squat, Push-up and Dumbbell row. It has no time-based cardio (for example a walk or a run), because an exercise is a name only and workout logs record sets, reps and weight (DB design).

## Approach

### api (APP-039, apps/api)

**Seed migration:** a new file, `src/db/migrations/0004_seed_exercises.sql`.
- One `INSERT OR IGNORE INTO exercises (id, name)` row per name above.
- Each row has a fixed UUID written into the file, so every database gets the same ids. Plans and logs (REQ-409 to REQ-411) will point at these ids.
- `INSERT OR IGNORE` with the `UNIQUE COLLATE NOCASE` name means running it twice does nothing.
- It reaches Turso with `npm run db:migrate`.

**Route:** a new file, `src/routes/exercises.ts`, registered in `src/glue/routes.ts` outside the knm markers.
- `GET /exercises` (browser: `/api/exercises`) uses `requireAuth`, and `sessionCheck` runs globally.
- It answers 200 `{ exercises: [{ id, name }] }`, ordered by `name COLLATE NOCASE`, so A–Z ignoring letter case.
- It is read-only. There is no POST, PUT or DELETE (REQ-408).
- There is no search parameter. With about 40 rows the web filters the loaded list, so typing gives an instant result without a request per key.

### web (APP-038, apps/web)

**Search rule:** a new file, `src/features/exercises/exerciseSearch.ts`, exports `filterExercises(list, typed)`.
- `typed` is trimmed. When the result is empty, the full list is returned.
- Otherwise it keeps the exercises whose `name.toLowerCase()` contains `typed.toLowerCase()`, in the same order.
- `noMatchMessage(typed)` returns `No exercises match "<trimmed typed text>"`.

**Screen:** a new file, `src/features/exercises/ExercisesPage.tsx`, inside `SignedInLayout`.
- Heading "Exercises", a search input labelled "Search", and the list below it.
- **Load:** `authFetch('/api/exercises')` once when the screen opens.
  - While it loads, show "Loading...".
  - On an error other than 401: "Something went wrong. Please try again.".
  - A 401 is handled by `authFetch`, which sends the user to sign-in (WI-046).
- **Search:** filtering happens on every change of the input, with no button.
- **No match:** shows the no-match message in place of the list.

**Header link:** in `src/features/auth/SignedInLayout.tsx`, add an **Exercises** link (react-router `Link`, shown as a Chakra button) to `/exercises`, to the left of Sign out. It appears on every signed-in screen.

**Router:** in `src/app/router.tsx`, add `{ id: 'exercises', path: '/exercises', element: <RequireAuth><SignedInLayout><ExercisesPage /></SignedInLayout></RequireAuth> }` outside the knm markers.

## Behaviour against the acceptance criteria
| REQ-408 acceptance criterion | How it is met |
|---|---|
| Open Exercises from the header link; signed-out visitors go to sign-in | Header link, `/exercises` route inside `RequireAuth`, and `requireAuth` on the API |
| All seeded exercises, A–Z ignoring case | `GET /exercises` ordered `COLLATE NOCASE`, rendered in that order |
| Typing shows only names containing the text, ignoring case and spaces at the ends | `filterExercises` on every change |
| Clearing the box shows the full list | An empty or only-spaces search returns the full list |
| No match shows `No exercises match "<typed text>"` | `noMatchMessage`, with the text trimmed |
| About 40 exercises from a reviewed seed list | `0004_seed_exercises.sql` with the 40 names above, reviewed through this work item |

## Edge cases
- **Search text with inner spaces**, for example "bench press": it must appear in the name as typed, with case ignored, so "bench press" finds "Bench press" and "Incline bench press".
- **Punctuation:** "pull-up" finds "Pull-up". "pullup" finds nothing, because the rule is a plain "contains".
- **Quotes in the typed text**, for example `a"b`: the message shows them as typed. React escapes the text.
- **The API answers an empty list** (for example before the migration runs on Turso): the screen shows no rows and no no-match message, because no search was typed.

## Existing code reused
- `apps/api/src/auth/authMiddleware.ts` (`requireAuth`), `src/auth/sessionCheck.ts`, `src/http/app.ts` (`wrapAsync`, `RouteEntry`) and `src/db/models/exercises.ts`. The model is generated, and the table is not changed.
- `apps/web/src/app/authFetch.ts`, `src/features/auth/RequireAuth.tsx`, `SignedInLayout.tsx` and `src/testing/render`.

## Areas and files likely affected
- apps/api/src/db/migrations/0004_seed_exercises.sql (new).
- apps/api/src/routes/exercises.ts (new).
- apps/api/src/glue/routes.ts: registers `exercisesRoute`.
- apps/api/tests/routes/exercises.test.ts (new):
  - 401 without a token
  - 200 with 40 exercises in A–Z order ignoring case
  - the names equal the reviewed list
  - ids are stable and unique
  - the seed is safe to run twice
  - there are no write routes (PUT and POST give 404)
- apps/web/src/features/exercises/exerciseSearch.ts (new).
- apps/web/src/features/exercises/ExercisesPage.tsx (new).
- apps/web/src/features/auth/SignedInLayout.tsx: the Exercises link.
- apps/web/src/app/router.tsx: the `/exercises` route.
- apps/web/tests/features/exercises/exerciseSearch.test.ts (new): contains, any case, trimming, empty and only spaces, order kept, the message.
- apps/web/tests/features/exercises/ExercisesPage.test.tsx (new):
  - loads and lists in order
  - filters as you type ("squat", "SQUAT", " squat ")
  - clearing restores the list
  - the no-match message
  - the error message
  - a signed-out visitor goes to sign-in
- apps/web/tests/features/auth/SignedInLayout.test.tsx: the header shows the Exercises link, and it goes to `/exercises`.

## Risks
- **The seed migration must also run on Turso** (`npm run db:migrate`). Until then, the screen shows an empty list.
- **Changing a name later needs a new migration.** Migrations are forward-only, and an applied migration must not be edited. Renaming means a new migration with an `UPDATE`, and the ids stay the same.
- **Search is done in the browser.** If the library grows far beyond about 40 rows, a server-side search parameter may be needed; REQ-408 does not ask for one now.

## Assumptions
- **The header link reads "Exercises" and sits left of Sign out,** as in mock.md. No other navigation (for example a link to Profile) is added; REQ-408 does not ask for it.
- **Fixed UUIDs in the seed file** satisfy the DB design rule "id TEXT UUID generated by the app". They are generated once, when the migration is written.
