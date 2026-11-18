# User can export data as CSV

Requirement REQ-427 · Feature FEAT-1390 · Decision DEC-462

## Purpose
As a user, I can download my logs as a CSV file.

Gives the user their own data (brief feature 24).

## Behaviour
The user downloads their logs as a CSV file.

## Acceptance criteria
- The user can download a CSV file of their logs.
- The file contains only the signed-in user's data.
- Each logged entry appears in the file.

## Order
Order: 24 of 24
Depends on: User can log a workout session; User can log a meal; User can log weight; User can log water intake; User can log body measurements
Goal served: brief only

## Source documents
- docs/project/source/01-project-brief.md (feature F.24)
- docs/project/intent.md

## Open questions
- Which logs are included, and in one file or several?
- Can the user choose a date range?
