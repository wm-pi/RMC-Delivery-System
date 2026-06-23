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

/** 현재 운행 구간의 도로 경로 (지도용) */
deliveryRoute.get('/:id/route', async (c) =>
  ok(c, await DeliveryService.getRoute(getUser(c), Number(c.req.param('id')))),
);

// 업체: 출발 (상차+출발 통합 — 클릭 최소화)
deliveryRoute.post('/:id/depart', (c) => ok(c, DeliveryService.depart(getUser(c), Number(c.req.param('id')))));
// 현장: 타설 완료 (타설 시작+완료 통합 — 클릭 최소화)
deliveryRoute.post('/:id/pour-complete', (c) => ok(c, DeliveryService.pourComplete(getUser(c), Number(c.req.param('id')))));
deliveryRoute.post('/:id/cancel', (c) => ok(c, DeliveryService.cancel(getUser(c), Number(c.req.param('id')))));
