# User can sign out and sessions expire

Requirement REQ-405 · Feature FEAT-1368 · Decision DEC-440

## Purpose
As a user, I can sign out, and my session ends after a set time.

Keeps the account safe when the user leaves (G1).

## Behaviour
- **Session length.** Signing in starts a session that lasts 7 days. The time is fixed: it runs from sign-in, and using the app does not extend it. The expiry time is stored on the session.
- **Sign out.** A signed-in user can sign out from the app header. Sign out ends the session at once and sends the user to the sign-in screen. The old session no longer works after that, even before its 7 days are over.
- **Expired session.** When a session has passed its expiry time, any request with it is refused. The user is sent to the sign-in screen with the message "Session expired, please sign in again".

## Acceptance criteria
- A session created at sign-in expires exactly 7 days after sign-in.
- Using the app during the 7 days does not change the expiry time.
- A signed-in user can sign out and is returned to the sign-in screen.
- After signing out, a request with the old session is refused, even within its 7 days, and signed-in pages are not reachable without signing in again.
- After the 7 days, any request with the session is refused, and the user is sent to the sign-in screen with the message "Session expired, please sign in again".
- After signing in again, the user gets a new 7-day session.

## Order
Order: 2 of 24
Depends on: User can sign up and sign in (REQ-404)
Goal served: G1

## Resolved questions
- **Session length:** 7 days, fixed from sign-in; using the app does not extend it. Stored as the expiry time on the session.
- **Expired session:** any request is refused and the user is sent to the sign-in screen with "Session expired, please sign in again".
- **Sign out:** ends the session at once and returns the user to the sign-in screen; the old session stops working immediately.

## Source documents
- docs/project/source/01-project-brief.md (feature A.2)
- docs/project/intent.md
- docs/project/db_design.md (sessions.expires_at)
