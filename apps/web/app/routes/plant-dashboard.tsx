// 업체 대시보드 — 신규 주문 요청 접수 + 진행 중 주문 배차 현황

import { OPEN_ORDER_STATUSES } from '@rmc/shared';
import { useOrderList } from '~/entities/order/queries';
import { useVehicleList } from '~/entities/vehicle/queries';
import { OrderCard } from '~/features/order-list/OrderCard';
import { useAuthStore } from '~/shared/lib/auth.store';
import { EmptyState, PageHeader, Spinner, StatChip } from '~/shared/ui';

export default function PlantDashboard() {
  const { plantId } = useAuthStore();
  const { data: orders, isLoading } = useOrderList({ plantId: plantId ?? undefined }, !!plantId);
  const { data: vehicles = [] } = useVehicleList(plantId ?? undefined);

  if (isLoading) return <Spinner />;

  const list = orders ?? [];
  const requested = list.filter((o) => o.status === 'requested');
  const active = list.filter(
    (o) => (OPEN_ORDER_STATUSES as string[]).includes(o.status) && o.status !== 'requested',
  );
  const closed = list.filter((o) => !(OPEN_ORDER_STATUSES as string[]).includes(o.status));

  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
  const onDelivery = vehicles.filter((v) => v.status === 'on_delivery').length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-5">
        <PageHeader title="주문 / 배차 현황" />

        <div className="mb-5 flex flex-wrap gap-2">
          <StatChip label="신규 요청" value={`${requested.length}건`} color="#f59e0b" />
          <StatChip label="진행 중 주문" value={`${active.length}건`} color="#2563eb" />
          <StatChip label="대기 차량" value={`${availableVehicles}대`} color="#10b981" />
          <StatChip label="운행 중 차량" value={`${onDelivery}대`} color="#8b5cf6" />
        </div>

        {requested.length > 0 && (
          <>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-600">
              📥 신규 주문 요청
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">{requested.length}</span>
            </h3>
            <div className="mb-6 space-y-3">
              {requested.map((order) => (
                <OrderCard key={order.id} order={order} role="plant" />
              ))}
            </div>
          </>
        )}

        <h3 className="mb-2 text-sm font-bold text-slate-600">진행 중 주문</h3>
        {active.length === 0 ? (
          <EmptyState message="진행 중인 주문이 없습니다" />
        ) : (
          <div className="space-y-3">
            {active.map((order) => (
              <OrderCard key={order.id} order={order} role="plant" />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-bold text-slate-500">종료된 주문</h3>
            <div className="space-y-3 opacity-70">
              {closed.map((order) => (
                <OrderCard key={order.id} order={order} role="plant" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
