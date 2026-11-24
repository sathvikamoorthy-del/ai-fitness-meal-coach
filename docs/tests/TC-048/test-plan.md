# Test plan: Exercise library, browse and search

Test case TC-048 · Requirement REQ-408 · Work item WI-072 · Feature FEAT-1371

## Scope
Checks every acceptance criterion of REQ-408, including the product owner's answers recorded in it:
- search by "contains", ignoring case and spaces at the ends;
- a seed list the product owner reviewed;
- its own screen, linked from the header;
- A–Z order and the no-match message.

It also covers the edge cases in WI-072 `impl.md`.

## Setup
- **API test:**
  - `apps/api/tests/routes/exercises.test.ts`.
  - It uses the in-memory database (`:memory:`) with migrations `0001`–`0004`.
  - Requests are made as a signed-in user with a live session.
- **Web tests:**
  - `apps/web/tests/features/exercises/exerciseSearch.test.ts`, `ExercisesPage.test.tsx` and `apps/web/tests/features/auth/SignedInLayout.test.tsx`.
  - The API is mocked.
- **Manual check (S12):**
  - The API runs against the project's Turso database after `npm run db:migrate`.
  - It uses a throwaway account, which is deleted again at the end.
- **The reviewed list:** the 40 names in WI-072 `impl.md`, from "Back squat" to "Walking lunge". The product owner accepted it with the WI-072 preview (v1).

## Scenarios

### Library content (API)
| # | Steps | Expected |
|---|---|---|
| S1 | `GET /exercises` as a signed-in user | 200 `{ exercises: [{ id, name }] }` with exactly the 40 reviewed names, in A–Z order ignoring case ("Back squat" first, "Walking lunge" last). |
| S2 | Check the ids in S1 | 40 different UUIDs. Each one is the fixed id written next to that name in `0004_seed_exercises.sql`. |
| S3 | Run the seed statement again, try to insert "BACK SQUAT", then run `migrate` again | Still 40 rows. "BACK SQUAT" is refused (UNIQUE, ignoring case). `migrate` reports nothing to apply. |
| S4 | `POST`, `PUT` and `DELETE /exercises` | 404 for each. The library is read-only. |
| S5 | `GET /exercises` without a token | 401 `unauthorized`. |

### Screen and navigation (web)
| # | Steps | Expected |
|---|---|---|
| S6 | Signed in on any screen with the header | An **Exercises** link to `/exercises` appears left of Sign out. Clicking it opens the Exercises screen. |
| S7 | Open `/exercises` while signed out | Sent to sign-in. No request is made for exercises. |
| S8 | Open the Exercises screen | Heading "Exercises", a Search box, and the list from the API in its order. |

### Search (web)
| # | Steps | Expected |
|---|---|---|
| S9 | Type "squat", then "SQUAT", then " squat " | Each time only the names containing "squat" show, in A–Z order ("Back squat", "Goblet squat" in the test data). No extra API request. |
| S10 | Type "squat", then clear the box (or leave only spaces) | The full list shows again. |
| S11 | Type " zumba " | The list is replaced by: No exercises match "zumba". |
| S11a | Search rule details: "bench press" (inner space), "ench", "pull-up" and "pullup" (punctuation), text with a quote (`a"b`) | "bench press" finds "Bench press" and "Incline bench press". "ench" finds both too. "pull-up" finds "Pull-up". "pullup" finds nothing. The message shows the quote as typed. |
| S11b | The API fails (500) | "Something went wrong. Please try again.". |

### End to end against Turso (manual)
| # | Steps | Expected |
|---|---|---|
| S12 | Run `npm run db:migrate` on Turso. Start the API, sign up and sign in a throwaway account, `GET /exercises`, then delete the account | The migration applies `0004_seed_exercises` (or reports nothing to apply). GET returns 200 with the 40 reviewed names in A–Z order, with the ids from the seed file. Afterwards no rows of the account remain. |

## Pass criteria
All scenarios give the expected result. The automated API and web tests cover S1–S11b, and S12 is run by hand against Turso.

## Acceptance criteria coverage
| REQ-408 acceptance criterion | Scenarios |
|---|---|
| Open Exercises from the header link; signed-out visitors go to sign-in | S5, S6, S7 |
| All seeded exercises, A–Z ignoring case | S1, S8, S12 |
| Typing shows names containing the text, ignoring case and spaces at the ends | S9, S11a |
| Clearing the search shows the full list again | S10 |
| No match shows `No exercises match "<typed text>"` | S11 |
| About 40 exercises from a reviewed seed list | S1, S2, S3, S12 |
