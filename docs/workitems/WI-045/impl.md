# Email/password sign-up and sign-in

Applications: api (primary), web

Work item WI-045 · Requirement REQ-404 · Decision DEC-439 · Feature FEAT-1367

## Approach

### api (APP-039, apps/api)
- Add `bcryptjs` (pure JS, so it needs no native build on any host) for hashing. Cost factor 10 or higher.
- New route module `src/routes/auth.ts`, registered in `src/glue/routes.ts` next to `healthRoute` (outside the knm markers):
  - `POST /api/auth/signup` `{ email, password }`:
    - Trim and lowercase the email and check its basic format. The `users.email` column is unique and NOCASE.
    - Refuse a password shorter than 8 characters with 400 `{ error: "password-too-short" }`. There are no other password rules.
    - Insert `users { id: uuid, email, password_hash }` through the Drizzle model `src/db/models/users.ts`.
    - Return 201 `{ ok: true }`. No token is returned, because sign-up does not sign the user in.
    - A duplicate email returns 409 `{ error: "email-taken" }`.
  - `POST /api/auth/signin` `{ email, password }`:
    - Look up the user by email and `bcrypt.compare` the password.
    - On success, return 200 `{ token, profileComplete }`, where the token comes from `signToken({ userId })` in `src/auth/jwt.ts`.
    - An unknown email or a wrong password both return 401 `{ error: "invalid-credentials" }`, so the response doesn't reveal whether the email exists.
- `profileComplete` comes from a single helper, `src/auth/profileStatus.ts` (`isProfileComplete(userId)`). It reads the `profiles` table, and REQ-406 can tighten the rule later.
- Storage uses the existing libSQL client (`src/db/client.ts`). On deployment, `DATABASE_URL` points to Turso (`libsql://...`) and `DATABASE_AUTH_TOKEN` is set. Because of this, accounts survive a restart. The `users` table already exists in migration `0001_db_design.sql`.
- Tests in `tests/routes/auth.test.ts` use an in-memory database and cover:
  - sign-up succeeds
  - a short password is refused
  - the stored value is a bcrypt hash, not the plain password
  - a duplicate email returns 409
  - sign-in succeeds
  - a wrong password returns 401
  - `profileComplete` is false for a new user

### web (APP-038, apps/web)
- One Sign-in screen, `src/features/auth/SignInPage.tsx`, built with Chakra UI as in mock.md:
  - Email and Password fields, the hint "min. 8 characters", and Sign in and Sign up buttons.
  - No "Forgot password?" link and no verification step.
- Sign up calls `/api/auth/signup`:
  - On success, the screen shows the "Account created" banner with "Sign in with the same email and password." and the user stays on the screen without being signed in.
  - On error, the screen shows an inline message.
- Sign in calls `/api/auth/signin` and stores the token in a small zustand auth store, `src/state/authStore.ts`, built on `createStore.ts`. The page then navigates to `/profile` if `profileComplete` is false, or to `/today` otherwise.
- Routes are registered in `src/app/router.tsx`: `/signin` (the default for signed-out users), plus placeholder `/profile` and `/today` routes behind a signed-in guard. REQ-406 and later requirements fill in those screens.
- The API base URL comes from `src/app/config.ts`.
- Tests: a render test for SignInPage covers the banner after sign-up, checks that the Forgot password link is absent, and checks the redirect after sign-in.

## Areas and files likely affected
- apps/api/package.json: adds `bcryptjs` and `@types/bcryptjs`.
- apps/api/src/routes/auth.ts and apps/api/src/auth/profileStatus.ts (new).
- apps/api/src/glue/routes.ts: registers the new route.
- apps/api/tests/routes/auth.test.ts (new).
- apps/web/src/features/auth/SignInPage.tsx and apps/web/src/state/authStore.ts (new).
- apps/web/src/app/router.tsx and possibly apps/web/src/app/config.ts.
- A web test for SignInPage.

## Risks
- The JWT is kept client-side. In-memory storage is safest but is lost on reload, and localStorage survives a reload but is exposed to XSS. The plan uses localStorage with a 1h expiry for this first slice. The `sessions` table in the DB design is not used yet.
- `JWT_SECRET` must be set to at least 32 characters in every environment, or the API fails closed with a 500.
- The hosting provider is not chosen yet. Deployment is verified only as "the API runs with a Turso `DATABASE_URL`".
- Without rate limiting, sign-in is open to brute-force attempts. REQ-404 doesn't ask for limits, so rate limiting is left out of this item.

## Assumptions
- A duplicate email at sign-up is refused with a clear message. REQ-404 is silent on this case, and refusing it is the only option that doesn't leak data or corrupt state.
- Until REQ-406 defines "complete", a profile counts as complete when a `profiles` row exists for the user with `goal_type` set. The rule lives in one helper so REQ-406 can change it.
- Profile and Today are placeholder screens in this item. Their content belongs to later requirements.
