// 현장 대시보드 — 우리 현장 주문 목록 + 오늘 진행 요약

import { Link } from 'react-router';
import { OPEN_ORDER_STATUSES, formatQuantity } from '@rmc/shared';
import { useOrderList } from '~/entities/order/queries';
import { OrderCard } from '~/features/order-list/OrderCard';
import { useAuthStore } from '~/shared/lib/auth.store';
import { Button, EmptyState, PageHeader, Spinner, StatChip } from '~/shared/ui';

export default function SiteDashboard() {
  const { siteId } = useAuthStore();
  const { data: orders, isLoading } = useOrderList({ siteId: siteId ?? undefined }, !!siteId);

  if (isLoading) return <Spinner />;

  const list = orders ?? [];
  const open = list.filter((o) => (OPEN_ORDER_STATUSES as string[]).includes(o.status));
  const closed = list.filter((o) => !(OPEN_ORDER_STATUSES as string[]).includes(o.status));

  const inTransitTotal = open.reduce((sum, o) => sum + o.stats.inTransitCount, 0);
  const onSiteTotal = open.reduce((sum, o) => sum + o.stats.onSiteCount, 0);
  const pouredTotal = open.reduce((sum, o) => sum + o.stats.pouredQuantityM3, 0);
  const comingTotal = open.reduce((sum, o) => sum + o.stats.estimatedRemainingTrucks, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-5">
        <PageHeader
          title="주문 현황"
          actions={
            <Link to="/site/orders/new">
              <Button>+ 신규 주문</Button>
            </Link>
          }
        />

        <div className="mb-5 flex flex-wrap gap-2">
          <StatChip label="진행 중 주문" value={`${open.length}건`} color="#2563eb" />
          <StatChip label="이동 중 차량" value={`${inTransitTotal}대`} color="#8b5cf6" />
          <StatChip label="현장 대기/타설" value={`${onSiteTotal}대`} color="#f97316" />
          <StatChip label="오늘 타설량" value={formatQuantity(pouredTotal)} color="#10b981" />
          <StatChip label="추가 배차 예상" value={`${comingTotal}대`} color="#f59e0b" />
        </div>

        {list.length === 0 ? (
          <EmptyState message="아직 주문이 없습니다. 신규 주문을 등록해보세요." />
        ) : (
          <>
            <div className="space-y-3">
              {open.map((order) => (
                <OrderCard key={order.id} order={order} role="site" />
              ))}
            </div>
            {closed.length > 0 && (
              <>
                <h3 className="mb-2 mt-6 text-sm font-bold text-slate-500">종료된 주문</h3>
                <div className="space-y-3 opacity-70">
                  {closed.map((order) => (
                    <OrderCard key={order.id} order={order} role="site" />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
