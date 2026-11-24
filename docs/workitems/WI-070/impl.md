# Profile with goal, fitness level and daily calorie target

Applications: api (primary), web

Work item WI-070 · Requirement REQ-406 · Decision DEC-441 · Feature FEAT-1369
Builds on: WI-045 (sign-in, `isProfileComplete`), WI-046 (`sessionCheck`, `authFetch`, `SignedInLayout`).

## Answered question
- **q1, target of 0 kcal or less:** refuse the save with a message. If the rounded daily calorie target is 0 or less, nothing is saved, and the API answers 400 with "This goal gives a calorie target that is too low; choose maintain or gain weight." This happens only with goal "lose weight" at the low end of the ranges, for example female, 100 years, 100 cm, 30 kg gives −130 kcal. It also keeps the database rule `daily_calorie_target > 0` intact.

## Approach

### api (APP-039, apps/api)

**Reference data:** a new migration, `src/db/migrations/0002_seed_profile_reference.sql`.
- `goal_types`: (`lose`, "Lose weight"), (`gain`, "Gain weight"), (`maintain`, "Maintain weight").
- `fitness_levels`: (`beginner`, "Beginner"), (`intermediate`, "Intermediate"), (`advanced`, "Advanced").
- It uses `INSERT OR IGNORE`, so running it twice does nothing.
- These codes come from the final DB design. Today both tables are empty, so a profile save would fail on the foreign keys.
- It reaches Turso with the existing `npm run db:migrate`.

**Calorie target:** a new file, `src/profile/calorieTarget.ts`, exports `dailyCalorieTarget({ sex, age, heightCm, weightKg, goal }): number`.
1. Base = 10 × weight_kg + 6.25 × height_cm − 5 × age, then +5 for male or −161 for female.
2. Multiply by 1.4.
3. Lose: −500. Gain: +300. Maintain: no change.
4. Round with `Math.round` to the nearest whole kcal, and return that whole number.

This is the only place the formula lives. REQ-418 will only read the stored value.

**Validation:** a new file, `src/profile/profileRules.ts`, exports the rules and `validateProfile(body)`.
- It returns either `{ ok: true, value }` or `{ ok: false, fields: { <field>: message } }`, with one message per bad field.
- All six fields are required.
- Ranges are inclusive. Values must be JSON numbers, and strings are refused.

| Field (JSON) | Rule | Message |
|---|---|---|
| `age` | whole number, 13–100 | "Age is required." / "Age must be a whole number between 13 and 100." |
| `sex` | `female` or `male` | "Sex is required." |
| `heightCm` | number, 100–250 | "Height is required." / "Height must be between 100 and 250 cm." |
| `weightKg` | number, 30–300 | "Weight is required." / "Weight must be between 30 and 300 kg." |
| `goal` | `lose`, `gain` or `maintain` | "Goal is required." |
| `fitnessLevel` | `beginner`, `intermediate` or `advanced` | "Fitness level is required." |

An unknown code for `sex`, `goal` or `fitnessLevel` gets the same "is required" message, because the user can only pick from the offered choices.

**Routes:** a new file, `src/routes/profile.ts`, registered in `src/glue/routes.ts` outside the knm markers. Both routes use `requireAuth`, and `sessionCheck` already runs globally.

`GET /profile`:
- Answers 200 `{ profile }`. `profile` holds the six fields plus `dailyCalorieTarget`, or is `null` when the user has no profile row yet.
- A row with some fields still empty returns those fields as `null`.
- `daily_water_target_ml` and `diet_type` are not returned, because they are not shown on the profile.

`PUT /profile`, body `{ age, sex, heightCm, weightKg, goal, fitnessLevel }`:
1. `validateProfile`. If it fails: 400 `{ error: "invalid-profile", fields }`, and nothing is written.
2. `dailyCalorieTarget(...)`. If it is <= 0: 400 `{ error: "calorie-target-too-low" }`, nothing is written, and the message is the one in "Answered question".
3. Upsert the user's `profiles` row: `INSERT ... ON CONFLICT(user_id) DO UPDATE`.
   - It sets the six fields, `daily_calorie_target` and `updated_at`.
   - It never touches `diet_type` (REQ-407) or `daily_water_target_ml`. A new row gets the database default of 2000.
4. Answer 200 `{ profile, profileComplete: true }`, where `profile` has the same shape as GET.

Every save recomputes the target. Nothing else in this work item writes it. In particular, a weight logged later (REQ-419) does not recompute it; REQ-419 must not call `dailyCalorieTarget`.

### web (APP-038, apps/web)

**Rules:** a new file, `src/features/profile/profileRules.ts`, with the same ranges and messages as the API, used to check the form before sending. The API stays the authority.

**Profile page:** a new file, `src/features/profile/ProfilePage.tsx`, built with Chakra UI as in mock.md, inside `SignedInLayout`.
- Heading "Profile".
- Fields:
  - **Age:** a number input, hint "13 to 100".
  - **Sex:** radio buttons, Female and Male.
  - **Height (cm):** hint "100 to 250".
  - **Weight (kg):** hint "30 to 300". Decimals are allowed, for example 68.4.
  - **Goal:** radio buttons, Lose weight, Gain weight and Maintain weight.
  - **Fitness level:** a select with the placeholder "choose..." and the options Beginner, Intermediate and Advanced.
  - The **Save** button.
- Units are fixed to cm and kg, and there is no unit choice.

**Load:**
- `authFetch('/api/profile')` fills the form with saved values.
- If a target is saved, it shows "Daily calorie target  1,434 kcal", formatted with `toLocaleString('en-US')`.
- When `profile` is `null`, the form is empty and no target is shown.

**Save:**
1. Check the form against the rules. If any field fails, show its message under the field and do not send.
2. Otherwise send `authFetch('/api/profile', { method: 'PUT', ... })`. Number fields are sent as numbers, and an empty field as `null`.
3. Handle the answer:
   - 200: update the form and the target, and show "Profile saved". The user stays on the Profile screen.
   - 400 `invalid-profile`: show each `fields` message under its field.
   - 400 `calorie-target-too-low`: show the answer's message under Goal.
   - 401: `authFetch` already sends the user to sign-in (WI-046).
   - Any other error: "Something went wrong. Please try again."

**Router:** in `src/app/router.tsx`, `/profile` becomes `<RequireAuth><SignedInLayout><ProfilePage /></SignedInLayout></RequireAuth>`, outside the knm markers. `/today` stays a placeholder.

## Behaviour against the acceptance criteria
| REQ-406 acceptance criterion | How it is met |
|---|---|
| Enter age, sex, height (cm), weight (kg), goal and fitness level, and save | Profile page, and `PUT /profile` upsert |
| An empty field is refused, and the message names it | "<Field> is required." from the web check and the API (400 `invalid-profile`) |
| Out-of-range age, height or weight is refused, and the message names the field and range | Range messages in the table above |
| Metric only, no unit choice | Fixed "(cm)" and "(kg)" labels and no unit control. The API takes only `heightCm` and `weightKg`. |
| Target computed with the formula, rounded, and stored | `dailyCalorieTarget`, stored in `profiles.daily_calorie_target`. Example: female, 32, 163, 68.4, lose gives 1,434. |
| Target shown after saving | Shown under the form from the PUT answer |
| Saving again recomputes | Every PUT recomputes |
| A logged weight does not change the target | Nothing outside `PUT /profile` writes the target (REQ-419 note above) |
| New profile water target is 2,000 ml, not shown | Database default on insert. It is not in the API answer or on the page. |
| All six fields means complete; diet and allergies are not needed | `isProfileComplete` (WI-045) is unchanged, and the PUT answer gives `profileComplete: true` |
| Saved values shown again on return | `GET /profile` on load |
| (q1) A target of 0 kcal or less is refused | 400 `calorie-target-too-low` with the agreed message. Nothing is saved. |

## Edge cases
- **Rounding:** `Math.round(1434.45)` is 1434. Floating-point error near .5 can only move a value by 1 kcal.
- **Age as a decimal**, for example 32.5: refused with the "whole number" message.
- **Range ends:** 13, 100, 100 cm, 250 cm, 30 kg and 300 kg are accepted. 12, 101, 99.9 cm, 250.1 cm, 29.9 kg and 300.1 kg are refused.
- **A string such as "32"** in the API body is refused. The web always sends numbers.
- **Upsert keeps other columns:** an existing `diet_type` is kept, and `daily_water_target_ml` is never changed.
- **Two saves at once from two tabs:** the last write wins. Both are valid and complete profiles.

## Existing code reused
- `apps/api/src/auth/authMiddleware.ts` (`requireAuth`) and `src/auth/sessionCheck.ts`.
- `apps/api/src/auth/profileStatus.ts` (`isProfileComplete`, `REQUIRED_PROFILE_FIELDS`), unchanged.
- `apps/api/src/db/models/profiles.ts`, `goal_types.ts` and `fitness_levels.ts`. These models are generated, and the tables are not changed.
- `apps/api/src/http/app.ts` (`wrapAsync`, `RouteEntry`) and `src/db/migrate.ts`.
- `apps/web/src/app/authFetch.ts`, `src/features/auth/SignedInLayout.tsx`, `RequireAuth.tsx` and `src/testing/render`.

## Areas and files likely affected
- apps/api/src/db/migrations/0002_seed_profile_reference.sql (new).
- apps/api/src/profile/calorieTarget.ts (new).
- apps/api/src/profile/profileRules.ts (new).
- apps/api/src/routes/profile.ts (new).
- apps/api/src/glue/routes.ts: registers `profileRoute`.
- apps/api/tests/profile/calorieTarget.test.ts (new):
  - the REQ-406 example (1,434)
  - male, gain and maintain
  - rounding
  - the −130 case
- apps/api/tests/profile/profileRules.test.ts (new): each required field, the range ends, age as a decimal, strings, unknown codes.
- apps/api/tests/routes/profile.test.ts (new):
  - 401 without a token
  - GET with no row
  - PUT saves and GET returns it with the target
  - saving again recomputes
  - a missing field gives 400 with its message, and nothing is saved
  - too low gives 400 with nothing saved
  - `diet_type` is kept
  - the water target is 2000 on a new row
  - `profileComplete` is true after saving
  - the seed migration runs twice without error
- apps/web/src/features/profile/profileRules.ts (new).
- apps/web/src/features/profile/ProfilePage.tsx (new).
- apps/web/src/app/router.tsx: `/profile` uses `ProfilePage`.
- apps/web/tests/features/profile/ProfilePage.test.tsx (new):
  - the fields and hints from the mock
  - loads and shows saved values and the target "1,434 kcal"
  - an empty field or a range error is shown and not sent
  - a save sends numbers and shows the new target
  - API field errors are shown
  - the too-low message is shown under Goal
  - no water target is shown
- apps/web/tests/features/profile/profileRules.test.ts (new).

## Risks
- **The seed migration must also run on Turso** (`npm run db:migrate`) before the profile is used there. Until then, a save fails on the foreign key with a 500.
- **The rules live in both the API and the web.** The API is the authority, and the tests check the same range ends on both sides, so a drift shows up as a failing test.
- **Very low but positive targets are saved,** for example 50 kcal. q1 only covers 0 or less, and REQ-406 sets no minimum.

## Assumptions
- **After saving, the user stays on the Profile screen** with the target shown, as in mock.md. Going on to Today after the first save is not asked for.
- **A whole field error list is returned at once,** so the user sees every bad field on one save, as the mock's refused-save example shows two fields.
