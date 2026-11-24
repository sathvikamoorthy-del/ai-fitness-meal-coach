// Workout plan routes (REQ-410, WI-073).
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { Express } from 'express';
import { createApp } from '../../src/http/app';
import { authenticate } from '../../src/auth/authMiddleware';
import { sessionCheck } from '../../src/auth/sessionCheck';
import { signSessionToken } from '../../src/auth/sessionToken';
import { workoutPlansRoute } from '../../src/routes/workoutPlans';
import { routes } from '../../src/glue/routes';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { ormProvider } from '../../src/db/orm';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));

describe('workout plan routes', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  let ex: Record<string, string>;   // exercise name -> id, from the seed
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
  const call = async (method: string, url: string, token?: string, body?: unknown) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const days = (perDay: Record<number, [string, number, number][]> = {}) =>
    ({ days: Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, exercises: (perDay[i + 1] ?? []).map(([name, sets, reps]) => ({ exerciseId: ex[name], sets, reps })) })) });
  const simple = () => days({ 1: [['Back squat', 3, 8], ['Bench press', 3, 10]], 3: [['Deadlift', 5, 5]] });
  const pause = () => new Promise((r) => setTimeout(r, 5));   // created_at has millisecond resolution
  const activeIds = async (userId: string) => (await rows('SELECT id FROM workout_plans WHERE user_id = ? AND is_active = 1', [userId])).map((r) => r.id);

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    ex = Object.fromEntries((await rows('SELECT id, name FROM exercises')).map((r) => [String(r.name), String(r.id)]));
    const app = createApp({
      routes: [workoutPlansRoute],
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

  it('is registered in the route glue, and the seed provides both plan sources', async () => {
    expect(routes.map((r: any) => r.id)).toContain('workout-plans');
    expect((await rows('SELECT code, label FROM plan_sources ORDER BY code')).map((r) => [r.code, r.label])).toEqual([['ai', 'AI'], ['manual', 'Manual']]);
  });

  it('needs a signed-in user', async () => {
    for (const [method, url] of [['GET', '/workout-plans'], ['POST', '/workout-plans'], ['GET', '/workout-plans/x'], ['PUT', '/workout-plans/x'], ['DELETE', '/workout-plans/x'], ['POST', '/workout-plans/x/activate']]) {
      expect(await call(method, url, undefined, method === 'GET' || method === 'DELETE' ? undefined : {})).toEqual({ status: 401, body: { error: 'unauthorized' } });
    }
  });

  it('creates a manual plan that is active, and shows all seven days in order with names', async () => {
    const { token } = await newUser();
    expect(await call('GET', '/workout-plans', token)).toEqual({ status: 200, body: { plans: [] } });
    const res = await call('POST', '/workout-plans', token, simple());
    expect(res.status).toBe(201);
    const p = res.body.plan;
    expect(p).toMatchObject({ source: 'manual', isActive: true });
    expect(p.days.map((d: any) => d.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(p.days[0].exercises).toEqual([
      { exerciseId: ex['Back squat'], name: 'Back squat', sets: 3, reps: 8 },
      { exerciseId: ex['Bench press'], name: 'Bench press', sets: 3, reps: 10 }
    ]);
    expect(p.days[1].exercises).toEqual([]);                         // rest day
    expect(p.days[2].exercises.map((e: any) => e.name)).toEqual(['Deadlift']);
    expect((await call('GET', `/workout-plans/${p.id}`, token)).body.plan).toEqual(p);
  });

  it('a new plan becomes active and the previous one does not stay active; the list is newest first', async () => {
    const { userId, token } = await newUser();
    const first = (await call('POST', '/workout-plans', token, simple())).body.plan;
    await pause();
    const second = (await call('POST', '/workout-plans', token, days({ 2: [['Plank', 3, 30]] }))).body.plan;
    expect(await activeIds(userId)).toEqual([second.id]);
    const list = (await call('GET', '/workout-plans', token)).body.plans;
    expect(list.map((p: any) => [p.id, p.isActive, p.source])).toEqual([[second.id, true, 'manual'], [first.id, false, 'manual']]);
    expect(list[0].createdAt >= list[1].createdAt).toBe(true);
  });

  it('makes any plan active, one at a time', async () => {
    const { userId, token } = await newUser();
    const first = (await call('POST', '/workout-plans', token, simple())).body.plan;
    await call('POST', '/workout-plans', token, simple());
    const res = await call('POST', `/workout-plans/${first.id}/activate`, token);
    expect(res.status).toBe(200);
    expect(res.body.plan.isActive).toBe(true);
    expect(await activeIds(userId)).toEqual([first.id]);
    expect((await call('POST', `/workout-plans/${first.id}/activate`, token)).status).toBe(200);   // already active: no change
    expect(await activeIds(userId)).toEqual([first.id]);
  });

  it('editing replaces the days and keeps the active status', async () => {
    const { userId, token } = await newUser();
    const first = (await call('POST', '/workout-plans', token, simple())).body.plan;
    await call('POST', '/workout-plans', token, simple());                                     // first is now inactive
    const edited = await call('PUT', `/workout-plans/${first.id}`, token, days({ 7: [['Push-up', 4, 12], ['Plank', 3, 45]] }));
    expect(edited.status).toBe(200);
    expect(edited.body.plan.isActive).toBe(false);
    expect(edited.body.plan.days[0].exercises).toEqual([]);
    expect(edited.body.plan.days[6].exercises.map((e: any) => `${e.name} ${e.sets}x${e.reps}`)).toEqual(['Push-up 4x12', 'Plank 3x45']);
    expect(await rows('SELECT COUNT(*) AS n FROM workout_plan_days WHERE workout_plan_id = ?', [first.id])).toEqual([expect.objectContaining({ n: 7 })]);
    expect(await activeIds(userId)).not.toContain(first.id);
  });

  it('deleting the active plan leaves no active plan and removes its days and exercises', async () => {
    const { userId, token } = await newUser();
    const p = (await call('POST', '/workout-plans', token, simple())).body.plan;
    expect(await call('DELETE', `/workout-plans/${p.id}`, token)).toEqual({ status: 204, body: null });
    expect(await activeIds(userId)).toEqual([]);
    expect(await rows('SELECT id FROM workout_plan_days WHERE workout_plan_id = ?', [p.id])).toHaveLength(0);
    expect(await call('GET', `/workout-plans/${p.id}`, token)).toEqual({ status: 404, body: { error: 'not-found' } });
  });

  it('another user\'s plan, or a missing one, answers 404', async () => {
    const owner = await newUser();
    const other = await newUser();
    const p = (await call('POST', '/workout-plans', owner.token, simple())).body.plan;
    for (const [method, url, body] of [['GET', `/workout-plans/${p.id}`], ['PUT', `/workout-plans/${p.id}`, simple()], ['DELETE', `/workout-plans/${p.id}`], ['POST', `/workout-plans/${p.id}/activate`], ['GET', '/workout-plans/nope']] as [string, string, unknown?][]) {
      expect(await call(method, url, other.token, body)).toEqual({ status: 404, body: { error: 'not-found' } });
    }
    expect((await call('GET', '/workout-plans', other.token)).body.plans).toEqual([]);
  });

  it('an AI plan can be opened and made active but not edited or deleted (403)', async () => {
    const { userId, token } = await newUser();
    const aiId = crypto.randomUUID();
    await db.execute({ sql: "INSERT INTO workout_plans (id, user_id, source, is_active) VALUES (?, ?, 'ai', 0)", args: [aiId, userId] });
    expect((await call('GET', `/workout-plans/${aiId}`, token)).body.plan).toMatchObject({ source: 'ai', isActive: false });
    expect(await call('PUT', `/workout-plans/${aiId}`, token, simple())).toEqual({ status: 403, body: { error: 'not-editable' } });
    expect(await call('DELETE', `/workout-plans/${aiId}`, token)).toEqual({ status: 403, body: { error: 'not-editable' } });
    expect((await call('POST', `/workout-plans/${aiId}/activate`, token)).body.plan.isActive).toBe(true);
  });

  it('invalid input answers 400 with every message and writes nothing', async () => {
    const { userId, token } = await newUser();
    const bad = days({ 1: [['Back squat', 11, 8], ['Back squat', 3, 8]], 2: [['Bench press', 3, 0]] });
    expect(await call('POST', '/workout-plans', token, bad)).toEqual({
      status: 400,
      body: { error: 'invalid-plan', errors: ['Day 1: Sets must be a whole number from 1 to 10.', 'Day 1: Back squat is already in this day.', 'Day 2: Reps must be a whole number from 1 to 100.'] }
    });
    expect(await call('POST', '/workout-plans', token, days())).toEqual({ status: 400, body: { error: 'invalid-plan', errors: ['Add at least one exercise to the plan.'] } });
    expect(await rows('SELECT id FROM workout_plans WHERE user_id = ?', [userId])).toHaveLength(0);
    const p = (await call('POST', '/workout-plans', token, simple())).body.plan;
    expect((await call('PUT', `/workout-plans/${p.id}`, token, days())).status).toBe(400);
    expect((await call('GET', `/workout-plans/${p.id}`, token)).body.plan.days[0].exercises).toHaveLength(2);   // unchanged
  });
});
