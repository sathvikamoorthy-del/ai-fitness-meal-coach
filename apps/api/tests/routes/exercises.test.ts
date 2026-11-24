// Exercise library (REQ-408, WI-072): the reviewed seed and GET /exercises.
import fs from 'fs';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { Express } from 'express';
import { createApp } from '../../src/http/app';
import { authenticate } from '../../src/auth/authMiddleware';
import { sessionCheck } from '../../src/auth/sessionCheck';
import { signSessionToken } from '../../src/auth/sessionToken';
import { exercisesRoute } from '../../src/routes/exercises';
import { routes } from '../../src/glue/routes';
import { createDb, Db } from '../../src/db/client';
import { migrate } from '../../src/db/migrate';
import { ormProvider } from '../../src/db/orm';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const migrationsDir = path.join(__dirname, '../../src/db/migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => ({ id: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, f), 'utf8') }));

// The list the product owner reviewed in WI-072 (impl.md), in screen order.
const REVIEWED = [
  'Back squat', 'Bench press', 'Bicep curl', 'Bicycle crunch', 'Bodyweight squat', 'Burpee', 'Calf raise', 'Chest fly',
  'Chin-up', 'Deadlift', 'Dumbbell row', 'Dumbbell shoulder press', 'Face pull', 'Front squat', 'Glute bridge',
  'Goblet squat', 'Hammer curl', 'Hip thrust', 'Incline bench press', 'Jumping jack', 'Kettlebell swing', 'Lat pulldown',
  'Lateral raise', 'Leg curl', 'Leg extension', 'Leg press', 'Lunge', 'Mountain climber', 'Overhead press', 'Plank',
  'Pull-up', 'Push-up', 'Romanian deadlift', 'Russian twist', 'Seated cable row', 'Side plank', 'Step-up', 'Tricep dip',
  'Tricep pushdown', 'Walking lunge'
];

describe('exercises route', () => {
  let db: Db;
  let server: http.Server;
  let base: string;
  let token: string;
  const previousSecret = process.env.JWT_SECRET;

  const get = async (auth?: string) => {
    const res = await fetch(`${base}/exercises`, { headers: auth ? { authorization: `Bearer ${auth}` } : {} });
    return { status: res.status, body: await res.json() as any };
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = SECRET;
    db = createDb({ url: ':memory:' });
    await migrate(db, migrations);
    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.execute({ sql: 'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', args: [userId, 'ex@example.com', 'x'] });
    await db.execute({ sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', args: [sessionId, userId, expiresAt.toISOString()] });
    token = await signSessionToken({ userId, sessionId, expiresAt });
    const app = createApp({
      routes: [exercisesRoute],
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
    expect(routes.map((r: any) => r.id)).toContain('exercises');
  });

  it('needs a signed-in user', async () => {
    expect(await get()).toEqual({ status: 401, body: { error: 'unauthorized' } });
  });

  it('lists the 40 reviewed exercises, A-Z ignoring letter case', async () => {
    const res = await get(token);
    expect(res.status).toBe(200);
    expect(res.body.exercises.map((e: any) => e.name)).toEqual(REVIEWED);
    const sorted = [...REVIEWED].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    expect(REVIEWED).toEqual(sorted);
  });

  it('gives every exercise a unique UUID that is fixed in the seed file', async () => {
    const { exercises } = (await get(token)).body;
    const ids = exercises.map((e: any) => e.id);
    expect(new Set(ids).size).toBe(40);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const seed = migrations.find((m) => m.id === '0004_seed_exercises')!.sql;
    for (const e of exercises) expect(seed).toContain(`('${e.id}', '${e.name}')`);
  });

  it('the seed is safe to run again and names stay unique ignoring case', async () => {
    const seed = migrations.find((m) => m.id === '0004_seed_exercises')!.sql;
    await db.execute(seed.split(';')[0]);
    expect(((await get(token)).body.exercises)).toHaveLength(40);
    await expect(db.execute({ sql: 'INSERT INTO exercises (id, name) VALUES (?, ?)', args: [crypto.randomUUID(), 'BACK SQUAT'] })).rejects.toThrow(/UNIQUE/);
    expect(await migrate(db, migrations)).toEqual([]);
  });

  it('is read-only: there are no write routes', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await fetch(`${base}/exercises`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: method === 'DELETE' ? undefined : '{}' });
      expect(res.status).toBe(404);
    }
  });
});
