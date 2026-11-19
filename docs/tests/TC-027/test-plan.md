# Test plan: Sign-up and sign-in with email and password

Test case TC-027 · Requirement REQ-404 · Work item WI-045 · Feature FEAT-1367

## Scope
Checks every acceptance criterion of REQ-404, plus the failure and edge cases in WI-045 `impl.md`. Sign-out and server-side session expiry belong to REQ-405 and are not tested here.

## Setup
- **API tests:** `apps/api/tests/routes/auth.test.ts` with the in-memory app and database from `src/testing/testUtils.ts` (`:memory:`). Migration `0001_db_design.sql` is applied.
- **Web tests:** the `SignInPage` tests in `apps/web`, with the API mocked.
- **Restart test (S14):** the API running with `DATABASE_URL` = a Turso `libsql://` URL and `DATABASE_AUTH_TOKEN` set. `JWT_SECRET` must be at least 32 characters. Any host works, because none is chosen.
- **Profile fixtures** (for S8, S9, S10):
  - no `profiles` row;
  - a row with 5 of the 6 required fields, leaving `fitness_level` null;
  - a row with all 6: `age`, `sex`, `height_cm`, `weight_kg`, `goal_type`, `fitness_level`.

## Scenarios

### Sign-up
| # | Steps | Expected |
|---|---|---|
| S1 | `POST /api/auth/signup` with `{ "email": "ann@x.com", "password": "abcd1234" }` | 201 `{ ok: true }`. One `users` row with email `ann@x.com`. No token is returned and no `sessions` row is created. |
| S2 | Check the `users` row from S1 | `password_hash` starts with `$2a$` or `$2b$` (bcrypt), `bcrypt.compare("abcd1234", password_hash)` is true, and `abcd1234` appears in no column and no log line. |
| S3 | Sign up with password `abc1234` (7 characters) | 400 `{ error: "password-too-short" }`. No row is inserted. The web page shows "Password must be at least 8 characters." |
| S4 | Sign up with password `"        "` (8 spaces) | 201. Spaces count, and the password is not trimmed. |
| S5 | Web: fill in the email and an 8-character password, then click Sign up | The "Account created" banner shows with "Sign in with the same email and password.". The password field is cleared, the user stays on the sign-in screen, and no token is in `localStorage`. |
| S6 | Sign up `ann@x.com`, then sign up `Ann@X.com` | Second call: 409 `{ error: "email-taken" }`. The page shows "An account with this email already exists." |
| S7 | Sign up with email `" Bob@Y.com "` | 201. The stored email is `bob@y.com`. |

### Sign-in
| # | Steps | Expected |
|---|---|---|
| S8 | Sign in as a user with no profile row | 200 with `token` and `profileComplete: false`. The web app goes to `/profile`. |
| S9 | Sign in as a user whose profile has 5 of the 6 fields | `profileComplete: false`. The web app goes to `/profile`. |
| S10 | Sign in as a user whose profile has all 6 fields | `profileComplete: true`. The web app goes to `/today`. |
| S11 | Sign in after S8 and decode the token | One new `sessions` row with `expires_at` = sign-in time + 7 days (ISO-8601 UTC). The token's `sub` is the user id, `sid` is that session id, and `exp` equals `expires_at`. |
| S12 | Sign in with the right email and a wrong password | 401 `{ error: "invalid-credentials" }`. No session row. The page shows "Email or password is incorrect." |
| S13 | Sign in with an unknown email | 401 `{ error: "invalid-credentials" }` and the same message as S12. |
| S14 | Sign in with `" ANN@x.COM "` and the right password | 200, the same account as `ann@x.com`. |

### Validation
| # | Steps | Expected |
|---|---|---|
| S15 | Sign up and sign in with each email: missing, `123` (not a string), `"   "`, `annx.com`, `a@@x.com`, `ann@xcom`, a 255-character address | 400 `{ error: "invalid-email" }`. The page shows "Enter a valid email address." |
| S16 | Missing password or a non-string password | Sign-up: 400 `password-too-short`. Sign-in: 400 `invalid-credentials`. |

### Scope and storage
| # | Steps | Expected |
|---|---|---|
| S17 | Web: render the sign-in screen | It shows Email, Password, the hint "min. 8 characters", and the Sign in and Sign up buttons. There is no "Forgot password?" link and no email verification step anywhere in the flow. |
| S18 | With the Turso setup: sign up `restart@x.com`, stop the API process, start it again, then sign in with the same email and password | Sign-in succeeds (200). The account was kept in Turso across the restart. |
| S19 | Start the API with `JWT_SECRET` unset (or under 32 characters), then sign in with a valid account | 500 `{ error: "auth-misconfigured" }`. No `sessions` row is left behind. |

## Pass criteria
All of S1 to S19 give the expected result. The automated API and web tests cover S1 to S17 and S19, and S18 is run by hand against Turso.

## Acceptance criteria coverage
| REQ-404 acceptance criterion | Scenarios |
|---|---|
| Create an account with email and a password of at least 8 characters | S1, S4, S7 |
| Password shorter than 8 characters refused | S3 |
| Stored password is a bcrypt hash; the plain password is not stored | S2 |
| "Account created" shown, user not signed in | S1, S5 |
| Sign in with that email and password | S8, S14 |
| Redirect to Profile or Today | S8, S9, S10 |
| Wrong password refused | S12, S13 |
| No verification step, no reset link | S17 |
| Accounts survive a restart (Turso) | S18 |
