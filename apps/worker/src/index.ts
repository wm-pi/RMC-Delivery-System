import { serve } from '@hono/node-server';
import { createApp } from './app';
import { migrate } from './platform/db/migrate';
import { seedIfEmpty } from './platform/db/seed';
import { env } from './platform/env/env';
import { startSimulator } from './domains/delivery/delivery.simulator';

migrate();
seedIfEmpty();
startSimulator();

serve({ fetch: createApp().fetch, port: env.port }, (info) => {
  console.log(`[worker] listening on http://localhost:${info.port}`);
});
