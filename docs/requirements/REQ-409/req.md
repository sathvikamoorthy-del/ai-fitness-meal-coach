# User gets an AI weekly workout plan

Requirement REQ-409 · Feature FEAT-1372 · Decision DEC-444

## Purpose
As a user, I can get a week of workouts proposed by the AI from my goal and fitness level.

Getting an AI plan is the top goal of the app (G1).

## Behaviour
The AI proposes a week of workouts from the user's goal and fitness level, using exercises from the library.

## Acceptance criteria
- A user with a saved profile and goal can ask for an AI weekly workout plan.
- The plan covers a week, with exercises for each workout day.
- Every exercise in the plan is one from the exercise library.
- The plan is saved and shown again when the user returns.

## Order
Order: 6 of 24
Depends on: User can set profile and fitness goal; User can browse and search exercises
Goal served: G1

## Source documents
- docs/project/source/01-project-brief.md (feature B.8)
- docs/project/intent.md

## Open questions
- Fitness level is not in the profile (see "User can set profile and fitness goal").
- Which AI provider or model is used?
- Can the user regenerate or edit the AI plan?
