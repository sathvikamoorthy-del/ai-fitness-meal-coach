# Test plan: Profile, goal, fitness level and daily calorie target

Test case TC-046 · Requirement REQ-406 · Work item WI-070 · Feature FEAT-1369

## Scope
Checks every acceptance criterion of REQ-406, the answered question WI-070 q1 (a target of 0 kcal or less is refused), and the failure and edge cases in WI-070 `impl.md`.

## Setup
- **API tests:**
  - `apps/api/tests/profile/calorieTarget.test.ts`, `tests/profile/profileRules.test.ts` and `tests/routes/profile.test.ts`.
  - All use the in-memory database (`:memory:`) with migrations `0001_db_design.sql` and `0002_seed_profile_reference.sql`.
  - Requests are made as a signed-in user with a live session (`authenticate` and `sessionCheck` run).
- **Web tests:** `apps/web/tests/features/profile/profileRules.test.ts` and `ProfilePage.test.tsx`, with the API mocked.
- **Manual check (S20):** the API running against the project's Turso database after `npm run db:migrate`, signed in with an existing account.
- **Example profile P:** female, 32 years, 163 cm, 68.4 kg, lose weight, beginner. Its target is 1,434.45, rounded to 1,434 kcal.

## Scenarios

### Calorie target formula
| # | Steps | Expected |
|---|---|---|
| S1 | Compute the target for P | 1,434 (10 × 68.4 + 6.25 × 163 − 5 × 32 − 161 = 1,381.75; × 1.4 = 1,934.45; − 500 = 1,434.45; rounded) |
| S2 | Male, 30, 180 cm, 80 kg, with maintain, gain and lose. Then the same person as female, maintain | Male: 2,492, 2,792 and 1,992. Female: 2,260 (2,259.6 rounded). |
| S3 | Female, 25, 160 cm, 60 kg, maintain; and 60.5 kg, lose | 1,840 (1,839.6) and 1,347 (1,346.6). Rounded to the nearest whole kcal. |

### Fields and validation
| # | Steps | Expected |
|---|---|---|
| S4 | `PUT /profile` with each of the six fields missing, `null` or `""` in turn | 400 `invalid-profile`, with the field's message: "Age is required.", "Sex is required.", "Height is required.", "Weight is required.", "Goal is required." or "Fitness level is required.". Nothing is saved. |
| S5 | Age 12, 101 and 32.5; height 99.9 and 250.1; weight 29.9 and 300.1 | 400 with "Age must be a whole number between 13 and 100.", "Height must be between 100 and 250 cm." or "Weight must be between 30 and 300 kg.". |
| S6 | Age 13 and 100; height 100, 250 and 163.5; weight 30, 300 and 68.4 | Accepted. The range ends are included. |
| S7 | Send `{ heightCm: 300 }` with no fitness level | Both messages come back in one answer. Nothing is saved. |
| S8 | Send numbers as strings (`"32"`), or codes that are not offered (`sex: "other"`, `goal: "bulk"`, `fitnessLevel: "expert"`) | Refused with that field's message. |
| S9 | Web: open Profile, enter height 300, leave the other fields empty, click Save | Every field's message shows under it. No PUT is sent. |

### Save, target and return
| # | Steps | Expected |
|---|---|---|
| S10 | Signed in with no profile: `GET /profile`, then open the Profile page | `{ profile: null }`. The form is empty and no target is shown. |
| S11 | `PUT /profile` with P | 200 `{ profile: P + dailyCalorieTarget: 1434, profileComplete: true }`. The row has `daily_calorie_target` = 1434. |
| S12 | After S11: `GET /profile` and open the Profile page | The same six values come back. The page shows them (Female and Lose weight checked, Beginner selected), and "Daily calorie target 1,434 kcal". |
| S13 | Web: fill in P and Save | The PUT body has numbers as numbers: `{ age: 32, sex: "female", heightCm: 163, weightKg: 68.4, goal: "lose", fitnessLevel: "beginner" }`. "Profile saved" and "1,434 kcal" are shown, and the user stays on Profile. |
| S14 | After S11: PUT again with goal = maintain | The target is recomputed to 1,934. The page shows "1,934 kcal". |
| S15 | After S11: change the profile weight the way a weight log will (REQ-419 writes `profiles.weight_kg`), here by updating `weight_kg` to 70 in the database, then `GET /profile` | `weightKg` is 70, and `dailyCalorieTarget` is still 1,434. Only `PUT /profile` writes the target. |

### Water target and completeness
| # | Steps | Expected |
|---|---|---|
| S16 | After the first save of a new profile, read the row; also open the Profile page | `daily_water_target_ml` = 2000. Neither the API answer nor the page shows a water target. |
| S17 | After S11: check `isProfileComplete` for the user, with no diet or allergies set | `true`. A profile row with only some fields filled returns those fields as `null` from GET and does not count as complete. |
| S18 | A profile row with `diet_type = vegetarian` and water target 2500, then PUT P | `diet_type` and 2500 are kept. Only the six fields and the target change. |

### Calorie target too low (WI-070 q1)
| # | Steps | Expected |
|---|---|---|
| S19 | PUT female, 100, 100 cm, 30 kg, lose, beginner (target −130) for a user with no profile. Then for a user who already saved P | 400 `{ error: "calorie-target-too-low", message: "This goal gives a calorie target that is too low; choose maintain or gain weight." }`. No row is created for the first user. The second user's saved P and 1,434 are unchanged. The same values with goal = maintain are saved, with a target of 370. On the web, the message shows under Goal and the old target stays. |

### End to end against Turso (manual)
| # | Steps | Expected |
|---|---|---|
| S20 | Run `npm run db:migrate` on Turso. Start the API, sign in, `PUT /profile` with P, `GET /profile`, then PUT the too-low profile from S19 | The migration applies `0002_seed_profile_reference` (or reports nothing to apply). PUT gives 200 with target 1,434, and GET shows it again. The too-low PUT gives 400 `calorie-target-too-low`. |

### Other checks
| # | Steps | Expected |
|---|---|---|
| S21 | GET or PUT `/profile` without a token | 401 `unauthorized`. A 401 on the page sends the user to sign-in. |
| S22 | Run the seed migration's statements again on a database that already has them | No error, still 3 goal types and 3 fitness levels. `migrate` reports nothing to apply. |

## Pass criteria
All scenarios give the expected result. The automated API and web tests cover S1–S14 and S16–S19, S21 and S22. S15 and S20 are run by hand: S15 against the in-memory database or Turso, and S20 against Turso.

## Note on S15
REQ-419 (weight log) is not built yet. S15 checks the effect REQ-406 requires: changing `profiles.weight_kg`, which is what a weight log will do per the DB design, leaves the stored target alone. The full flow through the weight log screen belongs to REQ-419's own test.

## Acceptance criteria coverage
| REQ-406 acceptance criterion | Scenarios |
|---|---|
| Enter age, sex, height (cm), weight (kg), goal and fitness level, and save | S11, S13 |
| An empty field is refused, and the message names it | S4, S7, S9 |
| Out-of-range age, height or weight is refused, and the message names the field and range | S5, S6, S9 |
| Only metric units are accepted and shown, with no unit choice | S8, S13 (the page has fixed "(cm)" and "(kg)" fields and no unit control) |
| Target computed with the formula, rounded, and stored (example 1,434) | S1–S3, S11 |
| Target shown after saving | S12, S13 |
| Saving again recomputes the target | S14 |
| A logged weight changes the profile weight but not the target | S15 |
| New profile water target is 2,000 ml and not shown | S16 |
| All six fields filled means complete; diet and allergies not needed | S17 |
| Saved values shown again on return | S12 |
| (WI-070 q1) A target of 0 kcal or less is refused | S19, S20 |
