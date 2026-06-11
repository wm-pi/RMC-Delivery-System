// 운행 위치 시뮬레이터 — GPS 단말이 없는 로컬 프로토타입에서 차량 이동을 재현한다.
// in_transit: 공장 → 현장, returning: 현장 → 공장. 도착 시 상태를 자동 전이한다.

import {
  AVERAGE_SPEED_KMH,
  calcTotalMinutes,
  haversineDistance,
  interpolateLatLng,
} from '@rmc/shared';
import { nowIso } from '../../platform/db/client';
import { env } from '../../platform/env/env';
import { OrderService } from '../order/order.service';
import { VehicleService } from '../vehicle/vehicle.service';
import { DeliveryRepository } from './delivery.repository';

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

    const totalKm = haversineDistance(from, to);
    const totalMinutes = calcTotalMinutes(totalKm, AVERAGE_SPEED_KMH);
    const elapsedSimMinutes = ((now - new Date(startedAtIso).getTime()) / 60_000) * env.simMultiplier;
    const progress = Math.min(1, totalMinutes > 0 ? elapsedSimMinutes / totalMinutes : 1);
    const pos = interpolateLatLng(from, to, progress);

    if (progress < 1) {
      DeliveryRepository.updatePosition(row.id, pos.lat, pos.lng, progress);
      continue;
    }

    if (returning) {
      DeliveryRepository.updateStatus(row.id, 'returned', { returned_at: nowIso() }, { ...pos, progress: 1 });
      VehicleService.setStatus(row.vehicle_id, 'available');
      OrderService.addEvent(row.order_id, 'system', 'status', `${row.seq}호차 ${row.truck_number} 공장 복귀`);
    } else {
      DeliveryRepository.updateStatus(row.id, 'arrived', { arrived_at: nowIso() }, { ...pos, progress: 1 });
      OrderService.addEvent(row.order_id, 'system', 'status', `${row.seq}호차 ${row.truck_number} 현장 도착`);
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
