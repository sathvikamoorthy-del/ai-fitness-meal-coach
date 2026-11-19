// fetch for signed-in API calls (REQ-405, WI-046): adds the Bearer token, and on a 401 signs the user out locally so the
// signed-in pages send them to /signin. An expired session (the token's exp has passed, or the API says session-expired)
// also sets the "Session expired" notice; any other 401 (signed out in another tab, session-ended) does not.
// The response is returned unchanged, so callers still see the status.
import { clearToken, expireSession, isTokenExpired, useAuthStore } from '../state/authStore';

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && token && useAuthStore.getState().token === token) {   // only if no newer sign-in happened
    let error: unknown;
    try { error = (await (typeof res.clone === 'function' ? res.clone() : res).json())?.error; } catch { /* no JSON body */ }
    if (error === 'session-expired' || isTokenExpired(token)) expireSession(); else clearToken();
  }
  return res;
}
