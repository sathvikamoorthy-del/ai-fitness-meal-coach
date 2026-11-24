import fs from 'fs';
import http from 'http';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Express } from 'express';
import { createApp } from '../../src/http/app';
import { routes } from '../../src/glue/routes';
import { authRoute, normaliseEmail } from '../../src/routes/auth';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { ormProvider } from '../../src/db/orm';
import { verifyToken } from '../../src/auth/jwt';
import { authenticate } from '../../src/auth/authMiddleware';
import { sessionCheck } from '../../src/auth/sessionCheck';
import { withEnv } from '../../src/testing/testUtils';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));

describe('auth routes', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  const previousSecret = process.env.JWT_SECRET;

  const post = async (url: string, body: unknown) => {
    const res = await fetch(`${base}${url}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };
  const signUp = (email: unknown, password: unknown) => post('/auth/signup', { email, password });
  const signIn = (email: unknown, password: unknown) => post('/auth/signin', { email, password });
  const rows = async (sql: string, args: any[] = []) => (await db.execute({ sql, args })).rows;

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    // goal_types 'lose' and fitness_levels 'beginner' come from the seed migration 0002_seed_profile_reference.sql (WI-070)
    const app = createApp({
      routes: [authRoute],
      middleware: [{ id: 'jwt-auth', handler: authenticate as any }, { id: 'session-check', handler: sessionCheck }],
      providers: [
        { id: 'test-db', register: (a: Express) => { a.set('db', db); } },
        { id: 'orm', register: (a: Express) => { ormProvider(a); } }
      ]
    });
    server = await new Promise<http.Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
    db.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  });

  it('is registered in the route glue', () => {
    expect(routes.map((r: any) => r.id)).toContain('auth');
  });

  describe('sign-up', () => {
    it('creates an account with a normalised email and only a bcrypt hash of the password', async () => {
      const res = await signUp('  Ann@Example.com ', 'secret-pass');
      expect(res).toEqual({ status: 201, body: { ok: true } });
      const [user] = await rows('SELECT email, password_hash FROM users WHERE email = ?', ['ann@example.com']);
      expect(user.email).toBe('ann@example.com');
      expect(user.password_hash).not.toBe('secret-pass');
      expect(String(user.password_hash)).toMatch(/^\$2[aby]\$/);
      expect(await bcrypt.compare('secret-pass', String(user.password_hash))).toBe(true);
    });

    it('does not sign the user in: no token and no session', async () => {
      const res = await signUp('nosession@example.com', 'secret-pass');
      expect(res.body.token).toBeUndefined();
      expect(await rows('SELECT s.id FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ?', ['nosession@example.com'])).toHaveLength(0);
    });

    it('refuses a password shorter than 8 characters and stores nothing', async () => {
      expect(await signUp('short@example.com', 'seven77')).toEqual({ status: 400, body: { error: 'password-too-short' } });
      expect(await rows('SELECT id FROM users WHERE email = ?', ['short@example.com'])).toHaveLength(0);
    });

    it('accepts exactly 8 characters, spaces included', async () => {
      expect((await signUp('spaces@example.com', '        ')).status).toBe(201);
    });

    it('refuses a missing or non-string password', async () => {
      expect(await signUp('nopass@example.com', undefined)).toEqual({ status: 400, body: { error: 'password-too-short' } });
      expect(await signUp('nopass@example.com', 12345678)).toEqual({ status: 400, body: { error: 'password-too-short' } });
    });

    it('refuses a missing or badly formed email', async () => {
      for (const email of [undefined, '', '   ', 42, 'no-at-sign', 'a@b', '@example.com', 'ann@', 'a@@b.com', 'a b@c.com', `${'a'.repeat(250)}@x.com`]) {
        expect(await signUp(email, 'secret-pass')).toEqual({ status: 400, body: { error: 'invalid-email' } });
      }
    });

    it('refuses a duplicate email with 409, ignoring letter case', async () => {
      expect((await signUp('dup@example.com', 'secret-pass')).status).toBe(201);
      expect(await signUp('dup@example.com', 'other-pass')).toEqual({ status: 409, body: { error: 'email-taken' } });
      expect(await signUp('DUP@Example.COM', 'other-pass')).toEqual({ status: 409, body: { error: 'email-taken' } });
      expect(await rows("SELECT id FROM users WHERE email = 'dup@example.com'")).toHaveLength(1);
    });

    it('answers 409, not 500, when two sign-ups with the same email race', async () => {
      const results = await Promise.all([signUp('race@example.com', 'secret-pass'), signUp('Race@example.com', 'secret-pass')]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });
  });

  describe('sign-in', () => {
    beforeAll(async () => {
      await signUp('bob@example.com', 'bob-password');
    });

    it('signs in with any letter case of the email and creates a 7-day session tied to the token', async () => {
      const before = Date.now();
      const res = await signIn(' BOB@example.com', 'bob-password');
      expect(res.status).toBe(200);
      expect(res.body.profileComplete).toBe(false);
      const claims = await verifyToken(res.body.token);
      const [user] = await rows("SELECT id FROM users WHERE email = 'bob@example.com'");
      expect(claims.userId).toBe(user.id);
      const [session] = await rows('SELECT user_id, expires_at FROM sessions WHERE id = ?', [claims.claims.sid as string]);
      expect(session.user_id).toBe(user.id);
      const expiresMs = Date.parse(String(session.expires_at));
      const week = 7 * 24 * 60 * 60 * 1000;
      expect(expiresMs).toBeGreaterThanOrEqual(before + week);
      expect(expiresMs).toBeLessThanOrEqual(Date.now() + week);
      expect(claims.claims.exp).toBe(Math.floor(expiresMs / 1000));
    });

    it('creates a new session on every sign-in', async () => {
      const a = await verifyToken((await signIn('bob@example.com', 'bob-password')).body.token);
      const b = await verifyToken((await signIn('bob@example.com', 'bob-password')).body.token);
      expect(a.claims.sid).not.toBe(b.claims.sid);
    });

    it('refuses a wrong password with 401 and creates no session', async () => {
      const [{ n: before }] = await rows('SELECT COUNT(*) AS n FROM sessions');
      expect(await signIn('bob@example.com', 'wrong-password')).toEqual({ status: 401, body: { error: 'invalid-credentials' } });
      const [{ n: after }] = await rows('SELECT COUNT(*) AS n FROM sessions');
      expect(after).toBe(before);
    });

    it('refuses an unknown email with the same answer as a wrong password', async () => {
      expect(await signIn('nobody@example.com', 'bob-password')).toEqual({ status: 401, body: { error: 'invalid-credentials' } });
    });

    it('refuses a missing or badly formed email and a missing password', async () => {
      expect(await signIn(undefined, 'bob-password')).toEqual({ status: 400, body: { error: 'invalid-email' } });
      expect(await signIn('not-an-email', 'bob-password')).toEqual({ status: 400, body: { error: 'invalid-email' } });
      expect(await signIn('bob@example.com', undefined)).toEqual({ status: 400, body: { error: 'invalid-credentials' } });
    });

    it('fails closed with 500 and leaves no session row when JWT_SECRET is missing', async () => {
      const [{ n: before }] = await rows('SELECT COUNT(*) AS n FROM sessions');
      const res = await withEnv({ JWT_SECRET: undefined }, () => signIn('bob@example.com', 'bob-password'));
      expect(res).toEqual({ status: 500, body: { error: 'auth-misconfigured' } });
      const [{ n: after }] = await rows('SELECT COUNT(*) AS n FROM sessions');
      expect(after).toBe(before);
    });
  });

  describe('sign-out (REQ-405)', () => {
    const signOut = async (token?: string) => {
      const res = await fetch(`${base}/auth/signout`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {} });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    };
    const sidOf = async (token: string) => String((await verifyToken(token)).claims.sid);

    beforeAll(async () => {
      await signUp('dana@example.com', 'dana-password');
    });

    it('ends the current session: 204, the row is gone, and the old token is refused', async () => {
      const { token } = (await signIn('dana@example.com', 'dana-password')).body;
      const sid = await sidOf(token);
      expect(await signOut(token)).toEqual({ status: 204, body: null });
      expect(await rows('SELECT id FROM sessions WHERE id = ?', [sid])).toHaveLength(0);
      expect(await signOut(token)).toEqual({ status: 401, body: { error: 'session-ended' } });   // second sign-out, same token
    });

    it('refuses sign-out without a token', async () => {
      expect(await signOut()).toEqual({ status: 401, body: { error: 'unauthorized' } });
    });

    it("leaves the same user's other sessions working", async () => {
      const a = (await signIn('dana@example.com', 'dana-password')).body.token;
      const b = (await signIn('dana@example.com', 'dana-password')).body.token;
      expect((await signOut(a)).status).toBe(204);
      expect(await rows('SELECT id FROM sessions WHERE id = ?', [await sidOf(b)])).toHaveLength(1);
      expect((await signOut(b)).status).toBe(204);
    });

    it('does not extend expires_at when the session is used', async () => {
      const { token } = (await signIn('dana@example.com', 'dana-password')).body;
      const sid = await sidOf(token);
      const [before] = await rows('SELECT expires_at FROM sessions WHERE id = ?', [sid]);
      await new Promise((r) => setTimeout(r, 20));
      await signIn('dana@example.com', 'dana-password');   // other activity of the same user
      const [after] = await rows('SELECT expires_at FROM sessions WHERE id = ?', [sid]);
      expect(after.expires_at).toBe(before.expires_at);
      expect((await signOut(token)).status).toBe(204);     // the session is still the same, valid one
    });

    it("removes the user's expired sessions at sign-in and starts a new 7-day session", async () => {
      const [user] = await rows("SELECT id FROM users WHERE email = 'dana@example.com'");
      await db.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', args: ['old-dana', user.id, new Date(Date.now() - 1000).toISOString()] });
      const before = Date.now();
      const { token } = (await signIn('dana@example.com', 'dana-password')).body;
      expect(await rows("SELECT id FROM sessions WHERE id = 'old-dana'")).toHaveLength(0);
      const [row] = await rows('SELECT expires_at FROM sessions WHERE id = ?', [await sidOf(token)]);
      expect(Date.parse(String(row.expires_at))).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('profileComplete after sign-in', () => {
    const fields = { age: 30, sex: 'female', height_cm: 165, weight_kg: 60, goal_type: 'lose', fitness_level: 'beginner' } as const;
    const userId = async (email: string) => String((await rows('SELECT id FROM users WHERE email = ?', [email]))[0].id);
    const setProfile = async (email: string, values: Partial<Record<keyof typeof fields, unknown>>) => {
      const id = await userId(email);
      await db.execute({ sql: 'DELETE FROM profiles WHERE user_id = ?', args: [id] });
      const cols = Object.keys(values);
      await db.execute({
        sql: `INSERT INTO profiles (user_id${cols.map((c) => `, ${c}`).join('')}) VALUES (?${cols.map(() => ', ?').join('')})`,
        args: [id, ...Object.values(values)] as any[]
      });
    };

    beforeAll(async () => {
      await signUp('carol@example.com', 'carol-password');
    });

    it('is false when there is no profile row', async () => {
      expect((await signIn('carol@example.com', 'carol-password')).body.profileComplete).toBe(false);
    });

    it.each(Object.keys(fields))('is false when %s is empty', async (missing) => {
      const values: Record<string, unknown> = { ...fields };
      delete values[missing];
      await setProfile('carol@example.com', values);
      expect((await signIn('carol@example.com', 'carol-password')).body.profileComplete).toBe(false);
    });

    it('is true when all six fields are filled, whatever the other fields hold', async () => {
      await setProfile('carol@example.com', fields);
      expect((await signIn('carol@example.com', 'carol-password')).body.profileComplete).toBe(true);
    });
  });
});

describe('normaliseEmail', () => {
  it('trims and lowercases a valid email and rejects anything else', () => {
    expect(normaliseEmail('  Ann@Example.COM ')).toBe('ann@example.com');
    expect(normaliseEmail(null)).toBeNull();
    expect(normaliseEmail('x@y')).toBeNull();
  });
});
