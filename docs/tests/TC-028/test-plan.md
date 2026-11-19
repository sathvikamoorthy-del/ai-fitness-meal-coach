# Test plan: Sign-out and fixed 7-day session expiry

Test case TC-028 · Requirement REQ-405 · Work item WI-046 · Feature FEAT-1368

## Scope
Checks every acceptance criterion of REQ-405, plus the failure and edge cases in WI-046 `impl.md`. Sign-up and sign-in themselves are covered by TC-027 (REQ-404).

## Setup
- **API tests:**
  - `apps/api/tests/auth/sessionCheck.test.ts` and `apps/api/tests/routes/auth.test.ts`.
  - Both use the in-memory database (`:memory:`) with migration `0001_db_design.sql`.
  - The test app has the `authenticate` and `sessionCheck` middleware.
  - `JWT_SECRET` is a test value of at least 32 characters.
- **Web tests:**
  - `apps/web/tests/state/authStore.test.ts`, `tests/app/authFetch.test.ts`, `tests/features/auth/SignedInLayout.test.tsx` and `tests/features/auth/SignInPage.test.tsx`.
  - The API is mocked.
  - S14 uses Jest fake timers, which also move `Date.now`.
- **Manual check (S17):** the API running against the project's Turso database (`DATABASE_URL` `libsql://...`), with an existing account.

## Scenarios

### Session length (API)
| # | Steps | Expected |
|---|---|---|
| S1 | Sign in and read the new `sessions` row and the token | `expires_at` = sign-in time + 7 days (ISO-8601 UTC), and the token `exp` equals `expires_at`. |
| S2 | Create a session, make 3 authenticated requests with its token, then read `expires_at` | Every request returns 200, and `expires_at` is exactly the value it had at creation. |
| S3 | Sign in, wait, sign in again as the same user, then read the first session's `expires_at` | It is unchanged. Other activity of the same user does not extend it. |

### Sign-out (API)
| # | Steps | Expected |
|---|---|---|
| S4 | Sign in, then `POST /auth/signout` with `Authorization: Bearer <token>` | 204 with no body. The `sessions` row with that `sid` is deleted. |
| S5 | After S4, send `POST /auth/signout` again with the same token | 401 `{ error: "session-ended" }`. The old session is refused even though its 7 days are not over. |
| S6 | Send `POST /auth/signout` with no `Authorization` header | 401 `{ error: "unauthorized" }`. |
| S7 | Sign in twice as the same user (tokens A and B), then sign out with A | 204 for A. B's session row still exists, and sign-out with B also returns 204. |

### Session check (API)
| # | Steps | Expected |
|---|---|---|
| S8 | Make a request with no token to a route that does not need a user, then to one that does | 200 for the first. 401 `unauthorized` for the second (`requireAuth`). |
| S9 | Make a request with a valid token whose session row exists and has not expired | 200, and the route sees the session id. |
| S10 | Make a request with a still-valid token whose row has `expires_at` in the past | 401 `{ error: "session-expired" }`. |
| S11 | Make a request with a token whose `sid` belongs to another user's session | 401 `{ error: "session-ended" }`. |
| S12 | Make a request with a correctly signed token that has no `sid` | 401 `{ error: "unauthorized" }`. |
| S13 | Insert an expired session row for a user, then sign that user in | The expired row is deleted, and a new row with `expires_at` >= sign-in + 7 days is created. |

### Web
| # | Steps | Expected |
|---|---|---|
| S14 | Signed in on `/today` with a token that expires in 60 seconds, advance time by 61 seconds | The page leaves `/today` for the sign-in screen, which shows "Session expired, please sign in again.". The stored token is cleared. |
| S15 | Open `/today` or `/profile` with a token whose `exp` is already past | The sign-in screen with "Session expired, please sign in again.". The token is cleared and the notice is `session-expired`. |
| S16a | Signed in on `/today`: the header shows "AI Fitness & Meal Coach" and **Sign out**. Click Sign out with the API answering 204 | `POST /api/auth/signout` is sent with the Bearer token. The user lands on the sign-in screen with no "Session expired" notice, the token is cleared, and `/today` content is no longer shown. |
| S16b | Same as S16a, but the sign-out request fails (offline) | The user still lands on the sign-in screen and the token is cleared. |
| S16c | Signed out, open `/today` | Redirected to the sign-in screen. Signed-in pages are not reachable. |
| S16d | `authFetch` gets a 401 `session-expired`, or a 401 while the token's `exp` has passed | The token is cleared and the notice is set. |
| S16e | `authFetch` gets a 401 `session-ended` | The token is cleared with no notice. |
| S16f | `authFetch` gets a 500 | The token is kept. |
| S16g | `authFetch` gets a 401 after a newer sign-in has replaced the token | The newer token is kept. |
| S16h | With the notice set, sign in successfully | The notice is cleared, and the user reaches Today or Profile. |

### End to end against Turso (manual)
| # | Steps | Expected |
|---|---|---|
| S17 | Start the API against Turso. Sign in with an existing account (token T), `POST /auth/signout` with T, then `POST /auth/signout` with T again. Sign in again (token T2) and sign out with T2 | First sign-out: 204. Second: 401 `session-ended`. Sign-in again: 200 with a new token. Sign-out with T2: 204. |

## Pass criteria
All scenarios give the expected result. The automated API and web tests cover S1–S16h, and S17 is run by hand against Turso.

## Acceptance criteria coverage
| REQ-405 acceptance criterion | Scenarios |
|---|---|
| A session expires exactly 7 days after sign-in | S1, S13 |
| Using the app does not change the expiry time | S2, S3 |
| A signed-in user can sign out and is returned to the sign-in screen | S4, S16a, S16b |
| After sign-out the old session is refused, even within 7 days, and signed-in pages are unreachable | S5, S11, S16c, S16e, S17 |
| After 7 days requests are refused and the user sees "Session expired, please sign in again" | S10, S14, S15, S16d |
| Signing in again gives a new 7-day session | S13, S16h, S17 |
