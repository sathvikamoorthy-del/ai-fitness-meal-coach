# Gaps: A day of logging (daily-logging)

Sources: docs/project/source/01-project-brief.md, docs/project/intent.md, docs/requirements/REQ-411, 417, 418, 419, 420, 425, docs/project/db_design.md.

## Spec gaps

1. **Screen codes.** The spec has no screen codes. The mock uses S01–S23 (mock-data/spec/screens.json).
2. **Ticking vs logging** (REQ-425 open question). Settled only in the DB design (checklist_ticks: "no log created"). The mock says that ticking only marks an item done. REQ-425 should be updated to match.
3. **Reminders or notifications** (REQ-425). Not defined. The mock shows a list only.
4. **Plan day vs today's date.** How a plan day (Day 1 to 7) maps to today's date is not defined. "which day?" on the Today workout item shows a "Not defined" alert. The mock shows Day 1.
5. **Where logging starts.** No requirement says where "Log a meal", "Log a workout", "Add water" and "Add weight" are opened from. The mock puts them on Today (S06). This is an assumption.
6. **Meal amount** (REQ-417 open question). Settled in the DB design only (grams). The mock uses grams.
7. **30-second target** (REQ-411, REQ-417, G2). How it is measured is not defined. The Log meal screen shows a "Not defined" alert.
8. **Macro targets** (REQ-418). Only a daily calorie target exists. "target?" under protein, carbs and fat shows a "Not defined" alert.
9. **Edit or delete a logged meal** (REQ-418). Not defined, but REQ-418 says removing a meal updates the totals. "Edit" in the logged-meals table shows a "Not defined" alert.
10. **Per-exercise fields** (REQ-411 open question). Settled in the DB design (sets, reps, weight in kg). Time-based exercises (for example a 30-minute walk in the plan) have no field for duration.
11. **Pre-filling a session from the plan.** Not defined. "Fill from today's plan?" shows a "Not defined" alert.
12. **Water unit and target** (REQ-420). Settled in the DB design only (ml, 2,000 ml default target). How the user changes the target is not defined.
13. **Weight updates the profile** (REQ-419 open question). The DB design copies the latest weight to the profile. Whether that recomputes the daily calorie target (set on profile save) is not defined. "Calorie target?" on the Weight screen shows a "Not defined" alert.
14. **Weight unit** (REQ-419). Settled in the DB design only (kg).

## Walkthrough notes (not spec gaps)

- After each save the user returns to Today using the bottom tab. Where a save lands in the real app is not decided, so no redirect is invented.
- The day starts with 750 ml of water already logged, so the total visibly adds up (750 + 250 = 1,000 ml).
- Nutrition values (oats 379 kcal/100 g, banana 89 kcal/100 g) are sample values, not the project's food seed file.
- Only "Tick" on Breakfast moves the tour on. The other Tick buttons show a toast.
