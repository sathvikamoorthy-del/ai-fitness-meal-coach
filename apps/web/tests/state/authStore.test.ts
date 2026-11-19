import { clearToken, isTokenExpired, setToken, useAuthStore } from '../../src/state/authStore';

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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state).toEqual({ token: 'abc.def.ghi' });
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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state).toEqual({ token: null });
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
