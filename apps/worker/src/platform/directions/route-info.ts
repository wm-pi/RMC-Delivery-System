// 경로 거리·소요시간 추정 — 네이버 Directions 우선, 미설정/실패 시 직선거리(haversine) 폴백.
// 동기 호출은 항상 즉시 반환하고, Directions 결과는 백그라운드로 캐시에 적재해 다음 호출부터 반영한다.

import type { LatLng } from '@rmc/shared';
import { AVERAGE_SPEED_KMH, calcTotalMinutes, haversineDistance } from '@rmc/shared';
import { env } from '../env/env';

export type EtaSource = 'directions' | 'straight';

export interface RouteInfo {
  km: number;
  durationMin: number;
  source: EtaSource;
}

interface CachedRoute {
  km: number;
  durationMin: number;
  /** 실제 도로 경로 좌표 (Directions 제공). 폴백 시 [from, to] 직선 */
  path: LatLng[];
}

const cache = new Map<string, CachedRoute>();
const inflight = new Set<string>();

function key(from: LatLng, to: LatLng): string {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}>${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
}

function directionsEnabled(): boolean {
  return Boolean(env.directions.keyId && env.directions.key);
}

/** 동기 추정 — 캐시에 Directions 결과가 있으면 사용, 없으면 직선거리. 필요 시 비동기 적재 트리거 */
export function estimateRoute(from: LatLng, to: LatLng): RouteInfo {
  const k = key(from, to);
  const cached = cache.get(k);
  if (cached) return { ...cached, source: 'directions' };

  if (directionsEnabled() && !inflight.has(k)) {
    void warmCache(k, from, to);
  }
  const km = haversineDistance(from, to);
  return { km, durationMin: calcTotalMinutes(km, AVERAGE_SPEED_KMH), source: 'straight' };
}

async function warmCache(k: string, from: LatLng, to: LatLng): Promise<void> {
  inflight.add(k);
  try {
    const r = await fetchDirections(from, to);
    if (r) cache.set(k, r);
  } catch (err) {
    console.warn('[directions] 호출 실패, 직선거리로 폴백:', (err as Error).message);
  } finally {
    inflight.delete(k);
  }
}

/** 도로 경로 좌표 반환 — 캐시 우선, 없으면 Directions 호출(await), 미설정/실패 시 직선 2점 폴백 */
export async function getRoutePath(
  from: LatLng,
  to: LatLng,
): Promise<{ path: LatLng[]; source: EtaSource }> {
  const k = key(from, to);
  const cached = cache.get(k);
  if (cached) return { path: cached.path, source: 'directions' };

  if (directionsEnabled()) {
    try {
      const r = await fetchDirections(from, to);
      if (r) {
        cache.set(k, r);
        return { path: r.path, source: 'directions' };
      }
    } catch (err) {
      console.warn('[directions] 경로 조회 실패, 직선으로 폴백:', (err as Error).message);
    }
  }
  return { path: [from, to], source: 'straight' };
}

// 신형 NCP Maps Directions 15 — maps.apigw.ntruss.com + 소문자 ncp 헤더
const DIRECTIONS_URL = 'https://maps.apigw.ntruss.com/map-direction-15/v1/driving';

async function fetchDirections(from: LatLng, to: LatLng): Promise<CachedRoute | null> {
  const url = `${DIRECTIONS_URL}?start=${from.lng},${from.lat}&goal=${to.lng},${to.lat}`;
  const res = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': env.directions.keyId,
      'x-ncp-apigw-api-key': env.directions.key,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    route?: {
      traoptimal?: { summary?: { distance: number; duration: number }; path?: [number, number][] }[];
    };
  };
  const leg = data.route?.traoptimal?.[0];
  if (!leg?.summary) return null;
  // distance: meter, duration: millisecond, path: [lng, lat][]
  const path: LatLng[] = (leg.path ?? []).map(([lng, lat]) => ({ lat, lng }));
  return {
    km: leg.summary.distance / 1000,
    durationMin: leg.summary.duration / 60_000,
    path: path.length >= 2 ? path : [from, to],
  };
}
