// Shows its children only to a signed-in user; anyone else goes to /signin. An expired token (REQ-405: 7 days, fixed) ends
// the session with the "Session expired" notice, both when the page opens and, through a timer, when the 7 days run out
// while the user stays on the page.
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { expireSession, isTokenExpired, tokenExpiresAt, useAuthStore } from '../../state/authStore';

const MAX_TIMEOUT_MS = 2_147_483_647;   // setTimeout limit (~24.8 days); a session lasts 7 days

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const expired = !!token && isTokenExpired(token);

  useEffect(() => { if (expired) expireSession(); }, [expired]);

  useEffect(() => {
    if (!token || expired) return undefined;
    const exp = tokenExpiresAt(token);
    if (exp === null) return undefined;
    const id = setTimeout(() => {
      if (useAuthStore.getState().token === token && isTokenExpired(token)) expireSession();
    }, Math.min(Math.max(0, exp - Date.now()), MAX_TIMEOUT_MS));
    return () => clearTimeout(id);
  }, [token, expired]);

  if (!token || expired) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}
