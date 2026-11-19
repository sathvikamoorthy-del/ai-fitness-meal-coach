// authFetch (REQ-405, WI-046): Bearer token on every signed-in call; a 401 signs out locally, with the "Session expired"
// notice only when the session expired.
import { authFetch } from '../../src/app/authFetch';
import { setToken, useAuthStore } from '../../src/state/authStore';

const fakeToken = (exp: number) => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp }))}.sig`;
const validToken = () => fakeToken(Math.floor(Date.now() / 1000) + 3600);
const expiredToken = () => fakeToken(Math.floor(Date.now() / 1000) - 10);
const response = (status: number, body?: unknown) => ({ status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } });

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
  localStorage.clear();
});

describe('authFetch', () => {
  it('adds the Bearer token, keeps the caller\'s headers and returns the response', async () => {
    const token = validToken();
    setToken(token);
    fetchMock.mockResolvedValueOnce(response(200, { ok: true }));
    const res = await authFetch('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    expect(useAuthStore.getState().token).toBe(token);
  });

  it('sends no Authorization header when signed out', async () => {
    fetchMock.mockResolvedValueOnce(response(200, {}));
    await authFetch('/api/x');
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { headers: {} });
  });

  it('401 session-expired signs out with the notice', async () => {
    setToken(validToken());
    fetchMock.mockResolvedValueOnce(response(401, { error: 'session-expired' }));
    expect((await authFetch('/api/x')).status).toBe(401);
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: 'session-expired' });
  });

  it('401 with an expired token signs out with the notice, also without a JSON body', async () => {
    setToken(expiredToken());
    fetchMock.mockResolvedValueOnce(response(401));
    await authFetch('/api/x');
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: 'session-expired' });
  });

  it('401 session-ended signs out without the notice', async () => {
    setToken(validToken());
    fetchMock.mockResolvedValueOnce(response(401, { error: 'session-ended' }));
    await authFetch('/api/x');
    expect(useAuthStore.getState()).toMatchObject({ token: null, notice: null });
  });

  it('does not sign out a newer sign-in that happened while the request was running', async () => {
    setToken(validToken());
    const newer = validToken() + 'x';
    fetchMock.mockImplementationOnce(async () => { setToken(newer); return response(401, { error: 'session-ended' }); });
    await authFetch('/api/x');
    expect(useAuthStore.getState().token).toBe(newer);
  });

  it('leaves the token alone on other errors', async () => {
    const token = validToken();
    setToken(token);
    fetchMock.mockResolvedValueOnce(response(500, { error: 'internal-error' }));
    await authFetch('/api/x');
    expect(useAuthStore.getState().token).toBe(token);
  });
});
