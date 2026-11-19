import http from 'http';
import { createApp } from '../../src/http/app';
import { routes } from '../../src/glue/routes';
import { healthRoute } from '../../src/routes/health';

describe('GET /health', () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    server = await new Promise<http.Server>((resolve) => {
      const s = createApp({ routes: [healthRoute], middleware: [], providers: [] }).listen(0, () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  it('answers 200 with status ok, an uptime and no caching', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
  });

  it('is registered in the route glue', () => {
    expect(routes.map((r: any) => r.id)).toContain('health');
  });
});
