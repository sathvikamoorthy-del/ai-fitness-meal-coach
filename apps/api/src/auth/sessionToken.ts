// Access token tied to a row of the sessions table: sub = user id, sid = session id, exp = the session's expires_at, so the
// token and the session end at the same moment. Signed like jwt.ts (HS256, same secret rules through secretKey); verifyToken
// and the authenticate middleware read it unchanged and expose the session id as req.auth.claims.sid.
import { SignJWT } from 'jose';
import { secretKey } from './jwt';

export const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;   // fixed from sign-in (REQ-405), not extended by activity

export interface SessionTokenInput { userId: string; sessionId: string; expiresAt: Date; secret?: string }

export async function signSessionToken({ userId, sessionId, expiresAt, secret }: SessionTokenInput): Promise<string> {
  if (!userId || !sessionId) throw new Error('a session token needs a userId and a sessionId');
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))   // a number is an absolute time in seconds
    .sign(secretKey(secret));
}
