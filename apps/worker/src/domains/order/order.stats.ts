import type { DeliveryStatus, OrderStatsDto } from '@rmc/shared';

/** 기본 믹서트럭 적재량 — 잔여 대수 추정에만 사용 */
const DEFAULT_TRUCK_CAPACITY_M3 = 6;

export interface DeliveryAggRow {
  status: DeliveryStatus;
  qty: number;
  cnt: number;
}

/** 배차 집계 행으로 주문 진행 현황을 계산한다 */
export function computeOrderStats(totalQuantityM3: number, rows: DeliveryAggRow[]): OrderStatsDto {
  const byStatus = new Map<DeliveryStatus, DeliveryAggRow>();
  for (const row of rows) byStatus.set(row.status, row);

  const sum = (statuses: DeliveryStatus[], field: 'qty' | 'cnt') =>
    statuses.reduce((acc, s) => acc + (byStatus.get(s)?.[field] ?? 0), 0);

  const assignedQuantityM3 = sum(
    ['assigned', 'loading', 'in_transit', 'arrived', 'pouring', 'returning', 'returned'],
    'qty',
  );
  const remainingQuantityM3 = Math.max(0, totalQuantityM3 - assignedQuantityM3);

  const statusCounts: Partial<Record<DeliveryStatus, number>> = {};
  for (const row of rows) statusCounts[row.status] = row.cnt;

  return {
    assignedQuantityM3,
    remainingQuantityM3,
    estimatedRemainingTrucks: Math.ceil(remainingQuantityM3 / DEFAULT_TRUCK_CAPACITY_M3),
    pouredQuantityM3: sum(['returning', 'returned'], 'qty'),
    pouredCount: sum(['returning', 'returned'], 'cnt'),
    arrivedTotalCount: sum(['arrived', 'pouring', 'returning', 'returned'], 'cnt'),
    inTransitCount: sum(['in_transit'], 'cnt'),
    onSiteCount: sum(['arrived', 'pouring'], 'cnt'),
    statusCounts,
  };
}
