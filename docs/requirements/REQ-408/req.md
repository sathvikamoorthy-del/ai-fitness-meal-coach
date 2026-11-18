# User can browse and search exercises

Requirement REQ-408 · Feature FEAT-1371 · Decision DEC-443

## Purpose
As a user, I can browse and search the exercise library.

Plans and workout logs pick exercises from this library (G2).

## Behaviour
The user browses a list of exercises and searches it by name.

## Acceptance criteria
- The user sees a list of exercises.
- Typing in search shows only exercises whose name matches.
- A search with no match shows an empty-result message.

## Order
Order: 5 of 24
Depends on: User can sign up and sign in
Goal served: G2

## Source documents
- docs/project/source/01-project-brief.md (feature B.5)
- docs/project/intent.md

## Open questions
- Where does the exercise data come from, and which fields does an exercise have (e.g. muscle group, equipment)?
