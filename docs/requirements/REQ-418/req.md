# User sees daily calories and macros against target

Requirement REQ-418 · Feature FEAT-1381 · Decision DEC-453

## Purpose
As a user, I can see my calorie and macro totals for the day against my target.

Daily calories must always be correct (G3).

## Behaviour
The user sees the day's totals of calories, protein, carbs and fat against their target.

## Acceptance criteria
- The day's calorie, protein, carb and fat totals equal the sum of the meals logged that day.
- The totals are shown against the user's target.
- Adding or removing a logged meal updates the totals.

## Order
Order: 15 of 24
Depends on: User can set profile and fitness goal; User can log a meal
Goal served: G3

## Source documents
- docs/project/source/01-project-brief.md (feature C.12)
- docs/project/intent.md

## Open questions
- How is the daily calorie target computed, and are there macro targets?
- Can logged meals be edited or deleted?
