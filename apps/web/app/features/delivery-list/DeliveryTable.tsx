// 주문 상세의 회전(배차) 목록 — 역할에 따라 가능한 액션 버튼이 달라진다

import type { DeliveryDto, UserRole } from '@rmc/shared';
import { formatProgress, formatQuantity, formatTime } from '@rmc/shared';
import { deliveryApi } from '~/entities/delivery/api';
import { useDeliveryAction } from '~/entities/delivery/queries';
import { DeliveryStatusBadge } from '~/entities/delivery/status';
import { Button, EmptyState } from '~/shared/ui';

function DeliveryActions({ delivery, role }: { delivery: DeliveryDto; role: UserRole }) {
  const load = useDeliveryAction(deliveryApi.load);
  const dispatch = useDeliveryAction(deliveryApi.dispatch);
  const pouringStart = useDeliveryAction(deliveryApi.pouringStart);
  const pouringEnd = useDeliveryAction(deliveryApi.pouringEnd);
  const cancel = useDeliveryAction(deliveryApi.cancel);

  if (role === 'plant') {
    if (delivery.status === 'assigned') {
      return (
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => load.mutate([delivery.id])} disabled={load.isPending}>
            상차 시작
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (confirm(`${delivery.seq}호차 배차를 취소할까요?`)) cancel.mutate([delivery.id]);
            }}
            disabled={cancel.isPending}
          >
            취소
          </Button>
        </div>
      );
    }
    if (delivery.status === 'loading') {
      return (
        <Button size="sm" variant="success" onClick={() => dispatch.mutate([delivery.id])} disabled={dispatch.isPending}>
          출발
        </Button>
      );
    }
  }

  if (role === 'site') {
    if (delivery.status === 'arrived') {
      return (
        <Button size="sm" variant="warning" onClick={() => pouringStart.mutate([delivery.id])} disabled={pouringStart.isPending}>
          타설 시작
        </Button>
      );
    }
    if (delivery.status === 'pouring') {
      return (
        <Button size="sm" variant="success" onClick={() => pouringEnd.mutate([delivery.id])} disabled={pouringEnd.isPending}>
          타설 완료
        </Button>
      );
    }
  }

  return null;
}

export function DeliveryTable({ deliveries, role }: { deliveries: DeliveryDto[]; role: UserRole }) {
  if (deliveries.length === 0) {
    return <EmptyState message="아직 배차된 차량이 없습니다" />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="px-2 py-2">회전</th>
            <th className="px-2 py-2">차량 / 기사</th>
            <th className="px-2 py-2">수량</th>
            <th className="px-2 py-2">상태</th>
            <th className="px-2 py-2">출발</th>
            <th className="px-2 py-2">도착</th>
            <th className="px-2 py-2">타설 완료</th>
            <th className="px-2 py-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id} className="border-b border-slate-100">
              <td className="px-2 py-2.5 font-bold">{d.seq}호차</td>
              <td className="px-2 py-2.5">
                <div className="font-semibold">{d.truckNumber}</div>
                <div className="text-xs text-slate-500">{d.driverName}</div>
              </td>
              <td className="px-2 py-2.5">{formatQuantity(d.quantityM3)}</td>
              <td className="px-2 py-2.5">
                <DeliveryStatusBadge status={d.status} />
                {(d.status === 'in_transit' || d.status === 'returning') && (
                  <span className="ml-1.5 text-xs text-slate-500">{formatProgress(d.progress)}</span>
                )}
              </td>
              <td className="px-2 py-2.5 text-xs text-slate-500">{formatTime(d.dispatchedAt)}</td>
              <td className="px-2 py-2.5 text-xs text-slate-500">{formatTime(d.arrivedAt)}</td>
              <td className="px-2 py-2.5 text-xs text-slate-500">{formatTime(d.pouringEndedAt)}</td>
              <td className="px-2 py-2.5">
                <DeliveryActions delivery={d} role={role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
