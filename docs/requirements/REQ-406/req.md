# User can set profile and fitness goal

Requirement REQ-406 · Feature FEAT-1369 · Decision DEC-441

## Purpose
As a user, I can enter my age, sex, height, weight, goal and fitness level.

The AI plans and calorie targets are built from the profile and goal (G1).

## Behaviour
- **Fields.** The profile has six fields, all required:
  - Age: whole years, 13 to 100.
  - Sex: female or male. It is an input to the calorie formula.
  - Height: in cm, 100 to 250.
  - Weight: in kg, 30 to 300.
  - Goal: lose weight, gain weight or maintain weight.
  - Fitness level: beginner, intermediate or advanced. It is used by the AI workout plan (REQ-409).
- **Units.** Metric only (cm and kg). The user never enters feet, inches or pounds, and there is no unit conversion.
- **Validation.** A missing field, or a value outside its range, is refused with a clear message that names the field and its allowed range. Nothing is saved until every field is valid.
- **Daily calorie target.** When the profile is saved, the app works out the daily calorie target and stores it as `profiles.daily_calorie_target`:
  - Base (Mifflin-St Jeor): 10 × weight (kg) + 6.25 × height (cm) − 5 × age (years), then +5 for male or −161 for female.
  - Multiply the base by 1.4.
  - Lose weight: subtract 500. Gain weight: add 300. Maintain weight: no change.
  - After saving, the target is shown on the profile in kcal. The daily calorie summary (REQ-418) only reads this value.
- **When the target changes.** The target is worked out again only when the profile is saved. A weight logged later (REQ-419) updates the profile weight but does not recalculate the target.
- **Daily water target.** Every profile has a daily water target of 2,000 ml by default, stored as `profiles.daily_water_target_ml`. In this version it is not shown or editable on the profile.
- **Complete profile.** A profile is complete when all six fields are filled. Diet and allergies (REQ-407) do not count. After sign-in, a user with an incomplete profile goes to the Profile screen; otherwise to Today (REQ-404).
- **Returning.** Saved values and the calorie target are shown again when the user returns to the profile.

## Acceptance criteria
- The user can enter age, sex, height (cm), weight (kg), goal and fitness level, and save them.
- Saving with any of the six fields empty is refused, and the message names the missing field.
- Age outside 13 to 100, height outside 100 to 250 cm, or weight outside 30 to 300 kg is refused, and the message names the field and its range.
- Only metric units are accepted and shown; there is no unit choice.
- On save, the daily calorie target is computed with the formula above and stored in `profiles.daily_calorie_target`. Example: female, 32 years, 163 cm, 68.4 kg, lose weight gives 1,934.45 − 500 = 1,434.45 kcal.
- After saving, the profile shows the daily calorie target.
- Saving again with changed values recomputes the target.
- Logging a new weight (REQ-419) changes the profile weight but not the stored target.
- A new profile has a daily water target of 2,000 ml, which is not shown on the profile.
- A profile with all six fields filled counts as complete; diet and allergies are not needed for it.
- Saved values are shown again when the user returns to the profile.

## Order
Order: 3 of 24
Depends on: User can sign up and sign in (REQ-404)
Goal served: G1

## Resolved questions
- **Units:** metric only (cm, kg); no imperial entry and no conversion.
- **Fitness level:** on the profile; beginner, intermediate or advanced; required.
- **Allowed ranges:** age 13–100, height 100–250 cm, weight 30–300 kg; values outside are refused with a clear message.
- **Sex:** asked on the profile, female or male, required (calorie formula input).
- **Daily calorie target:** owned by REQ-406; Mifflin-St Jeor × 1.4, −500 lose, +300 gain, unchanged for maintain; computed on save, shown after saving, stored as `profiles.daily_calorie_target`; REQ-418 only reads it.
- **Daily water target:** 2,000 ml default in `profiles.daily_water_target_ml`; not shown or editable on the profile in this version.
- **Complete profile:** all six fields filled; diet and allergies do not count.
- **Weight logged later:** updates the profile weight, does not recalculate the target; only saving the profile does.

## Source documents
- docs/project/source/01-project-brief.md (feature A.3)
- docs/project/intent.md
- docs/project/db_design.md (profiles)
- docs/mock/apps/coach/gaps/onboarding-ai-plan.md (gaps 6 to 9, answered here)
