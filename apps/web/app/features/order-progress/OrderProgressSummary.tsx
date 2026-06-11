// "현재 몇 대 들어와서 타설했고, 몇 대 더 올지" 한눈에 보는 진행 요약

import type { OrderDto, OrderStatsDto } from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { StatChip } from '~/shared/ui';

export function OrderProgressSummary({
  order,
  stats,
}: {
  order: Pick<OrderDto, 'totalQuantityM3'>;
  stats: OrderStatsDto;
}) {
  const percent =
    order.totalQuantityM3 > 0
      ? Math.min(100, Math.round((stats.pouredQuantityM3 / order.totalQuantityM3) * 100))
      : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-700">
          타설 진행 {formatQuantity(stats.pouredQuantityM3)} / {formatQuantity(order.totalQuantityM3)}
        </span>
        <span className="font-bold text-emerald-600">{percent}%</span>
      </div>
      <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <StatChip label="도착 누적" value={`${stats.arrivedTotalCount}대`} color="#2563eb" />
        <StatChip label="타설 완료" value={`${stats.pouredCount}회전`} color="#10b981" />
        <StatChip label="이동 중" value={`${stats.inTransitCount}대`} color="#8b5cf6" />
        <StatChip label="현장 대기/타설" value={`${stats.onSiteCount}대`} color="#f97316" />
        <StatChip
          label="추가 배차 예상"
          value={`${stats.estimatedRemainingTrucks}대`}
          color="#f59e0b"
        />
        <StatChip label="잔여 수량" value={formatQuantity(stats.remainingQuantityM3)} />
      </div>
    </div>
  );
}
