// 주문 상세의 회전(배차) 목록 — 역할에 따라 가능한 액션 버튼이 달라진다

import { useState } from 'react';
import type { DeliveryDto, UserRole } from '@rmc/shared';
import { TRACKING_MODE_LABEL, formatProgress, formatQuantity, formatTime } from '@rmc/shared';
import { deliveryApi } from '~/entities/delivery/api';
import { useDeliveryAction } from '~/entities/delivery/queries';
import { DeliveryStatusBadge } from '~/entities/delivery/status';
import { ApiError } from '~/shared/api/client';
import { toast } from '~/shared/lib/toast.store';
import { Button, EmptyState } from '~/shared/ui';

/** gps 모드 배차의 기사 추적 링크를 발급해 클립보드에 복사 (업체용) */
function TrackLinkButton({ deliveryId }: { deliveryId: number }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      const { path } = await deliveryApi.trackLink(deliveryId);
      const url = `${globalThis.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('기사 추적 링크를 복사했습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '링크 발급에 실패했습니다');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={copy} loading={busy}>
      {copied ? '복사됨 ✓' : '기사 링크'}
    </Button>
  );
}

function DeliveryActions({ delivery, role }: { readonly delivery: DeliveryDto; readonly role: UserRole }) {
  // 출발 = 상차+출발 통합(1클릭), 타설 완료 = 타설 시작+완료 통합(1클릭)
  const depart = useDeliveryAction(deliveryApi.depart, `${delivery.seq}호차 출발 처리했습니다`);
  const pourComplete = useDeliveryAction(deliveryApi.pourComplete, `${delivery.seq}호차 타설 완료`);
  const cancel = useDeliveryAction(deliveryApi.cancel, `${delivery.seq}호차 배차를 취소했습니다`);

  // 업체: 출발 전(배정/상차)이면 출발 1클릭 + 취소
  if (role === 'plant' && (delivery.status === 'assigned' || delivery.status === 'loading')) {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" variant="success" onClick={() => depart.mutate([delivery.id])} loading={depart.isPending}>
          출발
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => cancel.mutate([delivery.id])}
          loading={cancel.isPending}
        >
          취소
        </Button>
      </div>
    );
  }

  // 현장: 도착하면 타설 완료 1클릭 (타설 끝났을 때 한 번만 누름)
  if (role === 'site' && (delivery.status === 'arrived' || delivery.status === 'pouring')) {
    return (
      <Button size="sm" variant="success" onClick={() => pourComplete.mutate([delivery.id])} loading={pourComplete.isPending}>
        타설 완료
      </Button>
    );
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
            <th className="px-2 py-2">추적</th>
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
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-xs font-semibold ${d.trackingMode === 'gps' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {TRACKING_MODE_LABEL[d.trackingMode]}
                  </span>
                  {role === 'plant' &&
                    d.trackingMode === 'gps' &&
                    !['returned', 'cancelled'].includes(d.status) && (
                      <TrackLinkButton deliveryId={d.id} />
                    )}
                </div>
              </td>
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
