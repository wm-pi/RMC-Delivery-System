import { Hono } from 'hono';
import { ok } from '../../platform/response/respond';
import { DeliveryService } from './delivery.service';

export const deliveryRoute = new Hono();

/** 실시간 지도/현황판용 — 종료되지 않은 모든 배차 + 위치/ETA */
deliveryRoute.get('/active', (c) => ok(c, DeliveryService.listActive()));

deliveryRoute.get('/:id', (c) => ok(c, DeliveryService.getById(Number(c.req.param('id')))));

deliveryRoute.post('/:id/load', (c) => ok(c, DeliveryService.startLoading(Number(c.req.param('id')))));
deliveryRoute.post('/:id/dispatch', (c) => ok(c, DeliveryService.dispatch(Number(c.req.param('id')))));
deliveryRoute.post('/:id/pouring-start', (c) => ok(c, DeliveryService.startPouring(Number(c.req.param('id')))));
deliveryRoute.post('/:id/pouring-end', (c) => ok(c, DeliveryService.endPouring(Number(c.req.param('id')))));
deliveryRoute.post('/:id/cancel', (c) => ok(c, DeliveryService.cancel(Number(c.req.param('id')))));
