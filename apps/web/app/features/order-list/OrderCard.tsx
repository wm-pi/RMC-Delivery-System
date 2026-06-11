// 대시보드 주문 카드 — 현장/업체 공용 (링크 prefix만 다름)

import { Link } from 'react-router';
import type { OrderListItemDto, UserRole } from '@rmc/shared';
import { formatDateTime, formatQuantity } from '@rmc/shared';
import { OrderStatusBadge } from '~/entities/order/status';

export function OrderCard({ order, role }: { order: OrderListItemDto; role: UserRole }) {
  const { stats } = order;
  const percent =
    order.totalQuantityM3 > 0
      ? Math.min(100, Math.round((stats.pouredQuantityM3 / order.totalQuantityM3) * 100))
      : 0;
  const showProgress = ['in_progress', 'paused', 'completed'].includes(order.status);

  return (
    <Link
      to={`/${role}/orders/${order.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{order.orderNo}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="space-y-0.5 text-[13px] text-slate-600">
        <div>
          <b>{role === 'site' ? '공장' : '현장'}:</b>{' '}
          {role === 'site' ? order.plantName : order.siteName}
        </div>
        <div>
          <b>규격:</b> {order.concreteGrade} · <b>수량:</b> {formatQuantity(order.totalQuantityM3)}
        </div>
        <div>
          <b>납품 희망:</b> {formatDateTime(order.requestedAt)}
        </div>
      </div>

      {showProgress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>
              타설 {formatQuantity(stats.pouredQuantityM3)} ({stats.pouredCount}회전)
            </span>
            <span>
              이동 중 {stats.inTransitCount}대 · 추가 예상 {stats.estimatedRemainingTrucks}대
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
