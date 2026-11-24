# Diet preference and allergies

Applications: api (primary), web

Work item WI-071 · Requirement REQ-407 · Decision DEC-442 · Feature FEAT-1370
Builds on: WI-070 (profile route, Profile page, seed migration pattern), WI-046 (`sessionCheck`, `authFetch`).

## Answered questions
- **q1, placement:** on the Profile screen, as a separate section below the six profile fields, with its own Save button (as in mock.md). It has its own endpoint, so saving diet and allergies never needs the six profile fields, and the reverse.
- **q2, diet:** optional. It can be left unset, and the user can clear it again.
- **q3, allergy names:** trim spaces at both ends and keep the user's spelling. A duplicate is refused ignoring letter case, so "Peanuts" and "peanuts" are the same allergy.
- **q4, limits:** a name is 1 to 50 characters, after trimming and counted in characters. A user has at most 20 allergies.
- **From the final DB design:** allergies are free text, one row per allergy (`user_allergies`). This answers REQ-407's own open question.

## Approach

### api (APP-039, apps/api)

**Reference data:** a new migration, `src/db/migrations/0003_seed_diet_types.sql`, adds `INSERT OR IGNORE` rows to `diet_types`: (`vegetarian`, "Vegetarian") and (`non_vegetarian`, "Non-vegetarian"). These codes come from the final DB design. Today the table is empty, so saving a diet would fail on the foreign key. It reaches Turso with `npm run db:migrate`.

**Rules:** a new file, `src/profile/dietRules.ts`, exports `validateDiet(body)`. It returns either `{ ok: true, value: { diet, allergies } }` or `{ ok: false, fields: { diet?, allergies? } }`.

`diet`:
- `"vegetarian"`, `"non_vegetarian"` or `null`. A missing value counts as `null`, which clears the diet.
- Anything else is refused with "Choose vegetarian or non-vegetarian, or leave it empty.".

`allergies`:
- An array of strings, and a missing value counts as `[]`. Each name is trimmed.
- An empty name, or one over 50 characters, is refused with "Allergy names must be 1 to 50 characters.".
- Two names that are equal ignoring letter case are refused with "'<name>' is already in your list.".
- More than 20 names are refused with "You can list at most 20 allergies.".
- A value that is not an array of strings is refused with "Allergies must be a list of names.".
- Only the first allergy error is reported.

The case-insensitive comparison uses `toLowerCase()` on the trimmed name. The stored name keeps the user's spelling.

**Routes:** a new file, `src/routes/diet.ts`, registered in `src/glue/routes.ts` outside the knm markers. Both routes use `requireAuth`, and `sessionCheck` runs globally.

`GET /profile/diet`:
- Answers 200 `{ diet, allergies }`.
- `diet` is `profiles.diet_type`, or `null` when unset or when there is no profile row.
- `allergies` is the user's names sorted alphabetically, ignoring case.

`PUT /profile/diet`, body `{ diet, allergies }`:
1. `validateDiet`. If it fails: 400 `{ error: "invalid-diet", fields }`, and nothing is written.
2. Write everything in one `orm.batch`, so it all applies or nothing does:
   - **Diet:**
     - When a profile row exists, update only its `diet_type` and `updated_at`.
     - When there is no row and the diet is not `null`, insert a row with only `user_id` and `diet_type`; the six REQ-406 fields stay empty.
     - When there is no row and the diet is `null`, write nothing.
   - **Allergies:** the saved list becomes exactly the sent list. Delete the user's `user_allergies` rows, then insert one row per name with a new UUID.
3. Answer 200 `{ diet, allergies }`, in the same shape as GET.

This route never touches the six REQ-406 fields or `daily_calorie_target`. REQ-406's `PUT /profile` already keeps `diet_type`.

### web (APP-038, apps/web)

**Rules:** a new file, `src/features/profile/dietRules.ts`, with the same rules and messages as the API, plus `addAllergy(list, input)`. It returns the new list or the error message for that input.

**Diet and allergies section:** a new file, `src/features/profile/DietSection.tsx`, shown on `ProfilePage` below the six profile fields and the calorie target, with its own heading "Diet and allergies".
- **Diet:** radio buttons for Vegetarian and Non-vegetarian, plus a **Clear** button, because radio buttons cannot be unselected. Nothing is selected when the diet is unset.
- **Allergies:** each saved or added name is shown as a tag with an **×** button that removes it.
- **Adding:** a text input with an **Add** button; Enter also adds. The name is trimmed. An empty name, a name over 50 characters, a duplicate ignoring case, or a 21st allergy shows the matching message under the input and is not added.
- **Save:** its own Save button. It sends `PUT /api/profile/diet` with `{ diet, allergies }` through `authFetch`.
  - 200: show "Diet and allergies saved", and replace the shown list with the answer, which is sorted.
  - 400 `invalid-diet`: show the field messages.
  - 401: handled by `authFetch`.
  - Any other error: "Something went wrong. Please try again."
- **Load:** `GET /api/profile/diet` when the section first appears.
- **Independent saving:** adding or removing a tag changes nothing until Save. The profile's Save button and this Save button work independently.

**Profile page:** `src/features/profile/ProfilePage.tsx` renders `<DietSection />` at the bottom. Nothing else on the page changes.

## Behaviour against the acceptance criteria
| REQ-407 acceptance criterion and answers | How it is met |
|---|---|
| The user can choose vegetarian or non-vegetarian | Radio buttons, saved as `profiles.diet_type` |
| (q2) Diet is optional and can be cleared | The Clear button and `diet: null`. With no profile row and no diet, nothing is written. |
| The user can add and remove allergies | Add input and button, × on each tag, then Save. The saved set equals the sent list. |
| (q3) Names are trimmed, spelling is kept, and duplicates are refused ignoring case | `validateDiet` and `addAllergy` |
| (q4) A name is 1–50 characters, at most 20 allergies | `validateDiet` and `addAllergy` |
| Saved values are shown again on return | `GET /profile/diet` when the section loads |
| (q1) A separate section on the Profile screen with its own Save | `DietSection` with its own endpoint |

## Edge cases
- **Diet saved before the profile:** a profile row with only `diet_type` is created. It is not complete (`isProfileComplete` is false), and a later REQ-406 save fills the six fields and keeps the diet.
- **Removing every allergy and saving:** all rows are deleted.
- **Names with inner spaces**, for example "tree nuts": the inner space is kept, and only the ends are trimmed.
- **Characters outside ASCII**, for example "Sésame": counted per character, and the case-insensitive comparison uses JavaScript `toLowerCase`.
- **Two tabs saving different lists:** the last save wins. Each save replaces the whole list.
- **The database `UNIQUE (user_id, name)` is case-sensitive.** The app rule, ignoring case, is stricter, so the database never sees a duplicate the app accepted.

## Existing code reused
- `apps/api/src/auth/authMiddleware.ts` (`requireAuth`), `src/auth/sessionCheck.ts`, and `src/http/app.ts` (`wrapAsync`, `RouteEntry`).
- `apps/api/src/db/models/profiles.ts`, `user_allergies.ts` and `diet_types.ts`. These models are generated, and the tables are not changed.
- `apps/api/src/routes/profile.ts`: its `PUT` already leaves `diet_type` alone. It is not changed.
- `apps/web/src/app/authFetch.ts` and `src/features/profile/ProfilePage.tsx`, which gains one line.

## Areas and files likely affected
- apps/api/src/db/migrations/0003_seed_diet_types.sql (new).
- apps/api/src/profile/dietRules.ts (new).
- apps/api/src/routes/diet.ts (new).
- apps/api/src/glue/routes.ts: registers `dietRoute`.
- apps/api/tests/profile/dietRules.test.ts (new):
  - diet values
  - trimming and spelling kept
  - names of 0, 1, 50 and 51 characters
  - duplicates ignoring case
  - 20 and 21 allergies
  - non-array input
- apps/api/tests/routes/diet.test.ts (new):
  - 401 without a token
  - GET for a new user gives `{ diet: null, allergies: [] }`
  - PUT then GET returns the sorted list and the diet
  - remove and add
  - clear the diet
  - no profile row and a null diet writes nothing
  - diet saved before the profile, then REQ-406 PUT keeps it
  - the six profile fields are not touched
  - invalid input gives 400 and nothing is changed
  - the seed provides both diet codes
- apps/web/src/features/profile/dietRules.ts (new).
- apps/web/src/features/profile/DietSection.tsx (new).
- apps/web/src/features/profile/ProfilePage.tsx: renders `DietSection`.
- apps/web/tests/features/profile/dietRules.test.ts (new).
- apps/web/tests/features/profile/DietSection.test.tsx (new):
  - loads and shows the diet and tags
  - adds with the button and with Enter
  - each refusal message
  - removes with ×
  - Clear unsets the diet
  - Save sends `{ diet, allergies }` and shows the saved message
  - API field errors
  - the Profile page shows the section below the profile form

## Risks
- **The seed migration must also run on Turso** (`npm run db:migrate`). Until then, saving a diet fails on the foreign key with a 500. Allergies alone still save.
- **The rules live in both the API and the web,** as in WI-070. The tests check the same ends and messages on both sides.
- **Meal plans (REQ-413) will match allergies by name.** Names are free text, so a spelling such as "peanut" vs "peanuts" is up to the user. That matching belongs to REQ-413.

## Assumptions
- **Allergies are shown and returned sorted alphabetically, ignoring case,** not in the order they were added. REQ-407 sets no order, and the table has no position column.
- **The section shows "Diet and allergies saved" after a save,** like the profile's "Profile saved".
