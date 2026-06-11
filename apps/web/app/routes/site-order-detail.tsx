// 현장 주문 상세 — 진행 요약 + 회전 목록(타설 처리) + 대수 조절 + 타임라인

import { Link, useParams } from 'react-router';
import { formatDateTime, formatQuantity } from '@rmc/shared';
import { useOrderDetail } from '~/entities/order/queries';
import { OrderStatusBadge } from '~/entities/order/status';
import { DeliveryTable } from '~/features/delivery-list/DeliveryTable';
import { SiteOrderActions } from '~/features/order-actions/SiteOrderActions';
import { OrderProgressSummary } from '~/features/order-progress/OrderProgressSummary';
import { OrderTimeline } from '~/features/order-timeline/OrderTimeline';
import { Card, ErrorState, Spinner } from '~/shared/ui';

export default function SiteOrderDetail() {
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
          <Link to="/site" className="text-sm text-slate-400 hover:text-slate-600">
            ← 목록
          </Link>
          <h2 className="text-lg font-bold">{order.orderNo}</h2>
          <OrderStatusBadge status={order.status} />
        </div>

        <Card className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-3">
            <div>
              <span className="text-slate-400">공장</span>
              <div className="font-semibold">{order.plantName}</div>
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
          <h3 className="mb-3 text-sm font-bold">현장 액션</h3>
          <SiteOrderActions order={order} stats={stats} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">배차 회전 ({deliveries.length}건)</h3>
          <DeliveryTable deliveries={deliveries} role="site" />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">업체와 소통 (통화 대체)</h3>
          <OrderTimeline orderId={order.id} events={events} role="site" />
        </Card>
      </div>
    </div>
  );
}
