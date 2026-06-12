import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { handleError } from './platform/middleware/error-handler';
import { apiRoutes } from './routes';

/** 단일 서비스 배포(Railway 등)에서 web SPA 빌드를 함께 서빙한다. cwd = apps/worker 기준 */
const WEB_DIST = process.env.WEB_DIST ?? '../web/build/client';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', cors());
  app.onError(handleError);

  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));
  app.route('/api', apiRoutes);

  // SPA 정적 서빙 — 빌드 산출물이 있을 때만 (로컬 dev는 vite 5173이 담당)
  if (existsSync(resolve(process.cwd(), WEB_DIST))) {
    app.use('*', serveStatic({ root: WEB_DIST }));
    app.get('*', serveStatic({ path: `${WEB_DIST}/index.html` }));
    console.log(`[worker] serving SPA from ${WEB_DIST}`);
  }

  return app;
}
