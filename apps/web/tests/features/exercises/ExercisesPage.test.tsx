// Exercises screen (REQ-408, WI-072).
import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { ExercisesPage } from '../../../src/features/exercises/ExercisesPage';
import { SignInPage } from '../../../src/features/auth/SignInPage';
import { RequireAuth } from '../../../src/features/auth/RequireAuth';
import { router } from '../../../src/app/router';
import { setToken, useAuthStore } from '../../../src/state/authStore';

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const EXERCISES = ['Back squat', 'Bench press', 'Deadlift', 'Goblet squat', 'Push-up'].map((name, i) => ({ id: `id${i}`, name }));

let fetchMock: jest.Mock;
const reply = (status: number, body?: unknown) =>
  fetchMock.mockResolvedValueOnce({ status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } });

const renderPage = () => renderApp(
  <Routes>
    <Route path="/signin" element={<SignInPage />} />
    <Route path="/exercises" element={<RequireAuth><ExercisesPage /></RequireAuth>} />
  </Routes>,
  { route: '/exercises' }
);
const shownNames = () => within(screen.getByRole('list', { name: 'Exercises' })).getAllByRole('listitem').map((li) => li.textContent);
const search = (value: string) => fireEvent.change(screen.getByLabelText('Search'), { target: { value } });

beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
  setToken(validToken());
});

describe('ExercisesPage', () => {
  it('loads the library through the API and lists it in order', async () => {
    reply(200, { exercises: EXERCISES });
    renderPage();
    expect(await screen.findByText('Deadlift')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exercises' })).toBeInTheDocument();
    expect(shownNames()).toEqual(['Back squat', 'Bench press', 'Deadlift', 'Goblet squat', 'Push-up']);
    expect(fetchMock).toHaveBeenCalledWith('/api/exercises', expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }));
  });

  it.each(['squat', 'SQUAT', ' squat '])('filters as you type: %j finds the squats', async (typed) => {
    reply(200, { exercises: EXERCISES });
    renderPage();
    await screen.findByText('Deadlift');
    search(typed);
    expect(shownNames()).toEqual(['Back squat', 'Goblet squat']);
    expect(fetchMock).toHaveBeenCalledTimes(1);                // filtering needs no extra request
  });

  it('clearing the search shows the full list again', async () => {
    reply(200, { exercises: EXERCISES });
    renderPage();
    await screen.findByText('Deadlift');
    search('squat');
    search('');
    expect(shownNames()).toHaveLength(5);
  });

  it('shows the no-match message with the typed text', async () => {
    reply(200, { exercises: EXERCISES });
    renderPage();
    await screen.findByText('Deadlift');
    search(' zumba ');
    expect(screen.getByText('No exercises match "zumba"')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Exercises' })).not.toBeInTheDocument();
  });

  it('shows a generic message when loading fails', async () => {
    reply(500, { error: 'internal-error' });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('sends a signed-out visitor to sign-in', () => {
    useAuthStore.getState().reset();
    renderPage();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is the /exercises route of the app, inside RequireAuth', () => {
    const route = router.find((r: any) => r.path === '/exercises') as any;
    expect(route.element.type).toBe(RequireAuth);
    expect(route.element.props.children.props.children.type).toBe(ExercisesPage);
  });
});
