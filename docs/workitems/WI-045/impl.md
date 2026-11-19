# Email/password sign-up and sign-in

Applications: api (primary), web

Work item WI-045 · Requirement REQ-404 · Decision DEC-439 · Feature FEAT-1367
Related: REQ-405 (sessions: 7-day length, sign-out, expiry), REQ-406 (profile and goal)

## Approach

### api (APP-039, apps/api)
- Add `bcryptjs` and `@types/bcryptjs`. `bcryptjs` is pure JS, so it needs no native build on any host. Cost factor: 10.
- Add a new route module, `src/routes/auth.ts`. Register it in `src/glue/routes.ts` next to `healthRoute`, outside the knm markers.

**`POST /api/auth/signup`** with body `{ email, password }`:
1. Validate the email (see "Failure cases") and normalise it to `trim().toLowerCase()`.
2. Refuse a password shorter than 8 characters. There are no other password rules.
3. Hash the password with `bcrypt.hash`. Insert `users { id: randomUUID(), email, password_hash }`. The plain password is never stored or logged.
4. Return `201 { ok: true }`. No token and no session are created, because sign-up does not sign the user in.

**`POST /api/auth/signin`** with body `{ email, password }`:
1. Validate and normalise the email the same way.
2. Look up the user by email and check the password with `bcrypt.compare`.
3. On success, insert `sessions { id: randomUUID(), user_id, expires_at }`.
   - `expires_at` is the sign-in time + 7 days, as an ISO-8601 UTC string (the table's format).
   - The 7 days are fixed from sign-in (REQ-405) and are not extended by activity.
4. Issue a token tied to that session:
   - `sub` = user id, `sid` = session id, `exp` = the session's `expires_at`, so the token and the session expire at the same moment.
5. Return `200 { token, profileComplete }`.

**Profile-complete rule:** one helper, `src/auth/profileStatus.ts`, exports `isProfileComplete(userId): Promise<boolean>`.
- It returns true only when a `profiles` row exists for the user and all six REQ-406 fields are non-null: `age`, `sex`, `height_cm`, `weight_kg`, `goal_type`, `fitness_level`.
- No row, or any of the six empty, returns false.
- `diet_type`, `daily_calorie_target` and `daily_water_target_ml` do not count.
- This is the only place the rule lives. The sign-in route and any later guard both call it.

**Session token:** a small helper, `src/auth/sessionToken.ts`, exports `signSessionToken({ userId, sessionId, expiresAt })`.
- It builds the HS256 JWT with `jose`, reusing `secretKey()` from `jwt.ts` so the secret rules stay in one place.
- It sets `sid` as a claim and `exp` to the absolute session expiry.
- `jwt.ts` itself is not changed, because it is module-owned with contract tests. Its `signToken` only takes a relative `expiresIn` and has no slot for a session id.

### web (APP-038, apps/web)
**Sign-in screen:** `src/features/auth/SignInPage.tsx`, built with Chakra UI as in mock.md.
- Email and Password fields, the hint "min. 8 characters", and Sign in and Sign up buttons.
- No "Forgot password?" link and no verification step.

**Sign up:** calls `POST /api/auth/signup`.
- On 201, show the "Account created" banner with "Sign in with the same email and password.". Clear the password field and stay on the screen, not signed in.
- On an error, show the matching inline message (see "Failure cases").

**Sign in:** calls `POST /api/auth/signin`.
- On 200, store the token in `localStorage` through a small zustand auth store, `src/state/authStore.ts`, built on `createStore.ts`.
- Then navigate to `/profile` if `profileComplete` is false, otherwise to `/today`.

**Routes:** registered in `src/app/router.tsx`.
- `/signin` is the default for signed-out users.
- Placeholder `/profile` and `/today` routes sit behind a guard that only checks a token is present. REQ-406 and later requirements fill in those screens.

**API base URL:** read from `src/app/config.ts`.

## Existing code reused
- **`apps/api/src/auth/jwt.ts`**:
  - `secretKey()` supplies the signing key for the session token, with the same JWT_SECRET rule (at least 32 characters, fails closed).
  - `verifyToken()` verifies the new tokens unchanged: HS256 only, `exp` enforced. It returns the full payload in `claims`, so `claims.sid` reaches route handlers without any change.
- **`apps/api/src/auth/authMiddleware.ts`**:
  - `authenticate` (already registered in the middleware glue) sets `req.auth` from the token.
  - `requireAuth` protects the authenticated routes that later requirements add.
  - No change in this item. Checking the session row (expired or signed out) is REQ-405 work.
- **`apps/api/src/db/client.ts`**:
  - `createDb()` connects to Turso through `DATABASE_URL` (`libsql://...`) and `DATABASE_AUTH_TOKEN`, and to `:memory:` in tests.
  - Accounts and sessions live in Turso, so they survive a restart.
- **`apps/api/src/db/orm.ts` and the generated models**:
  - `users.ts`, `sessions.ts` and `profiles.ts` are used as-is with Drizzle.
  - The tables already exist in migration `0001_db_design.sql`, so there is no new migration and no schema change.
- **`apps/api/src/testing/testUtils.ts`**: the in-memory app and database setup for the route tests.
- **`apps/web/src/state/createStore.ts`, `src/app/config.ts`, `src/styling/*`**: the auth store pattern, the API base URL and the Chakra theme.

## Failure cases
| Case | Where | Response | What the user sees |
|---|---|---|---|
| Password shorter than 8 characters | sign-up | 400 `{ error: "password-too-short" }`; nothing is inserted | "Password must be at least 8 characters." The web form also checks this before sending, but the API is the authority. |
| Wrong password for an existing email | sign-in | 401 `{ error: "invalid-credentials" }`; no session row | "Email or password is incorrect." |
| Unknown email | sign-in | 401 `{ error: "invalid-credentials" }` | The same message as a wrong password. A dummy `bcrypt.compare` runs as well, so response timing does not reveal whether the email exists. |
| Duplicate email, including the same address in different letter case (`Ann@x.com` vs `ann@x.com`) | sign-up | 409 `{ error: "email-taken" }` | "An account with this email already exists." Emails are lowercased before insert and lookup, and the `COLLATE NOCASE UNIQUE` column is the backstop. A UNIQUE constraint error from a concurrent insert is also mapped to 409, not 500. |
| Missing email, or an email that is not a string, empty after trimming, or badly formed (no single `@` with text on both sides and a dot in the domain), or longer than 254 characters | sign-up and sign-in | 400 `{ error: "invalid-email" }` | "Enter a valid email address." |
| Missing password, or a password that is not a string | sign-up and sign-in | 400 `{ error: "password-too-short" }` at sign-up, 400 `{ error: "invalid-credentials" }` at sign-in | The matching message above. |

## Edge cases
- **Email letter case and spaces:** `" Ann@X.com "` signs up as `ann@x.com`, and signing in with any casing or surrounding spaces finds the same account. SQLite NOCASE only folds ASCII letters, so lowercasing in the app is the main rule and the collation is the safety net.
- **Password characters:** the password is not trimmed, so spaces count, and `"        "` (8 spaces) is accepted.
- **Password length is counted in characters**, as the requirement states.
- **bcrypt's 72-byte limit:** bcrypt ignores everything after the first 72 bytes. Long passwords are still accepted. Passwords over 72 bytes are not refused, since REQ-404 sets no maximum.
- **Signing in again:** each successful sign-in creates a new session row and a new 7-day token. Earlier sessions stay as they are, and removing them is REQ-405.
- **Profile in progress:** a user whose profile row exists but has, say, `fitness_level` still null goes to Profile, not Today.
- **Missing `JWT_SECRET`:** if it is missing or too short, sign-in fails closed with 500 `{ error: "auth-misconfigured" }`, and no session row is left behind. The token is signed before the session row is inserted, or both happen in one transaction.
- **Database errors:** any database error returns 500 without the email or password in the log.
- **Expired token in the browser:** if the token in `localStorage` has expired, the API answers 401 on use. The web app then clears the token and returns to `/signin`.

## Out of scope (other work items)
- **Sign-out:** deleting the session row and clearing the token belongs to the REQ-405 work item.
- **Rejecting expired or deleted sessions server-side:** checking `sid` against the `sessions` table and `expires_at` on each request, and cleaning up expired rows, belongs to the REQ-405 work item. In this item, expiry is enforced only by the token's `exp`.
- **The 7-day expiry as a REQ-405 rule:** this item only uses the 7-day length when creating the session. REQ-405 owns the rule.
- **The Profile and Today screens:** their content belongs to REQ-406 and later requirements. Here they are placeholders that only prove the redirect.
- **Not in this version (REQ-404):** email verification, password reset, a "Forgot password?" link, password rules beyond 8 characters, rate limiting or lockout, choosing a hosting provider.

## Areas and files likely affected
- apps/api/package.json: adds `bcryptjs` and `@types/bcryptjs`.
- apps/api/src/routes/auth.ts (new).
- apps/api/src/auth/profileStatus.ts (new).
- apps/api/src/auth/sessionToken.ts (new).
- apps/api/src/glue/routes.ts: registers the route outside the knm markers.
- apps/api/tests/routes/auth.test.ts (new): every failure case above, plus:
  - the stored value is a bcrypt hash
  - a session row is created with `expires_at` 7 days after sign-in
  - the token's `sid` and `exp` match that row
  - `profileComplete` is false with no profile, false with five of the six fields, and true with all six
- apps/web/src/features/auth/SignInPage.tsx (new).
- apps/web/src/state/authStore.ts (new).
- apps/web/src/app/router.tsx.
- apps/web tests for SignInPage:
  - the banner appears after sign-up
  - there is no Forgot password link
  - the error messages show
  - the redirect goes to /profile or /today

## Risks
- **Token in localStorage (as decided):** any XSS on the web app can read the token. React's default escaping is the mitigation, along with not rendering raw HTML.
- **Signed-out tokens still work until REQ-405:** a token stays usable until its `exp`, even after a future sign-out, until the REQ-405 work item adds the server-side session check.
- **`JWT_SECRET`:** it must be set (at least 32 characters) in every environment.
- **No rate limiting:** sign-in is open to brute-force attempts. Rate limiting is out of scope.

## Assumptions
- The token's `exp` is set equal to the session's `expires_at`, so the two cannot drift apart.
- Email format checking is deliberately simple (see "Failure cases"). There is no DNS or mailbox check.
