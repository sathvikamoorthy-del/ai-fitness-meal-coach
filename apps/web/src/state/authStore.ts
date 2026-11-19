// The signed-in user's access token, kept in localStorage (WI-045) so a reload stays signed in until the token expires.
// The token's exp equals the server session's expiry (7 days from sign-in). Sign-out is REQ-405 work; clearToken is for a
// 401 from the API or an expired token.
import { createAppStore } from './createStore';

export interface AuthState { token: string | null }

export const useAuthStore = createAppStore<AuthState>({ token: null }, { persistKey: 'auth' });

export const setToken = (token: string) => useAuthStore.setState({ token });
export const clearToken = () => useAuthStore.setState({ token: null });

/** True when the token's exp is in the past or the token cannot be read. The server still verifies every token. */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= now;
  } catch {
    return true;
  }
}
