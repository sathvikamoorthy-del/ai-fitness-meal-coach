// Plan editor (REQ-410, WI-073): Day 1-7, add and remove exercises, the rules, save new (POST) and edit (PUT).
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { PlanEditorPage } from '../../../src/features/workouts/PlanEditorPage';
import { setToken, useAuthStore } from '../../../src/state/authStore';

type Answer = { status: number; body?: unknown };
let fetchMock: jest.Mock;
let queues: Map<string, Answer[]>;
const answer = (key: string, ...answers: Answer[]) => queues.set(key, answers);
const calls = (key: string) => fetchMock.mock.calls.filter((c) => `${(c[1]?.method ?? 'GET')} ${c[0]}` === key);
const sentBody = (key: string) => JSON.parse(calls(key)[0][1].body);

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const LIBRARY = [{ id: 'sq', name: 'Back squat' }, { id: 'bp', name: 'Bench press' }, { id: 'dl', name: 'Deadlift' }, ...Array.from({ length: 16 }, (_, i) => ({ id: `x${i}`, name: `Extra ${String(i).padStart(2, '0')}` }))];
const restDays = () => Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, exercises: [] as any[] }));

const renderAt = (route: string) => renderApp(
  <Routes>
    <Route path="/workouts" element={<p>Workouts page</p>} />
    <Route path="/workouts/new" element={<PlanEditorPage />} />
    <Route path="/workouts/:id/edit" element={<PlanEditorPage />} />
  </Routes>,
  { route }
);
const day = (n: number) => screen.getByRole('region', { name: `Day ${n}` });
const add = (n: number, exerciseId: string) => {
  fireEvent.change(screen.getByLabelText(`Exercise for Day ${n}`), { target: { value: exerciseId } });
  fireEvent.click(screen.getByRole('button', { name: `Add to Day ${n}` }));
};
const setValue = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save plan' }));

beforeEach(() => {
  queues = new Map();
  fetchMock = jest.fn(async (url: string, init: RequestInit = {}) => {
    const queue = queues.get(`${init.method ?? 'GET'} ${url}`);
    const next = queue && (queue.length > 1 ? queue.shift() : queue[0]);
    if (!next) throw new Error(`no answer for ${init.method ?? 'GET'} ${url}`);
    return { status: next.status, json: async () => { if (next.body === undefined) throw new Error('no body'); return next.body; } };
  });
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
  setToken(validToken());
  answer('GET /api/exercises', { status: 200, body: { exercises: LIBRARY } });
});

describe('PlanEditorPage: new plan', () => {
  it('shows Day 1 to Day 7, each a rest day, with the library A-Z in the picker', async () => {
    renderAt('/workouts/new');
    expect(await screen.findByRole('heading', { name: 'Build my own plan' })).toBeInTheDocument();
    for (let n = 1; n <= 7; n++) expect(within(day(n)).getByText('Rest day')).toBeInTheDocument();
    const options = within(screen.getByLabelText('Exercise for Day 1')).getAllByRole('option').map((o) => o.textContent);
    expect(options.slice(0, 4)).toEqual(['Choose an exercise', 'Back squat', 'Bench press', 'Deadlift']);
  });

  it('adds exercises (starting at 3 x 10), keeps their order, and removes them', async () => {
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    add(1, 'sq');
    add(1, 'bp');
    expect(within(day(1)).queryByText('Rest day')).not.toBeInTheDocument();
    expect(within(day(1)).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual(['1. Back squat', '2. Bench press']);
    expect(screen.getByLabelText('Day 1 Back squat sets')).toHaveValue(3);
    expect(screen.getByLabelText('Day 1 Back squat reps')).toHaveValue(10);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Back squat from Day 1' }));
    expect(within(day(1)).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual(['1. Bench press']);
  });

  it('refuses adding nothing, a duplicate in the same day, or a 16th exercise; the same exercise on another day is fine', async () => {
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Day 1' }));
    expect(within(day(1)).getByRole('alert')).toHaveTextContent('Day 1: Choose an exercise from the library.');
    add(1, 'sq');
    add(1, 'sq');
    expect(within(day(1)).getByRole('alert')).toHaveTextContent('Day 1: Back squat is already in this day.');
    add(2, 'sq');
    expect(within(day(2)).queryByRole('alert')).not.toBeInTheDocument();
    for (let i = 0; i < 15; i++) add(3, `x${i}`);
    add(3, 'x15');
    expect(within(day(3)).getByRole('alert')).toHaveTextContent('Day 3: A day can have at most 15 exercises.');
    expect(within(day(3)).getAllByRole('listitem')).toHaveLength(15);
  });

  it('refuses saving an empty plan or bad sets/reps, showing every message, and sends nothing', async () => {
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    save();
    expect(await screen.findByText('Add at least one exercise to the plan.')).toBeInTheDocument();
    add(1, 'sq');
    add(4, 'dl');
    setValue('Day 1 Back squat sets', '11');
    setValue('Day 4 Deadlift reps', '0');
    save();
    const problems = within(screen.getByRole('alert', { name: 'Plan problems' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(problems).toEqual(['Day 1: Sets must be a whole number from 1 to 10.', 'Day 4: Reps must be a whole number from 1 to 100.']);
    setValue('Day 1 Back squat sets', '');
    save();
    expect(screen.getByText('Day 1: Sets must be a whole number from 1 to 10.')).toBeInTheDocument();
    expect(calls('POST /api/workout-plans')).toHaveLength(0);
  });

  it('saves a new plan with POST in day and add order, then returns to Workouts', async () => {
    answer('POST /api/workout-plans', { status: 201, body: { plan: { id: 'p9' } } });
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    add(1, 'sq');
    add(1, 'bp');
    setValue('Day 1 Back squat reps', '8');
    add(3, 'dl');
    setValue('Day 3 Deadlift sets', '5');
    setValue('Day 3 Deadlift reps', '5');
    save();
    expect(await screen.findByText('Workouts page')).toBeInTheDocument();
    const expected = restDays();
    expected[0].exercises = [{ exerciseId: 'sq', sets: 3, reps: 8 }, { exerciseId: 'bp', sets: 3, reps: 10 }];
    expected[2].exercises = [{ exerciseId: 'dl', sets: 5, reps: 5 }];
    expect(sentBody('POST /api/workout-plans')).toEqual({ days: expected });
  });

  it('shows the API messages when the API refuses the plan', async () => {
    answer('POST /api/workout-plans', { status: 400, body: { error: 'invalid-plan', errors: ['Day 1: Choose an exercise from the library.'] } });
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    add(1, 'sq');
    save();
    expect(await screen.findByText('Day 1: Choose an exercise from the library.')).toBeInTheDocument();
    expect(screen.queryByText('Workouts page')).not.toBeInTheDocument();
  });

  it('Cancel returns to Workouts without saving', async () => {
    renderAt('/workouts/new');
    await screen.findByRole('heading', { name: 'Build my own plan' });
    add(1, 'sq');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Workouts page')).toBeInTheDocument();
    expect(calls('POST /api/workout-plans')).toHaveLength(0);
  });
});

describe('PlanEditorPage: editing', () => {
  const saved = () => {
    const days = restDays();
    days[0].exercises = [{ exerciseId: 'sq', name: 'Back squat', sets: 3, reps: 8 }];
    days[5].exercises = [{ exerciseId: 'bp', name: 'Bench press', sets: 4, reps: 6 }];
    return { id: 'p1', source: 'manual', isActive: true, createdAt: '2026-11-24T10:00:00.000Z', days };
  };

  it('loads the saved plan and saves changes with PUT', async () => {
    answer('GET /api/workout-plans/p1', { status: 200, body: { plan: saved() } });
    answer('PUT /api/workout-plans/p1', { status: 200, body: { plan: saved() } });
    renderAt('/workouts/p1/edit');
    expect(await screen.findByRole('heading', { name: 'Edit plan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Day 6 Bench press sets')).toHaveValue(4);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Back squat from Day 1' }));
    add(2, 'dl');
    save();
    expect(await screen.findByText('Workouts page')).toBeInTheDocument();
    const body = sentBody('PUT /api/workout-plans/p1');
    expect(body.days[0].exercises).toEqual([]);
    expect(body.days[1].exercises).toEqual([{ exerciseId: 'dl', sets: 3, reps: 10 }]);
    expect(body.days[5].exercises).toEqual([{ exerciseId: 'bp', sets: 4, reps: 6 }]);
  });

  it('an AI plan or a missing plan cannot be edited', async () => {
    answer('GET /api/workout-plans/p0', { status: 200, body: { plan: { ...saved(), id: 'p0', source: 'ai' } } });
    renderAt('/workouts/p0/edit');
    expect(await screen.findByText('This plan cannot be edited.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save plan' })).not.toBeInTheDocument();
  });

  it('a plan that is not found cannot be edited', async () => {
    answer('GET /api/workout-plans/nope', { status: 404, body: { error: 'not-found' } });
    renderAt('/workouts/nope/edit');
    await waitFor(() => expect(screen.getByText('This plan cannot be edited.')).toBeInTheDocument());
  });
});
