import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleError } from './platform/middleware/error-handler';
import { apiRoutes } from './routes';

export function createApp(): Hono {
  const app = new Hono();

  app.use('*', cors());
  app.onError(handleError);

  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));
  app.route('/api', apiRoutes);

  return app;
}
