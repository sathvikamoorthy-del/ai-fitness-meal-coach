# User can sign out and sessions expire

Requirement REQ-405 · Feature FEAT-1368 · Decision DEC-440

## Purpose
As a user, I can sign out, and my session ends after a set time.

Keeps the account safe when the user leaves (G1).

## Behaviour
A signed-in user signs out and is returned to the sign-in screen. A session ends on its own after a set time.

## Acceptance criteria
- A signed-in user can sign out and is returned to the sign-in screen.
- After signing out, signed-in pages are not reachable without signing in again.
- A session that has passed the set time ends and the user must sign in again.

## Order
Order: 2 of 24
Depends on: User can sign up and sign in
Goal served: G1

## Source documents
- docs/project/source/01-project-brief.md (feature A.2)
- docs/project/intent.md

## Open questions
- How long is the set session time?
