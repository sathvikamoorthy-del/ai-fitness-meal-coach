// Plan view (REQ-410, WI-073): days in order, rest days, Active badge, Edit/Delete for manual plans, delete with confirmation.
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { PlanViewPage } from '../../../src/features/workouts/PlanViewPage';
import { setToken, useAuthStore } from '../../../src/state/authStore';

type Answer = { status: number; body?: unknown };
let fetchMock: jest.Mock;
let queues: Map<string, Answer[]>;
const answer = (key: string, ...answers: Answer[]) => queues.set(key, answers);
const calls = (key: string) => fetchMock.mock.calls.filter((c) => `${(c[1]?.method ?? 'GET')} ${c[0]}` === key);

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const plan = (source = 'manual', isActive = true) => ({
  id: 'p1', source, isActive, createdAt: '2026-11-24T10:00:00.000Z',
  days: Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    exercises: i === 0 ? [{ exerciseId: 'sq', name: 'Back squat', sets: 3, reps: 8 }, { exerciseId: 'bp', name: 'Bench press', sets: 3, reps: 10 }] : []
  }))
});

const renderAt = (route = '/workouts/p1') => renderApp(
  <Routes>
    <Route path="/workouts" element={<p>Workouts page</p>} />
    <Route path="/workouts/:id" element={<PlanViewPage />} />
  </Routes>,
  { route }
);

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
});

describe('PlanViewPage', () => {
  it('shows the label, the Active badge and Day 1 to Day 7 with exercises or Rest day', async () => {
    answer('GET /api/workout-plans/p1', { status: 200, body: { plan: plan() } });
    renderAt();
    expect(await screen.findByRole('heading', { name: 'My plan · 24 Nov 2026' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    const days = within(screen.getByRole('list', { name: 'Plan days' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(days).toEqual([
      'Day 1Back squat 3 × 8 · Bench press 3 × 10',
      'Day 2Rest day', 'Day 3Rest day', 'Day 4Rest day', 'Day 5Rest day', 'Day 6Rest day', 'Day 7Rest day'
    ]);
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/workouts/p1/edit');
  });

  it('an inactive AI plan has no badge and no Edit or Delete', async () => {
    answer('GET /api/workout-plans/p1', { status: 200, body: { plan: plan('ai', false) } });
    renderAt();
    expect(await screen.findByRole('heading', { name: 'AI plan · 24 Nov 2026' })).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('Delete asks first, then deletes and returns to Workouts', async () => {
    answer('GET /api/workout-plans/p1', { status: 200, body: { plan: plan() } });
    answer('DELETE /api/workout-plans/p1', { status: 204 });
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete this plan? This cannot be undone.')).toBeInTheDocument();
    expect(calls('DELETE /api/workout-plans/p1')).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Workouts page')).toBeInTheDocument();
    expect(calls('DELETE /api/workout-plans/p1')).toHaveLength(1);
  });

  it('says the plan was not found, or shows a generic message on errors', async () => {
    answer('GET /api/workout-plans/p1', { status: 404, body: { error: 'not-found' } });
    renderAt();
    expect(await screen.findByText('This plan was not found.')).toBeInTheDocument();
  });

  it('shows a generic message when loading fails', async () => {
    answer('GET /api/workout-plans/p1', { status: 500, body: { error: 'internal-error' } });
    renderAt();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.'));
  });
});
