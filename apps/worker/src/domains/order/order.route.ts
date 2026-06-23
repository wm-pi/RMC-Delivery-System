import { Hono } from 'hono';
import {
  adjustOrderSchema,
  assignDeliverySchema,
  createOrderSchema,
  orderMessageSchema,
  rejectOrderSchema,
} from '@rmc/shared';
import type { OrderDetailDto } from '@rmc/shared';
import { getUser } from '../../platform/auth/auth.middleware';
import { created, ok, validationError } from '../../platform/response/respond';
import { DeliveryService } from '../delivery/delivery.service';
import { OrderService } from './order.service';

export const orderRoute = new Hono();

orderRoute.get('/', (c) => ok(c, OrderService.list(getUser(c))));

orderRoute.get('/:id', (c) => {
  const user = getUser(c);
  const id = Number(c.req.param('id'));
  const base = OrderService.getDetailBase(user, id);
  const detail: OrderDetailDto = { ...base, deliveries: DeliveryService.listByOrder(id) };
  return ok(c, detail);
});

orderRoute.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, OrderService.create(getUser(c), parsed.data));
});

orderRoute.post('/:id/accept', (c) => ok(c, OrderService.accept(getUser(c), Number(c.req.param('id')))));

orderRoute.post('/:id/reject', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = rejectOrderSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, OrderService.reject(getUser(c), Number(c.req.param('id')), parsed.data.reason));
});

orderRoute.post('/:id/cancel', (c) => ok(c, OrderService.cancel(getUser(c), Number(c.req.param('id')))));
orderRoute.post('/:id/pause', (c) => ok(c, OrderService.pause(getUser(c), Number(c.req.param('id')))));
orderRoute.post('/:id/resume', (c) => ok(c, OrderService.resume(getUser(c), Number(c.req.param('id')))));
orderRoute.post('/:id/complete', (c) => ok(c, OrderService.complete(getUser(c), Number(c.req.param('id')))));

orderRoute.post('/:id/adjust', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adjustOrderSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, OrderService.adjust(getUser(c), Number(c.req.param('id')), parsed.data));
});

orderRoute.post('/:id/messages', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = orderMessageSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  // actor는 토큰에서 결정 — 본문의 actor는 무시 (위변조 방지)
  return created(c, OrderService.addMessage(getUser(c), Number(c.req.param('id')), parsed.data.message));
});

/** 업체가 주문에 차량을 배정해 회전 생성 */
orderRoute.post('/:id/deliveries', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = assignDeliverySchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return created(c, DeliveryService.assign(getUser(c), Number(c.req.param('id')), parsed.data));
});
