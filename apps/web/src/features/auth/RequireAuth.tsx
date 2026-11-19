// Shows its children only to a signed-in user; anyone else (no token, or an expired one, which is then cleared) goes to /signin.
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { clearToken, isTokenExpired, useAuthStore } from '../../state/authStore';

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const expired = !!token && isTokenExpired(token);
  useEffect(() => { if (expired) clearToken(); }, [expired]);
  if (!token || expired) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}
