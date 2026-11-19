import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { SignInPage } from '../../../src/features/auth/SignInPage';
import { RequireAuth } from '../../../src/features/auth/RequireAuth';
import { router } from '../../../src/app/router';
import { expireSession, useAuthStore } from '../../../src/state/authStore';

const fakeToken = (exp: number) => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp }))}.sig`;
const validToken = () => fakeToken(Math.floor(Date.now() / 1000) + 3600);

type Reply = { status: number; body?: unknown };
let fetchMock: jest.Mock;
const reply = (...replies: Reply[]) => {
  for (const r of replies) {
    fetchMock.mockResolvedValueOnce({ status: r.status, json: async () => { if (r.body === undefined) throw new Error('no body'); return r.body; } });
  }
};

function renderAt(route = '/signin') {
  return renderApp(
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/profile" element={<RequireAuth><p>Profile page</p></RequireAuth>} />
      <Route path="/today" element={<RequireAuth><p>Today page</p></RequireAuth>} />
    </Routes>,
    { route }
  );
}

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
});

describe('SignInPage', () => {
  it('shows the mock fields and hint and has no Forgot password link', () => {
    renderAt();
    expect(screen.getByRole('heading', { name: 'AI Fitness & Meal Coach' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('min. 8 characters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('after sign-up shows "Account created", clears the password and stays signed out', async () => {
    reply({ status: 201, body: { ok: true } });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click('Sign up');
    expect(await screen.findByText('Account created')).toBeInTheDocument();
    expect(screen.getByText('Sign in with the same email and password.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'ann@example.com', password: 'secret-pass' }) }));
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(useAuthStore.getState().token).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('refuses a short password before calling the API', async () => {
    renderAt();
    fill('ann@example.com', 'seven77');
    click('Sign up');
    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['signup', 'Sign up', 409, 'email-taken', 'An account with this email already exists.'],
    ['signup', 'Sign up', 400, 'invalid-email', 'Enter a valid email address.'],
    ['signup', 'Sign up', 400, 'password-too-short', 'Password must be at least 8 characters.'],
    ['signin', 'Sign in', 401, 'invalid-credentials', 'Email or password is incorrect.'],
    ['signin', 'Sign in', 400, 'invalid-email', 'Enter a valid email address.'],
    ['signin', 'Sign in', 500, 'internal-error', 'Something went wrong. Please try again.']
  ])('%s answered %i %s shows its message', async (_kind, button, status, error, message) => {
    reply({ status, body: { error } });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('shows the fallback message when the request fails or has no JSON body', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    reply({ status: 502 });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click('Sign in');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    click('Sign in');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('signs in, stores the token and goes to Profile when the profile is not complete', async () => {
    const token = validToken();
    reply({ status: 200, body: { token, profileComplete: false } });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click('Sign in');
    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe(token);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signin', expect.anything());
  });

  it('signs in and goes to Today when the profile is complete', async () => {
    reply({ status: 200, body: { token: validToken(), profileComplete: true } });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click('Sign in');
    expect(await screen.findByText('Today page')).toBeInTheDocument();
  });
});

describe('RequireAuth', () => {
  it('sends a signed-out visitor to sign-in', () => {
    renderAt('/today');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Today page')).not.toBeInTheDocument();
  });

  it('lets a user with a valid token in', () => {
    useAuthStore.setState({ token: validToken() });
    renderAt('/today');
    expect(screen.getByText('Today page')).toBeInTheDocument();
  });

  it('clears an expired token and sends the user to sign-in', async () => {
    useAuthStore.setState({ token: fakeToken(Math.floor(Date.now() / 1000) - 10) });
    renderAt('/profile');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().token).toBeNull());
  });
});

describe('Session expired notice (REQ-405)', () => {
  const EXPIRED = 'Session expired, please sign in again.';

  it('shows the notice on the sign-in screen after the session expired', () => {
    expireSession();
    renderAt();
    expect(screen.getByText(EXPIRED)).toBeInTheDocument();
  });

  it('does not show the notice after a plain visit or sign-out', () => {
    renderAt();
    expect(screen.queryByText(EXPIRED)).not.toBeInTheDocument();
  });

  it('a successful sign-in clears the notice', async () => {
    expireSession();
    reply({ status: 200, body: { token: validToken(), profileComplete: true } });
    renderAt();
    fill('ann@example.com', 'secret-pass');
    click('Sign in');
    expect(await screen.findByText('Today page')).toBeInTheDocument();
    expect(useAuthStore.getState().notice).toBeNull();
  });

  it('opening a signed-in page with an expired token lands on sign-in with the notice', async () => {
    useAuthStore.setState({ token: fakeToken(Math.floor(Date.now() / 1000) - 10) });
    renderAt('/today');
    expect(await screen.findByText(EXPIRED)).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: 'session-expired' });
  });

  it('when the 7 days end while the user stays on the page, the timer sends them to sign-in with the notice', () => {
    jest.useFakeTimers();
    try {
      useAuthStore.setState({ token: fakeToken(Math.floor(Date.now() / 1000) + 60) });
      renderAt('/today');
      expect(screen.getByText('Today page')).toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(61_000); });
      expect(screen.getByText(EXPIRED)).toBeInTheDocument();
      expect(screen.queryByText('Today page')).not.toBeInTheDocument();
      expect(useAuthStore.getState().notice).toBe('session-expired');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('router glue', () => {
  it('registers /, /signin, /profile and /today', () => {
    expect(router.map((r: any) => r.path)).toEqual(expect.arrayContaining(['/', '/signin', '/profile', '/today']));
  });

  it('sends / to the sign-in screen', () => {
    const home = router.find((r: any) => r.path === '/') as any;
    renderApp(<Routes><Route path="/" element={home.element} /><Route path="/signin" element={<SignInPage />} /></Routes>, { route: '/' });
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument();
  });
});
