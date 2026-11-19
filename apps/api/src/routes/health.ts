// Liveness check: GET /health answers 200 while the process is up. No auth, no database access.
import { Router } from 'express';
import { RouteEntry } from '../http/app';

export const healthRoute: RouteEntry = {
  id: 'health',
  mount: (router: Router) => {
    router.get('/health', (_req, res) => {
      res.set('Cache-Control', 'no-store').json({ status: 'ok', uptime: Math.round(process.uptime()) });
    });
  }
};
