// Profile routes (REQ-406, WI-070): GET/PUT /profile with validation, the stored calorie target and the q1 refusal.
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
import { profileRoute } from '../../src/routes/profile';
import { routes } from '../../src/glue/routes';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { createOrm, ormProvider } from '../../src/db/orm';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));

const valid = { age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner' };
const TOO_LOW = 'This goal gives a calorie target that is too low; choose maintain or gain weight.';

describe('profile routes', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  const previousSecret = process.env.JWT_SECRET;

  const rows = async (sql: string, args: any[] = []) => (await db.execute({ sql, args })).rows;
  // A user with a live 7-day session, and its token.
  const newUser = async () => {
    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.execute({ sql: 'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', args: [userId, `${userId}@example.com`, 'x'] });
    await db.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', args: [sessionId, userId, expiresAt.toISOString()] });
    return { userId, token: await signSessionToken({ userId, sessionId, expiresAt }) };
  };
  const call = async (method: 'GET' | 'PUT', token?: string, body?: unknown) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}/profile`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    const app = createApp({
      routes: [profileRoute],
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
    expect(routes.map((r: any) => r.id)).toContain('profile');
  });

  it('needs a signed-in user', async () => {
    expect(await call('GET')).toEqual({ status: 401, body: { error: 'unauthorized' } });
    expect(await call('PUT', undefined, valid)).toEqual({ status: 401, body: { error: 'unauthorized' } });
  });

  it('GET answers profile: null before the first save', async () => {
    const { token } = await newUser();
    expect(await call('GET', token)).toEqual({ status: 200, body: { profile: null } });
  });

  it('PUT saves the six fields and the rounded target; GET shows them again', async () => {
    const { userId, token } = await newUser();
    const saved = { ...valid, dailyCalorieTarget: 1434 };
    expect(await call('PUT', token, valid)).toEqual({ status: 200, body: { profile: saved, profileComplete: true } });
    expect(await call('GET', token)).toEqual({ status: 200, body: { profile: saved } });
    const [row] = await rows('SELECT daily_calorie_target, daily_water_target_ml FROM profiles WHERE user_id = ?', [userId]);
    expect(row.daily_calorie_target).toBe(1434);
    expect(row.daily_water_target_ml).toBe(2000);                       // default, not returned or shown
    expect(await isProfileComplete(createOrm(db as any), userId)).toBe(true);
  });

  it('saving again with changed values recomputes the target', async () => {
    const { token } = await newUser();
    await call('PUT', token, valid);
    const res = await call('PUT', token, { ...valid, goal: 'maintain' });
    expect(res.body.profile.dailyCalorieTarget).toBe(1934);              // 1,934.45 rounded
    expect((await call('GET', token)).body.profile.goal).toBe('maintain');
  });

  it('refuses a missing or out-of-range field with its message and saves nothing', async () => {
    const { userId, token } = await newUser();
    const { fitnessLevel, ...noLevel } = valid;
    expect(await call('PUT', token, { ...noLevel, heightCm: 300 })).toEqual({
      status: 400,
      body: { error: 'invalid-profile', fields: { heightCm: 'Height must be between 100 and 250 cm.', fitnessLevel: 'Fitness level is required.' } }
    });
    expect(await rows('SELECT user_id FROM profiles WHERE user_id = ?', [userId])).toHaveLength(0);
  });

  it('refuses a target of 0 kcal or less (WI-070 q1) and keeps the saved profile unchanged', async () => {
    const { userId, token } = await newUser();
    const low = { age: 100, sex: 'female', heightCm: 100, weightKg: 30, goal: 'lose', fitnessLevel: 'beginner' };   // -130 kcal
    expect(await call('PUT', token, low)).toEqual({ status: 400, body: { error: 'calorie-target-too-low', message: TOO_LOW } });
    expect(await rows('SELECT user_id FROM profiles WHERE user_id = ?', [userId])).toHaveLength(0);
    await call('PUT', token, valid);
    expect((await call('PUT', token, low)).status).toBe(400);
    expect((await call('GET', token)).body.profile).toEqual({ ...valid, dailyCalorieTarget: 1434 });
    expect((await call('PUT', token, { ...low, goal: 'maintain' })).body.profile.dailyCalorieTarget).toBe(370);
  });

  it('keeps diet_type and the water target when the profile is saved again', async () => {
    const { userId, token } = await newUser();
    await db.execute({ sql: "INSERT INTO diet_types (code, label) VALUES ('vegetarian', 'Vegetarian')", args: [] });
    await db.execute({ sql: "INSERT INTO profiles (user_id, diet_type, daily_water_target_ml) VALUES (?, 'vegetarian', 2500)", args: [userId] });
    expect((await call('PUT', token, valid)).status).toBe(200);
    const [row] = await rows('SELECT diet_type, daily_water_target_ml, age FROM profiles WHERE user_id = ?', [userId]);
    expect(row).toMatchObject({ diet_type: 'vegetarian', daily_water_target_ml: 2500, age: 32 });
  });

  it('GET returns null for fields that are still empty', async () => {
    const { userId, token } = await newUser();
    await db.execute({ sql: 'INSERT INTO profiles (user_id, age) VALUES (?, 40)', args: [userId] });
    expect((await call('GET', token)).body.profile).toEqual({
      age: 40, sex: null, heightCm: null, weightKg: null, goal: null, fitnessLevel: null, dailyCalorieTarget: null
    });
  });

  it('the seed migration provides the reference rows and is safe to run again', async () => {
    expect((await rows('SELECT code FROM goal_types ORDER BY code')).map((r) => r.code)).toEqual(['gain', 'lose', 'maintain']);
    expect((await rows('SELECT code FROM fitness_levels ORDER BY code')).map((r) => r.code)).toEqual(['advanced', 'beginner', 'intermediate']);
    const seed = migrations.find((m) => m.id === '0002_seed_profile_reference')!;
    for (const statement of seed.sql.split(';').map((s) => s.trim()).filter(Boolean)) await db.execute(statement);
    expect(await rows('SELECT code FROM goal_types')).toHaveLength(3);
    expect(await migrate(db, migrations)).toEqual([]);                    // already applied: nothing to do
  });
});
