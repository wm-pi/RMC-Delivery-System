import type { ActiveDeliveryDto, DeliveryDto, DeliveryStatus } from '@rmc/shared';
import {
  ACTIVE_DELIVERY_STATUSES,
  AVERAGE_SPEED_KMH,
  calcTotalMinutes,
  haversineDistance,
} from '@rmc/shared';
import { getDb, nowIso } from '../../platform/db/client';
import { env } from '../../platform/env/env';

export interface DeliveryRow {
  id: number;
  order_id: number;
  vehicle_id: number;
  truck_number: string;
  driver_name: string;
  seq: number;
  quantity_m3: number;
  status: DeliveryStatus;
  dispatched_at: string | null;
  arrived_at: string | null;
  pouring_started_at: string | null;
  pouring_ended_at: string | null;
  returned_at: string | null;
  lat: number | null;
  lng: number | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface ActiveDeliveryRow extends DeliveryRow {
  order_no: string;
  concrete_grade: string;
  plant_id: number;
  plant_name: string;
  plant_lat: number;
  plant_lng: number;
  site_id: number;
  site_name: string;
  site_lat: number;
  site_lng: number;
}

const DELIVERY_SELECT = `
  select d.*, v.truck_number, v.driver_name
    from deliveries d
    join vehicles v on v.id = d.vehicle_id
`;

const ACTIVE_SELECT = `
  select d.*, v.truck_number, v.driver_name,
         o.order_no, o.concrete_grade,
         p.id as plant_id, p.name as plant_name, p.lat as plant_lat, p.lng as plant_lng,
         s.id as site_id, s.name as site_name, s.lat as site_lat, s.lng as site_lng
    from deliveries d
    join vehicles v on v.id = d.vehicle_id
    join orders o on o.id = d.order_id
    join plants p on p.id = o.plant_id
    join sites s on s.id = o.site_id
`;

function toDto(row: DeliveryRow): DeliveryDto {
  return {
    id: row.id,
    orderId: row.order_id,
    vehicleId: row.vehicle_id,
    truckNumber: row.truck_number,
    driverName: row.driver_name,
    seq: row.seq,
    quantityM3: row.quantity_m3,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    arrivedAt: row.arrived_at,
    pouringStartedAt: row.pouring_started_at,
    pouringEndedAt: row.pouring_ended_at,
    returnedAt: row.returned_at,
    lat: row.lat,
    lng: row.lng,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toActiveDto(row: ActiveDeliveryRow): ActiveDeliveryDto {
  const origin = { lat: row.plant_lat, lng: row.plant_lng };
  const destination = { lat: row.site_lat, lng: row.site_lng };
  // 복귀 중에는 현장 → 공장 방향
  const [from, to] = row.status === 'returning' ? [destination, origin] : [origin, destination];
  const totalKm = haversineDistance(from, to);
  const moving = row.status === 'in_transit' || row.status === 'returning';
  const remainingKm = moving ? totalKm * (1 - Math.min(row.progress, 1)) : 0;
  // ETA는 시뮬레이션 배속을 반영한 실제 체감 시간
  const etaMinutes = moving
    ? calcTotalMinutes(remainingKm, AVERAGE_SPEED_KMH * env.simMultiplier)
    : 0;
  return {
    ...toDto(row),
    orderNo: row.order_no,
    concreteGrade: row.concrete_grade,
    plantId: row.plant_id,
    plantName: row.plant_name,
    siteId: row.site_id,
    siteName: row.site_name,
    origin,
    destination,
    totalKm,
    remainingKm,
    etaMinutes,
    currentSpeedKmh: moving ? AVERAGE_SPEED_KMH : 0,
  };
}

export const DeliveryRepository = {
  findByOrderId(orderId: number): DeliveryDto[] {
    const rows = getDb()
      .prepare(`${DELIVERY_SELECT} where d.order_id = ? order by d.seq`)
      .all(orderId) as unknown as DeliveryRow[];
    return rows.map(toDto);
  },

  findById(id: number): DeliveryDto | null {
    const row = getDb().prepare(`${DELIVERY_SELECT} where d.id = ?`).get(id) as unknown as
      | DeliveryRow
      | undefined;
    return row ? toDto(row) : null;
  },

  findActive(): ActiveDeliveryDto[] {
    const placeholders = ACTIVE_DELIVERY_STATUSES.map(() => '?').join(',');
    const rows = getDb()
      .prepare(`${ACTIVE_SELECT} where d.status in (${placeholders}) order by d.id`)
      .all(...ACTIVE_DELIVERY_STATUSES) as unknown as ActiveDeliveryRow[];
    return rows.map(toActiveDto);
  },

  /** 시뮬레이터가 위치를 갱신할 이동 중 배차 (경로 좌표 포함) */
  findMoving(): ActiveDeliveryRow[] {
    return getDb()
      .prepare(`${ACTIVE_SELECT} where d.status in ('in_transit','returning')`)
      .all() as unknown as ActiveDeliveryRow[];
  },

  nextSeq(orderId: number): number {
    const row = getDb()
      .prepare('select coalesce(max(seq), 0) + 1 as next from deliveries where order_id = ?')
      .get(orderId) as { next: number };
    return row.next;
  },

  create(input: {
    orderId: number;
    vehicleId: number;
    seq: number;
    quantityM3: number;
    lat: number;
    lng: number;
  }): DeliveryDto {
    const now = nowIso();
    const result = getDb()
      .prepare(
        `insert into deliveries
           (order_id, vehicle_id, seq, quantity_m3, status, lat, lng, progress, created_at, updated_at)
         values (?, ?, ?, ?, 'assigned', ?, ?, 0, ?, ?)`,
      )
      .run(input.orderId, input.vehicleId, input.seq, input.quantityM3, input.lat, input.lng, now, now);
    return this.findById(Number(result.lastInsertRowid))!;
  },

  updateStatus(
    id: number,
    status: DeliveryStatus,
    timestamps: Partial<
      Record<'dispatched_at' | 'arrived_at' | 'pouring_started_at' | 'pouring_ended_at' | 'returned_at', string>
    > = {},
    position?: { lat: number; lng: number; progress: number },
  ): void {
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: (string | number)[] = [status, nowIso()];
    for (const [col, value] of Object.entries(timestamps)) {
      sets.push(`${col} = ?`);
      params.push(value);
    }
    if (position) {
      sets.push('lat = ?', 'lng = ?', 'progress = ?');
      params.push(position.lat, position.lng, position.progress);
    }
    params.push(id);
    getDb()
      .prepare(`update deliveries set ${sets.join(', ')} where id = ?`)
      .run(...params);
  },

  updatePosition(id: number, lat: number, lng: number, progress: number): void {
    getDb()
      .prepare('update deliveries set lat = ?, lng = ?, progress = ?, updated_at = ? where id = ?')
      .run(lat, lng, progress, nowIso(), id);
  },
};
