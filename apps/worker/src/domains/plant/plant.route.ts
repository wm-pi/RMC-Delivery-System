import { Hono } from 'hono';
import { createPlantSchema } from '@rmc/shared';
import { created, ok, validationError } from '../../platform/response/respond';
import { PlantService } from './plant.service';

export const plantRoute = new Hono();

plantRoute.get('/', (c) => ok(c, PlantService.list()));

plantRoute.get('/:id', (c) => ok(c, PlantService.getById(Number(c.req.param('id')))));

plantRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createPlantSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, PlantService.create(parsed.data));
});
