# User can sign up and sign in

Requirement REQ-404 · Feature FEAT-1367 · Decision DEC-439

## Purpose
As a user, I can create an account and sign in with email and password.

Every other feature needs a signed-in user. This is also the first slice that runs deployed on Express and Turso (G1, G4).

## Behaviour
- **Sign up.** A visitor enters an email and a password and clicks Sign up. The password must be at least 8 characters; there are no other password rules. The password is stored only as a bcrypt hash, never as plain text. After a successful sign-up the app shows "Account created" and keeps the visitor on the sign-in screen. Sign-up does not sign the user in.
- **Sign in.** The user signs in with the same email and password. A wrong password is refused.
- **Landing after sign-in.** If the user's profile is not yet complete (profile and goal, REQ-406), the user goes to the Profile screen. If the profile is already complete, the user goes to Today.
- **Out of scope in this version.** No email verification and no password reset. The sign-in screen has no "Forgot password?" link.
- **Storage and deployment.** Accounts are stored in the Turso database, not in a local file or in memory, so they survive a restart of the app. The app must be deployable with Express and Turso. No hosting provider is chosen in this requirement.

## Acceptance criteria
- A visitor can create an account with an email and a password of at least 8 characters.
- A password shorter than 8 characters is refused at sign-up.
- The stored password is a bcrypt hash; the plain password is not stored anywhere.
- After sign-up the app shows "Account created" on the sign-in screen, and the user is not signed in.
- A user can sign in with that email and password.
- After sign-in, a user whose profile is not complete reaches the Profile screen, and a user whose profile is complete reaches Today.
- Sign-in with a wrong password is refused.
- The sign-in screen has no email verification step and no password reset link.
- Accounts are stored in the Turso database, so an account created on the deployed app is still there after the app restarts.

## Order
Order: 1 of 24
Depends on: none
Goal served: G1, G4

## Resolved questions
- **Password rules:** at least 8 characters, no other rules. Stored as a bcrypt hash.
- **Email verification or password reset:** neither in this version. The "Forgot password?" link is removed from the mock.
- **Deployment host:** not chosen yet, and not named in this requirement. The restart criterion is met because accounts are stored in the Turso database.
- **After sign-up:** show "Account created" and stay on the sign-in screen; no automatic sign-in.
- **After the first sign-in:** go to the Profile screen; if the profile is already complete, go to Today.

## Source documents
- docs/project/source/01-project-brief.md (feature A.1)
- docs/project/intent.md
- docs/mock/apps/coach/gaps/onboarding-ai-plan.md (gaps 2 to 5, answered here)
