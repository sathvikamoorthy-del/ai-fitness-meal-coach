import { clearToken, expireSession, isTokenExpired, setToken, signOut, tokenExpiresAt, useAuthStore } from '../../src/state/authStore';

const STORAGE_KEY = 'app-state:auth';
const fakeToken = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.sig`;

beforeEach(() => {
  useAuthStore.getState().reset();
  localStorage.clear();
});

describe('auth store', () => {
  it('starts signed out', () => {
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('persists the token to localStorage', () => {
    setToken('abc.def.ghi');
    expect(useAuthStore.getState().token).toBe('abc.def.ghi');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state).toEqual({ token: 'abc.def.ghi', notice: null });
  });

  it('restores the token after a reload', () => {
    setToken('abc.def.ghi');
    jest.isolateModules(() => {
      const reloaded = require('../../src/state/authStore');
      expect(reloaded.useAuthStore.getState().token).toBe('abc.def.ghi');
    });
  });

  it('clearToken removes the token, also from localStorage', () => {
    setToken('abc.def.ghi');
    clearToken();
    expect(useAuthStore.getState().token).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state).toEqual({ token: null, notice: null });
  });
});

describe('session notice and sign-out (REQ-405)', () => {
  let fetchMock: jest.Mock;
  beforeEach(() => { fetchMock = jest.fn(); (global as any).fetch = fetchMock; });

  it('expireSession drops the token and sets the session-expired notice, persisted', () => {
    setToken('abc.def.ghi');
    expireSession();
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: 'session-expired' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state).toEqual({ token: null, notice: 'session-expired' });
  });

  it('a successful sign-in (setToken) clears the notice; clearToken keeps it', () => {
    expireSession();
    clearToken();
    expect(useAuthStore.getState().notice).toBe('session-expired');
    setToken('abc.def.ghi');
    expect(useAuthStore.getState().notice).toBeNull();
  });

  it('a stored token from before the notice existed still loads, with no notice', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: { token: 'old.tok.en' } }));
    jest.isolateModules(() => {
      const reloaded = require('../../src/state/authStore');
      expect(reloaded.useAuthStore.getState()).toMatchObject({ token: 'old.tok.en', notice: null });
    });
  });

  it('signOut calls the API with the token and clears it, without a notice', async () => {
    fetchMock.mockResolvedValueOnce({ status: 204 });
    setToken('abc.def.ghi');
    await signOut();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signout', expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer abc.def.ghi' } }));
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: null });
  });

  it('signOut still signs out locally when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    setToken('abc.def.ghi');
    await signOut();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('signOut without a token does not call the API', async () => {
    await signOut();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('isTokenExpired', () => {
  const now = Date.UTC(2026, 10, 19);
  it('is false before exp and true at or after it', () => {
    expect(isTokenExpired(fakeToken({ exp: now / 1000 + 60 }), now)).toBe(false);
    expect(isTokenExpired(fakeToken({ exp: now / 1000 }), now)).toBe(true);
  });
  it('treats a token without exp or an unreadable token as expired', () => {
    expect(isTokenExpired(fakeToken({ sub: 'u1' }), now)).toBe(true);
    expect(isTokenExpired('not-a-token', now)).toBe(true);
    expect(isTokenExpired('a.%%%.c', now)).toBe(true);
  });
});

describe('tokenExpiresAt', () => {
  it('returns exp in milliseconds, or null when unreadable or missing', () => {
    expect(tokenExpiresAt(fakeToken({ exp: 1000 }))).toBe(1_000_000);
    expect(tokenExpiresAt(fakeToken({ sub: 'u1' }))).toBeNull();
    expect(tokenExpiresAt('not-a-token')).toBeNull();
  });
});
