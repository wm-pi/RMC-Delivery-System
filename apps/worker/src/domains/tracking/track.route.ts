// 공개 라우트 — 기사 추적 토큰으로 자체 인증 (전역 authMiddleware 밖에 마운트)

import { Hono } from 'hono';
import { locationPingSchema } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { ok, validationError } from '../../platform/response/respond';
import { TrackService } from './track.service';

export const trackRoute = new Hono();

function getToken(c: { req: { query: (k: string) => string | undefined } }): string {
  const token = c.req.query('t');
  if (!token) throw AppError.unauthorized('추적 토큰이 필요합니다');
  return token;
}

/** 기사 페이지 부트스트랩 — 배차/목적지 정보 */
trackRoute.get('/:id', async (c) =>
  ok(c, await TrackService.bootstrap(Number(c.req.param('id')), getToken(c))),
);

/** 기사 폰 위치 핑 */
trackRoute.post('/:id/location', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = locationPingSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, await TrackService.recordLocation(Number(c.req.param('id')), getToken(c), parsed.data));
});
