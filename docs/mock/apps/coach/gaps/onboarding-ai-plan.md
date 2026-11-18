# Gaps: Sign up to first AI plans (onboarding-ai-plan)

Sources: docs/project/source/01-project-brief.md, docs/project/intent.md, docs/requirements/REQ-404, 405, 406, 407, 409, 413, docs/project/db_design.md.

## Spec gaps

1. **Screen codes.** The spec has no screen codes. The mock uses S01–S23 (mock-data/spec/screens.json).
2. **Password rules** (REQ-404). The spec says email and password but gives no length or character rules. The mock shows a "Not defined" alert on the password field.
3. **Email verification and password reset** (REQ-404). Neither is defined. "Forgot password?" shows a "Not defined" alert.
4. **What happens right after sign-up** (REQ-404). "Creates an account, then signs in": it does not say whether sign-up signs the user in or returns to sign-in. The mock shows "Account created" on S01, and the user then signs in.
5. **Landing after the first sign-in.** Not defined. The mock goes to Profile (S02). This is an assumption.
6. **Profile fields beyond the requirement** (REQ-406 vs DB design). REQ-406 lists age, height, weight and goal. The DB design adds sex (an input to the calorie formula) and fitness level (REQ-406 open question, answered in the DB design). The mock shows both. REQ-406 should be updated to match.
7. **Units** (REQ-406 open question). Settled only in the DB design (metric: cm, kg, ml). The mock uses metric. Converting other units "in the UI" is not specified.
8. **Allowed ranges** for age, height and weight (REQ-406). Not defined. "Not defined" alert on Age.
9. **Daily calorie target.** The formula is in the DB design only (Mifflin-St Jeor × 1.4, −500 to lose, +300 to gain, set on save). No requirement says it is shown on the profile. The mock shows it after saving: 1,434 kcal for the sample values.
10. **Allergies: free text or a list** (REQ-407). Not defined. "Not defined" alert on the allergy input and the Add button.
11. **Where diet and allergies live** (REQ-407). "Saved with the profile", but REQ-407 has its own mock. The mock uses a separate screen (S03) opened from Profile.
12. **AI provider or model** (REQ-409, REQ-413). Not defined. "Which AI?" link shows a "Not defined" alert.
13. **Regenerate or edit an AI plan** (REQ-409, and not mentioned for REQ-413). Not defined. "Regenerate" shows a "Not defined" alert on both plan screens.
14. **Plan day numbering.** The plan shows Day 1–7 (DB: day_number). How Day 1 maps to a weekday or start date is not defined.
15. **Meal plan and calorie target** (REQ-413). It is not defined whether the plan must meet the daily calorie target, or how many calories each planned meal has (the DB has no calories on planned meals). The "Calories of this plan?" link shows a "Not defined" alert.
16. **Meal plan period.** REQ-413 asks "day or week, who chooses"; the DB design says the user chooses when asking. The mock shows a Day / Week selector. Which meals a week plan has for each day is not shown.
17. **Snacks in the meal plan.** The brief lists snacks under meal logging. Whether the AI meal plan includes a snack is not stated. The sample plan includes one.

## Walkthrough notes (not spec gaps)

- The user moves from Profile to Diet with a "Diet and allergies" button, and to the plans with the bottom tabs. No automatic redirect is invented.
- "Generate" fills the plan at once. The real AI call takes time; no loading or error state is shown.
- Exercise names, meals and the sample person are invented sample data.
- The mock is a web app (platform: desktop). It uses the template's narrow shell and bottom tab bar; a desktop sidebar was not asked for.
