// Signed-in header with Sign out (REQ-405, WI-046).
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { SignInPage } from '../../../src/features/auth/SignInPage';
import { RequireAuth } from '../../../src/features/auth/RequireAuth';
import { SignedInLayout } from '../../../src/features/auth/SignedInLayout';
import { setToken, useAuthStore } from '../../../src/state/authStore';

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
});

const renderToday = () => renderApp(
  <Routes>
    <Route path="/signin" element={<SignInPage />} />
    <Route path="/today" element={<RequireAuth><SignedInLayout><p>Today page</p></SignedInLayout></RequireAuth>} />
    <Route path="/exercises" element={<RequireAuth><SignedInLayout><p>Exercises page</p></SignedInLayout></RequireAuth>} />
    <Route path="/workouts" element={<RequireAuth><SignedInLayout><p>Workouts page</p></SignedInLayout></RequireAuth>} />
  </Routes>,
  { route: '/today' }
);

describe('SignedInLayout', () => {
  it('shows the app name and a Sign out button above the page', () => {
    setToken(validToken());
    renderToday();
    expect(screen.getByRole('heading', { name: 'AI Fitness & Meal Coach' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByText('Today page')).toBeInTheDocument();
  });

  it('shows an Exercises link left of Sign out that opens /exercises (REQ-408)', () => {
    setToken(validToken());
    renderToday();
    const link = screen.getByRole('link', { name: 'Exercises' });
    expect(link).toHaveAttribute('href', '/exercises');
    expect(link.compareDocumentPosition(screen.getByRole('button', { name: 'Sign out' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(link);
    expect(screen.getByText('Exercises page')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a Workouts link left of Exercises that opens /workouts (REQ-410)', () => {
    setToken(validToken());
    renderToday();
    const workouts = screen.getByRole('link', { name: 'Workouts' });
    expect(workouts).toHaveAttribute('href', '/workouts');
    expect(workouts.compareDocumentPosition(screen.getByRole('link', { name: 'Exercises' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(workouts);
    expect(screen.getByText('Workouts page')).toBeInTheDocument();
  });

  it('Sign out ends the session on the server, clears the token and lands on /signin with no notice', async () => {
    const token = validToken();
    setToken(token);
    fetchMock.mockResolvedValueOnce({ status: 204 });
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signout', expect.objectContaining({ method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
    expect(useAuthStore.getState().token).toBeNull();
    expect(screen.queryByText(/Session expired/)).not.toBeInTheDocument();
    expect(screen.queryByText('Today page')).not.toBeInTheDocument();
  });

  it('Sign out still lands on /signin when the request fails', async () => {
    setToken(validToken());
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    renderToday();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().token).toBeNull());
  });
});
