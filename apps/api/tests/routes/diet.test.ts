// Diet preference and allergies routes (REQ-407, WI-071).
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { Express } from 'express';
import { createApp } from '../../src/http/app';
import { authenticate } from '../../src/auth/authMiddleware';
import { sessionCheck } from '../../src/auth/sessionCheck';
import { signSessionToken } from '../../src/auth/sessionToken';
import { isProfileComplete } from '../../src/auth/profileStatus';
import { dietRoute } from '../../src/routes/diet';
import { profileRoute } from '../../src/routes/profile';
import { routes } from '../../src/glue/routes';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { createOrm, ormProvider } from '../../src/db/orm';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));
const P = { age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner' };

describe('diet routes', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  const previousSecret = process.env.JWT_SECRET;

  const rows = async (sql: string, args: any[] = []) => (await db.execute({ sql, args })).rows;
  const newUser = async () => {
    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.execute({ sql: 'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', args: [userId, `${userId}@example.com`, 'x'] });
    await db.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', args: [sessionId, userId, expiresAt.toISOString()] });
    return { userId, token: await signSessionToken({ userId, sessionId, expiresAt }) };
  };
  const call = async (method: 'GET' | 'PUT', url: string, token?: string, body?: unknown) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };
  const getDiet = (token?: string) => call('GET', '/profile/diet', token);
  const putDiet = (token: string | undefined, body: unknown) => call('PUT', '/profile/diet', token, body);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    const app = createApp({
      routes: [profileRoute, dietRoute],
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
    expect(routes.map((r: any) => r.id)).toContain('diet');
  });

  it('needs a signed-in user', async () => {
    expect(await getDiet()).toEqual({ status: 401, body: { error: 'unauthorized' } });
    expect(await putDiet(undefined, { diet: 'vegetarian' })).toEqual({ status: 401, body: { error: 'unauthorized' } });
  });

  it('a new user has no diet and no allergies', async () => {
    const { token } = await newUser();
    expect(await getDiet(token)).toEqual({ status: 200, body: { diet: null, allergies: [] } });
  });

  it('saves the diet and the allergies, trimmed with spelling kept, and shows them sorted on return', async () => {
    const { token } = await newUser();
    const saved = { diet: 'vegetarian', allergies: ['egg', 'Peanuts', 'tree nuts'] };
    expect(await putDiet(token, { diet: 'vegetarian', allergies: [' tree nuts', 'Peanuts', 'egg '] })).toEqual({ status: 200, body: saved });
    expect(await getDiet(token)).toEqual({ status: 200, body: saved });
  });

  it('the saved list becomes exactly the sent list (add and remove)', async () => {
    const { userId, token } = await newUser();
    await putDiet(token, { diet: 'non_vegetarian', allergies: ['Milk', 'Soy'] });
    expect((await putDiet(token, { diet: 'non_vegetarian', allergies: ['Soy', 'Sesame'] })).body.allergies).toEqual(['Sesame', 'Soy']);
    expect((await rows('SELECT name FROM user_allergies WHERE user_id = ? ORDER BY name', [userId])).map((r) => r.name)).toEqual(['Sesame', 'Soy']);
    expect((await putDiet(token, { diet: 'non_vegetarian', allergies: [] })).body.allergies).toEqual([]);
    expect(await rows('SELECT id FROM user_allergies WHERE user_id = ?', [userId])).toHaveLength(0);
  });

  it('the diet can be cleared again (q2)', async () => {
    const { token } = await newUser();
    await putDiet(token, { diet: 'vegetarian', allergies: [] });
    expect((await putDiet(token, { diet: null, allergies: [] })).body.diet).toBeNull();
    expect((await getDiet(token)).body.diet).toBeNull();
  });

  it('with no profile and no diet, saving allergies creates no profile row', async () => {
    const { userId, token } = await newUser();
    expect((await putDiet(token, { diet: null, allergies: ['Egg'] })).status).toBe(200);
    expect(await rows('SELECT user_id FROM profiles WHERE user_id = ?', [userId])).toHaveLength(0);
    expect((await getDiet(token)).body).toEqual({ diet: null, allergies: ['Egg'] });
  });

  it('a diet saved before the profile is kept when the profile is saved, and is not needed for completeness', async () => {
    const { userId, token } = await newUser();
    await putDiet(token, { diet: 'vegetarian', allergies: [] });
    const orm = createOrm(db as any);
    expect(await isProfileComplete(orm, userId)).toBe(false);                 // diet only: not complete
    expect((await call('PUT', '/profile', token, P)).status).toBe(200);
    expect((await getDiet(token)).body.diet).toBe('vegetarian');
    expect(await isProfileComplete(orm, userId)).toBe(true);
  });

  it('never touches the six profile fields or the calorie target', async () => {
    const { userId, token } = await newUser();
    await call('PUT', '/profile', token, P);
    const before = (await rows('SELECT age, sex, height_cm, weight_kg, goal_type, fitness_level, daily_calorie_target, daily_water_target_ml FROM profiles WHERE user_id = ?', [userId]))[0];
    await putDiet(token, { diet: 'non_vegetarian', allergies: ['Fish'] });
    await putDiet(token, { diet: null, allergies: [] });
    const after = (await rows('SELECT age, sex, height_cm, weight_kg, goal_type, fitness_level, daily_calorie_target, daily_water_target_ml FROM profiles WHERE user_id = ?', [userId]))[0];
    expect(after).toEqual(before);
  });

  it('refuses invalid input with its message and changes nothing (q3, q4)', async () => {
    const { token } = await newUser();
    const saved = { diet: 'vegetarian', allergies: ['Egg'] };
    await putDiet(token, saved);
    const cases: [unknown, Record<string, string>][] = [
      [{ diet: 'vegan', allergies: [] }, { diet: 'Choose vegetarian or non-vegetarian, or leave it empty.' }],
      [{ diet: null, allergies: ['Peanuts', 'PEANUTS '] }, { allergies: "'PEANUTS' is already in your list." }],
      [{ diet: null, allergies: ['x'.repeat(51)] }, { allergies: 'Allergy names must be 1 to 50 characters.' }],
      [{ diet: null, allergies: Array.from({ length: 21 }, (_, i) => `a${i}`) }, { allergies: 'You can list at most 20 allergies.' }],
      [{ diet: null, allergies: 'Egg' }, { allergies: 'Allergies must be a list of names.' }]
    ];
    for (const [body, fields] of cases) expect(await putDiet(token, body)).toEqual({ status: 400, body: { error: 'invalid-diet', fields } });
    expect((await getDiet(token)).body).toEqual(saved);
  });

  it('allows exactly 20 allergies of 50 characters', async () => {
    const { token } = await newUser();
    const twenty = Array.from({ length: 20 }, (_, i) => `${String(i).padStart(2, '0')}${'n'.repeat(48)}`);
    const res = await putDiet(token, { diet: null, allergies: twenty });
    expect(res.status).toBe(200);
    expect(res.body.allergies).toHaveLength(20);
  });

  it('the seed migration provides both diet codes', async () => {
    expect((await rows('SELECT code, label FROM diet_types ORDER BY code')).map((r) => [r.code, r.label]))
      .toEqual([['non_vegetarian', 'Non-vegetarian'], ['vegetarian', 'Vegetarian']]);
  });
});
