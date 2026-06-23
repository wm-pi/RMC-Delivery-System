// 운행 위치 시뮬레이터 — estimated 모드 배차의 이동을 지도거리 기반으로 재현한다.
// (gps 모드는 기사 폰 핑이 위치를 결정하므로 시뮬레이터 대상에서 제외됨)
// in_transit: 공장 → 현장, returning: 현장 → 공장. 도착 시 상태를 자동 전이한다.

import { interpolateLatLng } from '@rmc/shared';
import { estimateRoute } from '../../platform/directions/route-info';
import { env } from '../../platform/env/env';
import { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';

function tick(): void {
  const moving = DeliveryRepository.findMoving();
  const now = Date.now();

  for (const row of moving) {
    const origin = { lat: row.plant_lat, lng: row.plant_lng };
    const destination = { lat: row.site_lat, lng: row.site_lng };
    const returning = row.status === 'returning';
    const [from, to] = returning ? [destination, origin] : [origin, destination];

    const startedAtIso = returning ? row.pouring_ended_at : row.dispatched_at;
    if (!startedAtIso) continue;

    // ETA 표시와 동일한 경로 소요시간(Directions 우선)을 써서 진행률을 계산
    const totalMinutes = estimateRoute(from, to).durationMin;
    const elapsedSimMinutes = ((now - new Date(startedAtIso).getTime()) / 60_000) * env.simMultiplier;
    const progress = Math.min(1, totalMinutes > 0 ? elapsedSimMinutes / totalMinutes : 1);
    const pos = interpolateLatLng(from, to, progress);

    if (progress < 1) {
      DeliveryRepository.updatePosition(row.id, pos.lat, pos.lng, progress);
    } else if (returning) {
      DeliveryService.systemReturn(row.id, pos);
    } else {
      DeliveryService.systemArrive(row.id, pos);
    }
  }
}

export function startSimulator(): void {
  setInterval(() => {
    try {
      tick();
    } catch (err) {
      console.error('[simulator]', err);
    }
  }, env.simTickMs);
  console.log(`[simulator] started (x${env.simMultiplier}, tick ${env.simTickMs}ms)`);
}
