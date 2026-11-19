// Session check middleware (REQ-405, WI-046): a valid token is only accepted while its session row exists and has not expired.
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { Express, Router } from 'express';
import { createApp } from '../../src/http/app';
import { authenticate, requireAuth } from '../../src/auth/authMiddleware';
import { sessionCheck, SessionReq } from '../../src/auth/sessionCheck';
import { signSessionToken } from '../../src/auth/sessionToken';
import { signToken } from '../../src/auth/jwt';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { ormProvider } from '../../src/db/orm';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));

describe('sessionCheck', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  const previousSecret = process.env.JWT_SECRET;
  const userId = crypto.randomUUID();
  const DAY = 24 * 60 * 60 * 1000;

  const get = async (token?: string) => {
    const res = await fetch(`${base}/whoami`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    return { status: res.status, body: await res.json() as any };
  };
  // A session row plus a token for it; the row's expires_at can differ from the token's exp to test the second guard.
  const session = async (rowExpiresAt: Date, tokenExpiresAt: Date = new Date(Date.now() + DAY)) => {
    const id = crypto.randomUUID();
    await db.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', args: [id, userId, rowExpiresAt.toISOString()] });
    return { id, token: await signSessionToken({ userId, sessionId: id, expiresAt: tokenExpiresAt }) };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    await db.execute({ sql: "INSERT INTO users (id, email, password_hash) VALUES (?, 'sc@example.com', 'x')", args: [userId] });
    const app = createApp({
      routes: [
        { id: 'open', mount: (r: Router) => { r.get('/open', (_req, res) => { res.json({ ok: true }); }); } },
        { id: 'whoami', mount: (r: Router) => { r.get('/whoami', requireAuth as any, (req, res) => { res.json({ sessionId: (req as SessionReq).sessionId }); }); } }
      ],
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

  it('lets an anonymous request through to routes that do not need a user', async () => {
    const res = await fetch(`${base}/open`);
    expect(res.status).toBe(200);
    expect(await get()).toEqual({ status: 401, body: { error: 'unauthorized' } });   // requireAuth still guards
  });

  it('accepts a token whose session exists and has not expired, and exposes the session id', async () => {
    const s = await session(new Date(Date.now() + DAY));
    expect(await get(s.token)).toEqual({ status: 200, body: { sessionId: s.id } });
  });

  it('refuses a token whose session row is gone (signed out) with session-ended', async () => {
    const s = await session(new Date(Date.now() + DAY));
    await db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [s.id] });
    expect(await get(s.token)).toEqual({ status: 401, body: { error: 'session-ended' } });
  });

  it('refuses a still-valid token whose session has passed expires_at with session-expired', async () => {
    const s = await session(new Date(Date.now() - 1000));
    expect(await get(s.token)).toEqual({ status: 401, body: { error: 'session-expired' } });
  });

  it('refuses a token whose session belongs to another user', async () => {
    const s = await session(new Date(Date.now() + DAY));
    const other = await signSessionToken({ userId: crypto.randomUUID(), sessionId: s.id, expiresAt: new Date(Date.now() + DAY) });
    expect(await get(other)).toEqual({ status: 401, body: { error: 'session-ended' } });
  });

  it('refuses a valid token without a session id', async () => {
    const token = await signToken({ userId });
    expect(await get(token)).toEqual({ status: 401, body: { error: 'unauthorized' } });
  });

  it('never extends the session: expires_at is unchanged after requests', async () => {
    const expires = new Date(Date.now() + DAY);
    const s = await session(expires);
    for (let i = 0; i < 3; i++) expect((await get(s.token)).status).toBe(200);
    const [row] = (await db.execute({ sql: 'SELECT expires_at FROM sessions WHERE id = ?', args: [s.id] })).rows;
    expect(row.expires_at).toBe(expires.toISOString());
  });
});
