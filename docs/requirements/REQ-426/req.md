# User can set goals and see streaks

Requirement REQ-426 · Feature FEAT-1389 · Decision DEC-461

## Purpose
As a user, I can set goals and see streaks of logged days.

Keeps the user motivated to log (brief feature 22).

## Behaviour
The user sets goals and sees streaks of logged days.

## Acceptance criteria
- The user can set a goal.
- The user sees the current streak of consecutive logged days.
- A day with no log breaks the streak.

## Order
Order: 23 of 24
Depends on: User can log a workout session; User can log a meal
Goal served: brief only

## Source documents
- docs/project/source/01-project-brief.md (feature E.22)
- docs/project/intent.md

## Open questions
- What goals can be set here, and how do they differ from the profile goal?
- What counts as a logged day (any log, or workout and meals)?
