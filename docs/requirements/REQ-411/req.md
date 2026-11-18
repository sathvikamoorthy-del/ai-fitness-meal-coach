# User can log a workout session

Requirement REQ-411 · Feature FEAT-1374 · Decision DEC-446

## Purpose
As a user, I can record what I did in a workout session.

Fast logging is a core goal (G2).

## Behaviour
The user records the exercises done in a session, and the session is saved with its date.

## Acceptance criteria
- The user can record exercises done in a session.
- The saved session appears with its date.
- Logging a session takes less than 30 seconds.

## Order
Order: 8 of 24
Depends on: User can browse and search exercises
Goal served: G2

## Source documents
- docs/project/source/01-project-brief.md (feature B.7)
- docs/project/intent.md

## Open questions
- What is recorded per exercise (sets, reps, weight)?
- How is the 30-second target measured (from which screen, how many exercises)?
