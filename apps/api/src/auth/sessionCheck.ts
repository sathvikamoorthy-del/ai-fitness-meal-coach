// Server-side session check (REQ-405, WI-046). Runs after the module-owned `authenticate`, which has already verified the
// token (signature and exp). For an authenticated request it looks up the session the token names (claims.sid):
//   no sid                    -> 401 unauthorized
//   no row (signed out)       -> 401 session-ended
//   expires_at in the past    -> 401 session-expired
// The token's exp equals expires_at, so an expired token is normally refused by `authenticate` first; the expires_at check
// is a second guard that does not depend on the token. Expiry is never extended: nothing here writes the session row.
// Anonymous requests pass through; routes that need a user still add `requireAuth`.
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import type { Orm } from '../db/orm';
import { sessions } from '../db/models/sessions';
import type { AuthClaims } from './jwt';

export interface SessionReq extends Request { auth?: AuthClaims; sessionId?: string }

export async function sessionCheck(req: Request, res: Response, next: NextFunction) {
  const r = req as SessionReq;
  if (!r.auth) return next();
  const sid = r.auth.claims?.sid;
  if (typeof sid !== 'string' || !sid) return void res.status(401).json({ error: 'unauthorized' });

  const orm = req.app.get('orm') as Orm;
  const [session] = await orm.select({ expires_at: sessions.expires_at }).from(sessions)
    .where(and(eq(sessions.id, sid), eq(sessions.user_id, r.auth.userId))).limit(1);
  if (!session) return void res.status(401).json({ error: 'session-ended' });
  if (Date.parse(session.expires_at) <= Date.now()) return void res.status(401).json({ error: 'session-expired' });

  r.sessionId = sid;
  next();
}
