// The signed-in user's access token, kept in localStorage (WI-045) so a reload stays signed in until the token expires.
// The token's exp equals the server session's expiry (7 days from sign-in, fixed). `notice` tells the sign-in screen why the
// user landed there: 'session-expired' after the 7 days (REQ-405); it is persisted with the token so it survives the redirect
// and a reload, and a successful sign-in clears it. A plain sign-out leaves no notice.
import { createAppStore } from './createStore';
import { authFetch } from '../app/authFetch';

export type AuthNotice = 'session-expired' | null;
export interface AuthState { token: string | null; notice: AuthNotice }

export const useAuthStore = createAppStore<AuthState>({ token: null, notice: null }, { persistKey: 'auth' });

/** A successful sign-in: store the token and drop any old notice. */
export const setToken = (token: string) => useAuthStore.setState({ token, notice: null });
/** Signed out (or the session ended elsewhere): drop the token, keep the notice as it is. */
export const clearToken = () => useAuthStore.setState({ token: null });
/** The session passed its 7 days: drop the token and tell the sign-in screen. */
export const expireSession = () => useAuthStore.setState({ token: null, notice: 'session-expired' });

/**
 * Ends the current session on the server (POST /api/auth/signout) and always signs out locally, also when the request
 * fails (offline, 401): the user asked to leave, so the token is dropped either way.
 */
export async function signOut(): Promise<void> {
  try {
    if (useAuthStore.getState().token) await authFetch('/api/auth/signout', { method: 'POST' });
  } catch {
    /* offline or server error: still signed out locally */
  } finally {
    clearToken();
  }
}

function readPayload(token: string): any {
  return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
}

/** The token's exp in milliseconds, or null when the token cannot be read or has no exp. */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = readPayload(token);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the token's exp is in the past or the token cannot be read. The server still verifies every token. */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  const exp = tokenExpiresAt(token);
  return exp === null || exp <= now;
}
