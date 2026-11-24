# Test plan: Diet preference and allergies

Test case TC-047 · Requirement REQ-407 · Work item WI-071 · Feature FEAT-1370

## Scope
Checks every acceptance criterion of REQ-407, and the rules set by WI-071's answered questions:
- **q1:** a separate section on the Profile screen with its own Save.
- **q2:** the diet is optional and can be cleared.
- **q3:** names are trimmed with the user's spelling kept, and duplicates are refused ignoring case.
- **q4:** a name is 1–50 characters, at most 20 allergies.

It also covers the failure and edge cases in WI-071 `impl.md`. Allergies are free text, one row per allergy, as in the final DB design.

## Setup
- **API tests:**
  - `apps/api/tests/profile/dietRules.test.ts` and `apps/api/tests/routes/diet.test.ts`.
  - They use the in-memory database (`:memory:`) with migrations `0001`–`0003`.
  - Requests are made as a signed-in user with a live session.
- **Web tests:**
  - `apps/web/tests/features/profile/dietRules.test.ts`, `DietSection.test.tsx` and `ProfilePage.test.tsx`.
  - The API is mocked.
- **Manual check (S16):**
  - The API runs against the project's Turso database after `npm run db:migrate`.
  - It uses a throwaway account, which is deleted again at the end.

## Scenarios

### Diet
| # | Steps | Expected |
|---|---|---|
| S1 | As a new user, `GET /profile/diet`, then open the Profile page | `{ diet: null, allergies: [] }`. Neither radio button is selected, there are no tags, and Clear is disabled. |
| S2 | `PUT /profile/diet` with `diet: "vegetarian"`, then with `"non_vegetarian"`, then `GET` | Each answer is 200 with that diet, and GET shows the last one. On the page, the matching radio button is selected. |
| S3 | After S2: click Clear and Save; the API is sent `diet: null` | 200 with `diet: null`, and GET returns `null`. The diet can be cleared (q2). |
| S4 | `PUT` with `diet: "vegan"`, `""`, `1` or `true` | 400 `invalid-diet` with "Choose vegetarian or non-vegetarian, or leave it empty.". Nothing changes. |

### Allergies: add, remove, rules
| # | Steps | Expected |
|---|---|---|
| S5 | `PUT` with `allergies: [" tree nuts", "Peanuts", "egg "]`, then `GET` | 200 with `["egg", "Peanuts", "tree nuts"]`: trimmed, spelling kept, sorted ignoring case. GET returns the same. |
| S6 | After saving `["Milk", "Soy"]`, `PUT ["Soy", "Sesame"]`, then `PUT []` | The stored rows become exactly `Sesame` and `Soy`, then none. |
| S7 | Web: type "  Peanuts " and click Add, type "Milk" and press Enter, then click × on Peanuts | The tags show "Peanuts", "Milk", then only "Milk". The input clears after each add. Nothing is sent until Save. |
| S8 | `PUT ["Peanuts", " peanuts"]` and `["MILK", "milk"]`. Web: with "Peanuts" saved, add "PEANUTS" | API: 400 with "'peanuts' is already in your list." (or the matching name). Web: the same message, and the tag is not added. Duplicates are refused ignoring case (q3). |
| S9 | Names `""`, `"   "` and 51 characters, through the API and the web Add | Refused with "Allergy names must be 1 to 50 characters.". |
| S10 | Names of 1 and 50 characters, 50 accented characters (`é` × 50), and 50 characters with spaces around them | Accepted, counted in characters after trimming (q4). |
| S11 | Save exactly 20 allergies of 50 characters. Then send 21 to the API, and add a 21st on the web | 20 are saved. The 21st is refused with "You can list at most 20 allergies." (q4). |
| S12 | `PUT` with `allergies: "Egg"`, `[1]`, `[null]` or `{}` | 400 with "Allergies must be a list of names.". A bad diet and a bad list in one request return both messages. |
| S13 | After saving `{ vegetarian, ["Egg"] }`, send each invalid body from S4, S8, S9, S11 and S12 | Every one is 400 `invalid-diet`, and GET still returns `{ vegetarian, ["Egg"] }`. |

### Profile screen and independence (q1)
| # | Steps | Expected |
|---|---|---|
| S14 | Open the Profile page | The "Diet and allergies" section (heading, Diet radios with Clear, Allergies tags and input, its own Save, named "Save diet and allergies") appears below the profile form, which keeps its own Save. Saving one does not send the other. |
| S15 | API: with no profile row, save `{ diet: null, allergies: ["Egg"] }`. Then save `vegetarian` before the profile exists, then `PUT /profile` with the six REQ-406 fields | First: no profile row is created, and GET shows `["Egg"]`. Then: a diet-only row exists and is not complete. After `PUT /profile`, the diet is still vegetarian and the profile is complete. Saving diet and allergies never changes the six fields, the calorie target or the water target. |

### End to end against Turso (manual)
| # | Steps | Expected |
|---|---|---|
| S16 | Run `npm run db:migrate` on Turso, start the API and sign up a throwaway account. `PUT /profile/diet` `{ vegetarian, [" Peanuts", "milk"] }`, `GET`, `PUT` `["peanuts", "PEANUTS"]`, then `PUT { null, [] }` and `GET`. Then delete the account and its rows | The migration applies `0003_seed_diet_types` (or reports nothing to apply). The first save is 200 `{ vegetarian, ["milk", "Peanuts"] }`, and GET returns the same. The duplicate is 400. The clear is 200 `{ null, [] }`. Afterwards no rows of the account remain. |

### Other checks
| # | Steps | Expected |
|---|---|---|
| S17 | `GET` or `PUT /profile/diet` without a token | 401 `unauthorized`. |
| S18 | Read `diet_types` after the migrations | `non_vegetarian` "Non-vegetarian" and `vegetarian` "Vegetarian". |
| S19 | Web: loading or saving fails (500, offline), or the API returns a field message | The generic "Something went wrong. Please try again." or the field message is shown. A save shows "Diet and allergies saved". |

## Pass criteria
All scenarios give the expected result. The automated API and web tests cover S1–S15 and S17–S19, and S16 is run by hand against Turso.

## Acceptance criteria coverage
| REQ-407 acceptance criterion and WI-071 answers | Scenarios |
|---|---|
| The user can choose vegetarian or non-vegetarian | S2, S4, S18 |
| (q2) The diet is optional and can be cleared | S1, S3, S15 |
| The user can add and remove allergies | S5, S6, S7 |
| (q3) Trimmed, spelling kept, duplicates refused ignoring case | S5, S8 |
| (q4) A name is 1–50 characters, at most 20 allergies | S9, S10, S11 |
| Saved preferences and allergies shown again on return | S1, S2, S5, S16 |
| (q1) A separate section with its own Save | S14, S15 |
