# User can sign up and sign in

Requirement REQ-404 · Feature FEAT-1367 · Decision DEC-439

## Purpose
As a user, I can create an account and sign in with email and password.

Every other feature needs a signed-in user; this is also the first slice running deployed on Express and Turso (G1, G4).

## Behaviour
A visitor creates an account with email and password, then signs in with the same email and password. The app runs on Express with a Turso database.

## Acceptance criteria
- A visitor can create an account with an email and a password.
- A user can sign in with that email and password and reaches the signed-in area.
- Sign-in with a wrong password is refused.
- The app runs deployed on Express with Turso, and an account created there is still there after a restart.

## Order
Order: 1 of 24
Depends on: none
Goal served: G1, G4

## Source documents
- docs/project/source/01-project-brief.md (feature A.1)
- docs/project/intent.md

## Open questions
- Password rules (length, characters) are not stated.
- Is email verification or password reset needed?
- Where is the app deployed (host)?
