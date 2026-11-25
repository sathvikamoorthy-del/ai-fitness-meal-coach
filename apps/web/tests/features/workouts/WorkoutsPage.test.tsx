// Workouts screen (REQ-410, WI-073): list, Active badge, Make active, delete with confirmation.
// Generate AI plan (REQ-409, WI-074): complete profile only, waiting text, failure message, AI plans deletable.
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { WorkoutsPage } from '../../../src/features/workouts/WorkoutsPage';
import { router } from '../../../src/app/router';
import { RequireAuth } from '../../../src/features/auth/RequireAuth';
import { setToken, useAuthStore } from '../../../src/state/authStore';

type Answer = { status: number; body?: unknown };
let fetchMock: jest.Mock;
let queues: Map<string, Answer[]>;
const answer = (key: string, ...answers: Answer[]) => queues.set(key, answers);
const calls = (key: string) => fetchMock.mock.calls.filter((c) => `${(c[1]?.method ?? 'GET')} ${c[0]}` === key);

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const NEWER = { id: 'p2', source: 'manual', isActive: true, createdAt: '2026-11-24T10:00:00.000Z' };
const OLDER = { id: 'p1', source: 'manual', isActive: false, createdAt: '2026-11-20T10:00:00.000Z' };
const AI = { id: 'p0', source: 'ai', isActive: false, createdAt: '2026-11-18T10:00:00.000Z' };
const FULL_PROFILE = { age: 30, sex: 'female', heightCm: 165, weightKg: 62, goal: 'lose', fitnessLevel: 'beginner', dailyCalorieTarget: 1650 };

const renderPage = () => renderApp(
  <Routes>
    <Route path="/workouts" element={<WorkoutsPage />} />
    <Route path="/workouts/new" element={<p>Editor page</p>} />
  </Routes>,
  { route: '/workouts' }
);
const row = (label: string) => screen.getByText(label).closest('li')! as HTMLElement;

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
  answer('GET /api/profile', { status: 200, body: { profile: FULL_PROFILE } });
});

describe('WorkoutsPage', () => {
  it('says "No workout plans yet." and offers Build my own plan', async () => {
    answer('GET /api/workout-plans', { status: 200, body: { plans: [] } });
    renderPage();
    expect(await screen.findByText('No workout plans yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Build my own plan' }));
    expect(screen.getByText('Editor page')).toBeInTheDocument();
  });

  it('lists plans newest first with their labels and marks the active one', async () => {
    answer('GET /api/workout-plans', { status: 200, body: { plans: [NEWER, OLDER, AI] } });
    renderPage();
    await screen.findByText('My plan · 24 Nov 2026');
    const labels = within(screen.getByRole('list', { name: 'Workout plans' })).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent);
    expect(labels).toEqual(['My plan · 24 Nov 2026', 'My plan · 20 Nov 2026', 'AI plan · 18 Nov 2026']);
    expect(within(row('My plan · 24 Nov 2026')).getByText('Active')).toBeInTheDocument();
    expect(within(row('My plan · 20 Nov 2026')).queryByText('Active')).not.toBeInTheDocument();
    expect(within(row('My plan · 24 Nov 2026')).queryByRole('button', { name: /Make .* active/ })).not.toBeInTheDocument();
    expect(within(row('My plan · 24 Nov 2026')).getByRole('link', { name: 'Open My plan · 24 Nov 2026' })).toHaveAttribute('href', '/workouts/p2');
    expect(within(row('My plan · 24 Nov 2026')).getByRole('link', { name: 'Edit My plan · 24 Nov 2026' })).toHaveAttribute('href', '/workouts/p2/edit');
  });

  it('offers Delete but not Edit for an AI plan', async () => {
    answer('GET /api/workout-plans', { status: 200, body: { plans: [AI] } }, { status: 200, body: { plans: [] } });
    answer('DELETE /api/workout-plans/p0', { status: 204 });
    renderPage();
    await screen.findByText('AI plan · 18 Nov 2026');
    expect(screen.getByRole('link', { name: 'Open AI plan · 18 Nov 2026' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete AI plan · 18 Nov 2026' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No workout plans yet.')).toBeInTheDocument();
    expect(calls('DELETE /api/workout-plans/p0')).toHaveLength(1);
  });

  describe('Generate AI plan', () => {
    const GENERATED = { id: 'p9', source: 'ai', isActive: true, createdAt: '2026-11-25T10:00:00.000Z' };

    it('shows "Creating your plan..." while waiting, then the new active AI plan', async () => {
      answer('GET /api/workout-plans', { status: 200, body: { plans: [NEWER] } }, { status: 200, body: { plans: [GENERATED, { ...NEWER, isActive: false }] } });
      let finish!: () => void;
      const original = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation((url: string, init: RequestInit = {}) => {
        if (url === '/api/workout-plans/generate') return new Promise((resolve) => { finish = () => resolve({ status: 201, json: async () => ({ plan: GENERATED }) }); });
        return original(url, init);
      });
      renderPage();
      await screen.findByText('My plan · 24 Nov 2026');
      fireEvent.click(screen.getByRole('button', { name: 'Generate AI plan' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Creating your plan...');
      expect(screen.getByRole('button', { name: 'Generate AI plan' })).toBeDisabled();
      finish();
      await waitFor(() => expect(screen.queryByText('Creating your plan...')).not.toBeInTheDocument());
      expect(await screen.findByText('AI plan · 25 Nov 2026')).toBeInTheDocument();
      expect(within(row('AI plan · 25 Nov 2026')).getByText('Active')).toBeInTheDocument();
      expect(within(row('My plan · 24 Nov 2026')).queryByText('Active')).not.toBeInTheDocument();
      expect(calls('POST /api/workout-plans/generate')).toHaveLength(1);
    });

    it('shows "Could not create a plan. Please try again." when the API could not make one', async () => {
      answer('GET /api/workout-plans', { status: 200, body: { plans: [] } });
      answer('POST /api/workout-plans/generate', { status: 502, body: { error: 'ai-failed' } });
      renderPage();
      await screen.findByText('No workout plans yet.');
      fireEvent.click(screen.getByRole('button', { name: 'Generate AI plan' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not create a plan. Please try again.');
      expect(screen.getByText('No workout plans yet.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate AI plan' })).toBeEnabled();   // can try again
    });

    it('with an incomplete profile says "Complete your profile first." with a link, and does not call the AI', async () => {
      answer('GET /api/profile', { status: 200, body: { profile: { ...FULL_PROFILE, fitnessLevel: null } } });
      answer('GET /api/workout-plans', { status: 200, body: { plans: [] } });
      renderPage();
      expect(await screen.findByText(/Complete your profile first\./)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to profile' })).toHaveAttribute('href', '/profile');
      expect(screen.getByRole('button', { name: 'Generate AI plan' })).toBeDisabled();
      expect(calls('POST /api/workout-plans/generate')).toHaveLength(0);
    });

    it('with no profile at all says the same', async () => {
      answer('GET /api/profile', { status: 200, body: { profile: null } });
      answer('GET /api/workout-plans', { status: 200, body: { plans: [] } });
      renderPage();
      expect(await screen.findByText(/Complete your profile first\./)).toBeInTheDocument();
    });

    it('when the API answers profile-incomplete, shows the profile message instead of the failure', async () => {
      answer('GET /api/workout-plans', { status: 200, body: { plans: [] } });
      answer('POST /api/workout-plans/generate', { status: 400, body: { error: 'profile-incomplete' } });
      renderPage();
      await screen.findByText('No workout plans yet.');
      fireEvent.click(screen.getByRole('button', { name: 'Generate AI plan' }));
      expect(await screen.findByText(/Complete your profile first\./)).toBeInTheDocument();
      expect(screen.queryByText('Could not create a plan. Please try again.')).not.toBeInTheDocument();
    });
  });

  it('Make active calls the API and refreshes the list', async () => {
    answer('GET /api/workout-plans', { status: 200, body: { plans: [NEWER, OLDER] } }, { status: 200, body: { plans: [{ ...NEWER, isActive: false }, { ...OLDER, isActive: true }] } });
    answer('POST /api/workout-plans/p1/activate', { status: 200, body: { plan: {} } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Make My plan · 20 Nov 2026 active' }));
    await waitFor(() => expect(within(row('My plan · 20 Nov 2026')).getByText('Active')).toBeInTheDocument());
    expect(calls('POST /api/workout-plans/p1/activate')).toHaveLength(1);
  });

  it('Delete asks first; Cancel keeps the plan, Delete removes it', async () => {
    answer('GET /api/workout-plans', { status: 200, body: { plans: [NEWER, OLDER] } }, { status: 200, body: { plans: [OLDER] } });
    answer('DELETE /api/workout-plans/p2', { status: 204 });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete My plan · 24 Nov 2026' }));
    expect(await screen.findByText('Delete this plan? This cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete this plan? This cannot be undone.')).not.toBeInTheDocument());
    expect(calls('DELETE /api/workout-plans/p2')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Delete My plan · 24 Nov 2026' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('My plan · 24 Nov 2026')).not.toBeInTheDocument());
    expect(calls('DELETE /api/workout-plans/p2')).toHaveLength(1);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();      // the active plan was deleted: none active
  });

  it('shows a generic message when loading fails', async () => {
    answer('GET /api/workout-plans', { status: 500, body: { error: 'internal-error' } });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('the workout routes are signed-in only', () => {
    for (const path of ['/workouts', '/workouts/new', '/workouts/:id', '/workouts/:id/edit']) {
      const route = router.find((r: any) => r.path === path) as any;
      expect(route.element.type).toBe(RequireAuth);
    }
  });
});
