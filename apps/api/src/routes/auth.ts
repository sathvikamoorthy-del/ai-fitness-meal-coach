// Sign-up and sign-in with email and password (REQ-404, WI-045).
//   POST /auth/signup {email, password} -> 201 {ok: true}; 400 invalid-email | password-too-short; 409 email-taken
//   POST /auth/signin {email, password} -> 200 {token, profileComplete}; 400 invalid-email; 401 invalid-credentials
// The browser calls these as /api/auth/... (the proxy strips /api, as for /health). Sign-up never signs the user in.
// Passwords are stored only as bcrypt hashes and are never logged.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import { RouteEntry, wrapAsync } from '../http/app';
import type { Orm } from '../db/orm';
import { users } from '../db/models/users';
import { sessions } from '../db/models/sessions';
import { AuthConfigError } from '../auth/jwt';
import { SESSION_LENGTH_MS, signSessionToken } from '../auth/sessionToken';
import { isProfileComplete } from '../auth/profileStatus';

export const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_COST = 10;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // one @, text on both sides, a dot inside the domain

// Compared against when the email is unknown, so the answer takes as long as for a wrong password.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password', BCRYPT_COST));

/** Trimmed and lowercased email, or null when it is missing or badly formed. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

// Length in characters (code points), as the requirement states. Passwords are not trimmed: spaces count.
const passwordLength = (p: string) => Array.from(p).length;

// A UNIQUE violation, possibly wrapped by Drizzle (the libSQL error is then the `cause`).
function isUniqueViolation(err: unknown): boolean {
  for (let e: any = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(String(e.message ?? ''))) return true;
  }
  return false;
}

const ormOf = (req: Request) => req.app.get('orm') as Orm;

async function signUp(req: Request, res: Response) {
  const email = normaliseEmail(req.body?.email);
  if (!email) return void res.status(400).json({ error: 'invalid-email' });
  const password = req.body?.password;
  if (typeof password !== 'string' || passwordLength(password) < MIN_PASSWORD_LENGTH) {
    return void res.status(400).json({ error: 'password-too-short' });
  }
  const orm = ormOf(req);
  const [existing] = await orm.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return void res.status(409).json({ error: 'email-taken' });
  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    await orm.insert(users).values({ id: crypto.randomUUID(), email, password_hash });
  } catch (err) {
    if (isUniqueViolation(err)) return void res.status(409).json({ error: 'email-taken' });   // a concurrent sign-up won
    throw err;
  }
  res.status(201).json({ ok: true });
}

async function signIn(req: Request, res: Response) {
  const email = normaliseEmail(req.body?.email);
  if (!email) return void res.status(400).json({ error: 'invalid-email' });
  const password = req.body?.password;
  if (typeof password !== 'string') return void res.status(400).json({ error: 'invalid-credentials' });

  const orm = ormOf(req);
  const [user] = await orm.select().from(users).where(eq(users.email, email)).limit(1);
  const matches = await bcrypt.compare(password, user ? user.password_hash : getDummyHash());
  if (!user || !matches) return void res.status(401).json({ error: 'invalid-credentials' });

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_MS);
  let token: string;
  try {
    token = await signSessionToken({ userId: user.id, sessionId, expiresAt });   // before the insert: no orphan session row
  } catch (err) {
    if (err instanceof AuthConfigError) return void res.status(500).json({ error: 'auth-misconfigured' });
    throw err;
  }
  await orm.insert(sessions).values({ id: sessionId, user_id: user.id, expires_at: expiresAt.toISOString() });
  res.json({ token, profileComplete: await isProfileComplete(orm, user.id) });
}

export const authRoute: RouteEntry = {
  id: 'auth',
  mount: (router: Router) => {
    router.post('/auth/signup', wrapAsync(signUp));
    router.post('/auth/signin', wrapAsync(signIn));
  }
};
