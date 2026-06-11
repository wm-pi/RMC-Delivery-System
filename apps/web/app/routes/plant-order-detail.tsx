// 업체 주문 상세 — 접수/거절 + 배차 추가 + 회전 관리 + 타임라인

import { Link, useParams } from 'react-router';
import { formatDateTime, formatQuantity } from '@rmc/shared';
import { useOrderDetail } from '~/entities/order/queries';
import { OrderStatusBadge } from '~/entities/order/status';
import { DeliveryTable } from '~/features/delivery-list/DeliveryTable';
import { PlantOrderActions } from '~/features/order-actions/PlantOrderActions';
import { OrderProgressSummary } from '~/features/order-progress/OrderProgressSummary';
import { OrderTimeline } from '~/features/order-timeline/OrderTimeline';
import { DispatchPanel } from '~/features/dispatch/DispatchPanel';
import { Card, ErrorState, Spinner } from '~/shared/ui';

export default function PlantOrderDetail() {
  const { orderId } = useParams();
  const { data, isLoading, isError } = useOrderDetail(Number(orderId));

  if (isLoading) return <Spinner />;
  if (isError || !data) {
    return (
      <div className="p-5">
        <ErrorState message="주문을 불러올 수 없습니다" />
      </div>
    );
  }

  const { order, deliveries, events, stats } = data;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Link to="/plant" className="text-sm text-slate-400 hover:text-slate-600">
            ← 목록
          </Link>
          <h2 className="text-lg font-bold">{order.orderNo}</h2>
          <OrderStatusBadge status={order.status} />
          <div className="ml-auto">
            <PlantOrderActions order={order} />
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-3">
            <div>
              <span className="text-slate-400">현장</span>
              <div className="font-semibold">{order.siteName}</div>
            </div>
            <div>
              <span className="text-slate-400">규격</span>
              <div className="font-semibold">{order.concreteGrade}</div>
            </div>
            <div>
              <span className="text-slate-400">총 수량</span>
              <div className="font-semibold">{formatQuantity(order.totalQuantityM3)}</div>
            </div>
            <div>
              <span className="text-slate-400">납품 희망</span>
              <div className="font-semibold">{formatDateTime(order.requestedAt)}</div>
            </div>
            <div>
              <span className="text-slate-400">배차 간격</span>
              <div className="font-semibold">{order.truckIntervalMin}분</div>
            </div>
            {order.notes && (
              <div>
                <span className="text-slate-400">요청 사항</span>
                <div className="font-semibold">{order.notes}</div>
              </div>
            )}
          </div>
          <OrderProgressSummary order={order} stats={stats} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">배차 추가</h3>
          <DispatchPanel order={order} stats={stats} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">배차 회전 ({deliveries.length}건)</h3>
          <DeliveryTable deliveries={deliveries} role="plant" />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">현장과 소통 (통화 대체)</h3>
          <OrderTimeline orderId={order.id} events={events} role="plant" />
        </Card>
      </div>
    </div>
  );
}
