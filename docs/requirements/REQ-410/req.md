# User can build a workout plan

Requirement REQ-410 · Feature FEAT-1373 · Decision DEC-445

## Purpose
As a user, I can build my own workout plan with days, exercises, sets and reps.

It lets users plan their own training, next to the AI weekly plan (REQ-409). This is brief feature B.6, included at the product owner's request.

## Behaviour
- **Workouts screen.** A **Workouts** link in the signed-in header opens `/workouts`, for signed-in users only.
  - It lists the user's workout plans, newest first, with the active plan marked "Active".
  - Each plan shows its source and creation date. A manual plan shows "My plan · 24 Nov 2026"; an AI plan (REQ-409, later) shows "AI plan · 24 Nov 2026".
  - Plans have no name field.
  - A **Build my own plan** button starts a new manual plan.
  - With no plans yet, the screen says "No workout plans yet." above the button.
- **Plan shape.** Every plan has exactly seven days, Day 1 to Day 7. Days are numbered, not weekdays. A day with no exercises is a rest day.
- **Building a day.** For each day the user adds exercises from the exercise library (REQ-408), each with sets and reps, and can remove them.
  - **Sets:** a whole number from 1 to 10.
  - **Reps:** a whole number from 1 to 100.
  - **Duplicates:** the same exercise at most once per day. It may appear on other days.
  - **Limit:** at most 15 exercises per day.
  - **Order:** exercises keep the order in which the user added them.
- **Saving.**
  - A plan needs at least one exercise across its seven days. Otherwise saving is refused with "Add at least one exercise to the plan.".
  - Any rule broken above is refused with a message naming the day and the problem, and nothing is saved.
  - A newly saved plan becomes the active plan, and the previously active plan becomes inactive. A user has at most one active plan.
- **Viewing.** Opening a plan from the list shows Day 1 to Day 7 with each day's exercises, sets and reps, or "Rest day".
- **Making a plan active.** From the list, the user can make any of their plans active (manual or AI). The previously active one becomes inactive.
- **Editing.** The user can edit a saved manual plan with the same rules. Saving the edit keeps the plan's active or inactive status.
- **Deleting.** The user can delete a manual plan after confirming "Delete this plan? This cannot be undone." (Delete / Cancel). Deleting the active plan leaves the user with no active plan until they make another one active.
- **AI plans.** Editing and deleting AI plans is not part of this requirement; REQ-409 decides that.

## Acceptance criteria
- A signed-in user can open Workouts from the header link. A signed-out visitor is sent to sign-in.
- The list shows the user's plans newest first, as "My plan · <date>" or "AI plan · <date>", with the active one marked "Active". With no plans it says "No workout plans yet.".
- Build my own plan shows Day 1 to Day 7. The user can add exercises from the library to any day, with sets and reps, and remove them.
- Sets outside 1–10, reps outside 1–100 or not whole numbers, the same exercise twice in one day, or more than 15 exercises in a day are refused with a message naming the day.
- Saving a plan with no exercises is refused with "Add at least one exercise to the plan.".
- A saved plan is shown again with its seven days, exercises (in the order added), sets and reps; empty days show "Rest day".
- A newly saved plan becomes active, and the previous active plan does not stay active.
- The user can make any of their plans active from the list, and only one plan is active at a time.
- The user can edit a saved manual plan, and its active or inactive status is unchanged by the edit.
- The user can delete a manual plan after confirming. Deleting the active plan leaves no active plan.

## Order
Order: 7 of 24
Depends on: User can browse and search exercises (REQ-408)
Goal served: none of the ranked goals; included from brief feature B.6 at the product owner's request.

## Resolved questions
- **More than one plan, and manual vs AI** (original open questions): answered in the final DB design (`workout_plans`). A user can have many plans, one active at a time, and `plan_sources` (`manual` / `ai`) says which kind a plan is.
- **Days:** always seven, Day 1–Day 7, numbered not weekdays. An empty day is a rest day (product owner, 2026-11-24).
- **Active plan:** a newly saved plan becomes active, and the user can make any plan active from the list (product owner, 2026-11-24).
- **Edit and delete:** manual plans can be edited and deleted. Deleting the active plan leaves no active plan (product owner, 2026-11-24).
- **Rules:** sets 1–10 and reps 1–100 (whole numbers), the same exercise at most once per day, at most 15 exercises per day, kept in the order added (product owner, 2026-11-24).
- **Placement:** a Workouts screen at `/workouts`, linked from the signed-in header. The AI plan (REQ-409) joins this list later (product owner, 2026-11-24).
- **Plan label:** source and creation date, for example "My plan · 24 Nov 2026". There is no name field and no DB change (product owner, 2026-11-24).
- **Empty plan:** saving needs at least one exercise (product owner, 2026-11-24).
- **Delete:** asks "Delete this plan? This cannot be undone." first (product owner, 2026-11-24).

## Source documents
- docs/project/source/01-project-brief.md (feature B.6)
- docs/project/intent.md
- docs/project/db_design.md and db_design_tables.csv (workout_plans, workout_plan_days, workout_plan_exercises, plan_sources)
- docs/requirements/REQ-408 (exercise library)
- docs/mock/apps/coach (Workouts screen, "Build my own plan")
