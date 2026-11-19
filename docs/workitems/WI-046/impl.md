# Sign-out and server-side session expiry

Applications: api (primary), web

Work item WI-046 · Requirement REQ-405 · Decision DEC-440 · Feature FEAT-1368
Builds on: WI-045 (REQ-404), which creates a `sessions` row at sign-in with `expires_at` = sign-in + 7 days and issues a token whose `sid` is that row and whose `exp` equals `expires_at`.

## Approach

### api (APP-039, apps/api)

**Session check middleware:** a new file, `src/auth/sessionCheck.ts`, exports `sessionCheck`. It is registered in `src/glue/middleware.ts` after the knm markers, so it runs after the module-owned `authenticate`:
1. If `req.auth` is not set (anonymous), call `next()`. Routes that need a user still add `requireAuth`.
2. Read `sid` from `req.auth.claims`. If there is none, answer 401 `{ error: "unauthorized" }`. Every token WI-045 issues has a `sid`.
3. Look up the `sessions` row by `id = sid` and `user_id = req.auth.userId`.
   - No row (signed out, or never existed): 401 `{ error: "session-ended" }`.
   - `expires_at` <= now: 401 `{ error: "session-expired" }`.
   - Otherwise set `req.sessionId = sid` and call `next()`.
4. Expiry is never extended. No code path writes `expires_at` after sign-in.

The token's `exp` equals `expires_at`, so after 7 days `authenticate` (`verifyToken`) already refuses the token with 401 `{ error: "unauthorized" }` before `sessionCheck` runs. The `expires_at` check in `sessionCheck` is a second guard that does not depend on the token, for example if the clock or the token format changes. Either way the request is refused.

**`POST /auth/signout`:** added to `src/routes/auth.ts`, guarded by `requireAuth`. The session check has already run in the middleware chain.
- It deletes the `sessions` row with `id = req.sessionId` and returns `204`.
- Only the current session ends. Other sessions of the same user (other browsers) are not touched; REQ-405 asks for nothing more.
- A second sign-out with the same token gets 401 `session-ended`, because the row is gone.

**Housekeeping at sign-in:** in `signIn`, after a successful password check, delete that user's `sessions` rows whose `expires_at` is in the past. This needs no scheduled job and no new table. The new session is still inserted as today, so signing in again gives a fresh 7-day session.

`authMiddleware.ts` and `jwt.ts` are module-owned with contract tests and are not changed.

### web (APP-038, apps/web)

**Auth store** (`src/state/authStore.ts`):
- Add `notice: "session-expired" | null`, persisted with the token so it survives the redirect and a reload.
- `expireSession()` clears the token and sets `notice = "session-expired"`.
- `clearToken()` clears the token and leaves `notice` as it is.
- A successful sign-in (`setToken`) sets `notice = null`.

**Authenticated fetch:** a new file, `src/app/authFetch.ts`, exports `authFetch(url, init)`. It adds `Authorization: Bearer <token>` and handles a 401:
- If the token's `exp` has passed (`isTokenExpired`) or the body is `{ error: "session-expired" }`, it calls `expireSession()`.
- Otherwise it calls `clearToken()`.

Sign-out uses `authFetch`, and later requirements use it for every signed-in API call, so "any request with the session is refused, and the user is sent to sign-in" holds wherever the app calls the API.

**Sign out:** `signOut()` in the auth store calls `authFetch('/api/auth/signout', { method: 'POST' })`, then always calls `clearToken()` and navigates to `/signin`, even if the request fails (offline or 401). The user is signed out locally in every case, and the server row is gone whenever the request reached it.

**Signed-in header:** a new file, `src/features/auth/SignedInLayout.tsx`. A Chakra header with "AI Fitness & Meal Coach" on the left and a **Sign out** button on the right, as in mock.md, with the page below it. In `src/app/router.tsx`, the `/profile` and `/today` routes become `<RequireAuth><SignedInLayout>…</SignedInLayout></RequireAuth>`.

**`RequireAuth`** (`src/features/auth/RequireAuth.tsx`):
- An expired token now calls `expireSession()`, which sets the notice, instead of `clearToken()`.
- It also sets a timer for the token's `exp`. If the user is still on a signed-in page when the 7 days end, the timer calls `expireSession()` and the guard redirects to `/signin`.
- The delay is at most 7 days, under the 24.8-day `setTimeout` limit. The timer is cleared on unmount.

**Sign-in screen** (`SignInPage.tsx`): when `notice === "session-expired"`, show an info Alert, "Session expired, please sign in again", above the form, as in mock.md. A successful sign-in clears it.

## Behaviour against the acceptance criteria
| REQ-405 acceptance criterion | How it is met |
|---|---|
| A session expires exactly 7 days after sign-in | Already done by WI-045: `expires_at` = sign-in + `SESSION_LENGTH_MS`, and the token's `exp` is the same moment. Covered by tests here. |
| Using the app does not change the expiry | No code updates `expires_at`. A test signs in, makes requests, and checks that `expires_at` is unchanged. |
| Sign out returns the user to the sign-in screen | `signOut()` clears the token and navigates to `/signin`. |
| After sign-out, the old session is refused and signed-in pages are unreachable | The row is deleted, so `sessionCheck` answers 401 `session-ended` for the old token. With no token, `RequireAuth` redirects to `/signin`. |
| After 7 days, requests are refused and the user sees "Session expired, please sign in again" | The API answers 401 (the token `exp`, plus `expires_at` in `sessionCheck`). The web calls `expireSession()` (from `RequireAuth`, its timer, or `authFetch`), then the sign-in screen shows the notice. |
| Signing in again gives a new 7-day session | WI-045 sign-in inserts a new row and token. Expired rows are removed at that moment. |

## Failure and edge cases
| Case | Response | What the user sees |
|---|---|---|
| Sign-out with no token | 401 `unauthorized` from `requireAuth` | The web never sends it; `signOut()` clears locally anyway. |
| Sign-out twice with the same token (two tabs) | The second gets 401 `session-ended` | That tab is already signed out locally and goes to sign-in, with no "expired" notice. |
| Request with a signed-out token that is still within 7 days | 401 `session-ended` | `authFetch` clears the token and goes to sign-in, with no "expired" notice, because the session was ended, not expired. |
| Request after the 7 days | 401 `unauthorized` (token `exp`) or `session-expired` | Sign-in screen with "Session expired, please sign in again". |
| Token signed with the right secret but no `sid` | 401 `unauthorized` | Treated as signed out. |
| A database error in `sessionCheck` | 500 from the app error handler | Request fails, the token is kept, and the generic error message shows. A database outage does not sign the user out. |
| The browser clock is wrong | The server decides | `isTokenExpired` is only a hint; the API's 401 is the authority. |

## Existing code reused
- `apps/api/src/auth/sessionToken.ts`: `SESSION_LENGTH_MS` and the `sid` and `exp` claims.
- `apps/api/src/auth/authMiddleware.ts`: `authenticate` and `requireAuth`, unchanged.
- `apps/api/src/db/models/sessions.ts`, from the existing migration `0001_db_design.sql`. There is no schema change: `sessions.expires_at` is already indexed.
- `apps/api/src/http/app.ts`: `wrapAsync`, the error handler, and `req.app.get('orm')`.
- `apps/api/src/testing/testUtils.ts`: the in-memory app and database for the tests.
- `apps/web/src/state/createStore.ts` (persisted store) and `isTokenExpired` in `authStore.ts`.

## Areas and files likely affected
- apps/api/src/auth/sessionCheck.ts (new).
- apps/api/src/glue/middleware.ts: registers `sessionCheck` after the knm markers.
- apps/api/src/routes/auth.ts: adds `POST /auth/signout`, and deletes expired rows at sign-in.
- apps/api/tests/auth/sessionCheck.test.ts (new):
  - anonymous request passes
  - valid session passes
  - deleted row: `session-ended`
  - `expires_at` in the past with a still-valid token: `session-expired`
  - no `sid`: `unauthorized`
- apps/api/tests/routes/auth.test.ts:
  - sign-out returns 204 and deletes the row
  - the old token then gets 401
  - a second sign-out gets 401
  - another session of the same user still works
  - requests do not change `expires_at`
  - sign-in removes expired rows and creates a new 7-day row
- apps/web/src/state/authStore.ts: `notice`, `expireSession`, `signOut`.
- apps/web/src/app/authFetch.ts (new).
- apps/web/src/features/auth/SignedInLayout.tsx (new).
- apps/web/src/features/auth/RequireAuth.tsx: `expireSession` and the expiry timer.
- apps/web/src/features/auth/SignInPage.tsx: the expired notice.
- apps/web/src/app/router.tsx: wraps `/profile` and `/today` in `SignedInLayout`.
- apps/web tests:
  - the header shows Sign out
  - Sign out calls the API, clears the token and lands on `/signin`, even when the API call fails
  - an expired token, a timer firing, and a 401 `session-expired` each show the notice
  - a 401 `session-ended` shows no notice
  - a successful sign-in clears the notice

## Risks
- **Two layers decide expiry:** the token `exp` and `expires_at`. They are set from the same value at sign-in, and either one refuses the request, so they cannot let an expired session through.
- **One database read per authenticated request**, added by `sessionCheck`. It is a primary-key lookup on `sessions` (Turso), so it is acceptable at this scale.
- **Other sessions stay live:** sign-out ends only the current session. Sessions in other browsers of the same user run until their own 7 days end. REQ-405 does not ask for "sign out everywhere".
- **Token in localStorage** (as decided in WI-045): unchanged. Sign-out now really revokes the token server-side, which closes the WI-045 risk "signed-out tokens still work until REQ-405".

## Assumptions
- **No message after a plain sign-out:** "Session expired, please sign in again" is shown only for expiry, as REQ-405 states. A sign-out, or a session ended in another tab, goes to sign-in without a message.
- **Expired rows are removed at the user's next sign-in, not by a scheduled job.** Rows of users who never sign in again stay in the table. They cannot be used, because `expires_at` and the token `exp` both refuse them.
