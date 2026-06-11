import { Hono } from 'hono';
import { createVehicleSchema, updateVehicleSchema } from '@rmc/shared';
import { created, ok, validationError } from '../../platform/response/respond';
import { VehicleService } from './vehicle.service';

export const vehicleRoute = new Hono();

vehicleRoute.get('/', (c) => {
  const plantId = c.req.query('plantId');
  return ok(c, VehicleService.list(plantId ? Number(plantId) : undefined));
});

vehicleRoute.get('/:id', (c) => ok(c, VehicleService.getById(Number(c.req.param('id')))));

vehicleRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, VehicleService.create(parsed.data));
});

vehicleRoute.put('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, VehicleService.update(Number(c.req.param('id')), parsed.data));
});

vehicleRoute.delete('/:id', (c) => {
  VehicleService.remove(Number(c.req.param('id')));
  return ok(c, { deleted: true });
});
