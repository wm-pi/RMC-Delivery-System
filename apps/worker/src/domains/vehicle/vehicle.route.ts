import { Hono } from 'hono';
import { createVehicleSchema, updateVehicleSchema } from '@rmc/shared';
import { getUser } from '../../platform/auth/auth.middleware';
import { created, ok, validationError } from '../../platform/response/respond';
import { VehicleService } from './vehicle.service';

export const vehicleRoute = new Hono();

vehicleRoute.get('/', (c) => ok(c, VehicleService.list(getUser(c))));

vehicleRoute.get('/:id', (c) => ok(c, VehicleService.getOwned(getUser(c), Number(c.req.param('id')))));

vehicleRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, VehicleService.create(getUser(c), parsed.data));
});

vehicleRoute.put('/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, VehicleService.update(getUser(c), Number(c.req.param('id')), parsed.data));
});

vehicleRoute.delete('/:id', (c) => {
  VehicleService.remove(getUser(c), Number(c.req.param('id')));
  return ok(c, { deleted: true });
});
