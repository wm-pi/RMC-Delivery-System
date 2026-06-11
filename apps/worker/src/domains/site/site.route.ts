import { Hono } from 'hono';
import { createSiteSchema } from '@rmc/shared';
import { created, ok, validationError } from '../../platform/response/respond';
import { SiteService } from './site.service';

export const siteRoute = new Hono();

siteRoute.get('/', (c) => ok(c, SiteService.list()));

siteRoute.get('/:id', (c) => ok(c, SiteService.getById(Number(c.req.param('id')))));

siteRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, SiteService.create(parsed.data));
});
