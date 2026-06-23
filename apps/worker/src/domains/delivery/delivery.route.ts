import { Hono } from 'hono';
import { getUser } from '../../platform/auth/auth.middleware';
import { ok } from '../../platform/response/respond';
import { DeliveryService } from './delivery.service';

export const deliveryRoute = new Hono();

/** 실시간 지도/현황판용 — 자기 테넌트의 종료되지 않은 배차 + 위치/ETA */
deliveryRoute.get('/active', (c) => ok(c, DeliveryService.listActive(getUser(c))));

/** 업체: 기사 추적 링크 발급 (gps 모드) */
deliveryRoute.get('/:id/track-link', async (c) =>
  ok(c, await DeliveryService.getDriverLink(getUser(c), Number(c.req.param('id')))),
);

deliveryRoute.post('/:id/load', (c) => ok(c, DeliveryService.startLoading(getUser(c), Number(c.req.param('id')))));
deliveryRoute.post('/:id/dispatch', (c) => ok(c, DeliveryService.dispatch(getUser(c), Number(c.req.param('id')))));
deliveryRoute.post('/:id/pouring-start', (c) => ok(c, DeliveryService.startPouring(getUser(c), Number(c.req.param('id')))));
deliveryRoute.post('/:id/pouring-end', (c) => ok(c, DeliveryService.endPouring(getUser(c), Number(c.req.param('id')))));
deliveryRoute.post('/:id/cancel', (c) => ok(c, DeliveryService.cancel(getUser(c), Number(c.req.param('id')))));
