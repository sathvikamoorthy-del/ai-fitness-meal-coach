# User can set profile and fitness goal

Requirement REQ-406 · Feature FEAT-1369 · Decision DEC-441

## Purpose
As a user, I can enter my age, height, weight and goal (lose, gain or maintain weight).

The AI plans and calorie targets are built from the profile and goal (G1).

## Behaviour
The user enters age, height, weight and a goal: lose, gain or maintain weight. The values are saved and shown again when the user returns.

## Acceptance criteria
- The user can enter age, height and weight.
- The user can choose a goal: lose, gain or maintain weight.
- Saved values are shown again when the user returns to the profile.

## Order
Order: 3 of 24
Depends on: User can sign up and sign in
Goal served: G1

## Source documents
- docs/project/source/01-project-brief.md (feature A.3)
- docs/project/intent.md

## Open questions
- Units for height and weight (cm/in, kg/lb) are not stated.
- The AI workout plan needs a "fitness level"; should the profile ask for it, and with what values?
- Allowed ranges for age, height and weight are not stated.
