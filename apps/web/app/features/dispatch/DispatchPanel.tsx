// 업체 화면의 배차 패널 — 잔여 수량을 가용 차량으로 한 번에 채우는 일괄 배차가 기본.
// 한 대씩 세밀하게 조정할 때만 "직접 선택"을 펼친다.

import { useMemo, useState } from 'react';
import type { OrderDto, OrderStatsDto, TrackingMode } from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { deliveryApi } from '~/entities/delivery/api';
import { useDeliveryAction } from '~/entities/delivery/queries';
import { useVehicleList } from '~/entities/vehicle/queries';
import { toast } from '~/shared/lib/toast.store';
import { Button, inputCls } from '~/shared/ui';

export function DispatchPanel({ order, stats }: { readonly order: OrderDto; readonly stats: OrderStatsDto }) {
  const { data: vehicles = [] } = useVehicleList(order.plantId);
  const assign = useDeliveryAction(deliveryApi.assign, '배차를 추가했습니다');
  const assignAuto = useDeliveryAction(deliveryApi.assignAuto);

  const available = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('estimated');
  const [showManual, setShowManual] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');

  // 일괄 배차 미리보기 — 적재량 큰 차량부터 잔여 수량을 채우면 몇 대가 필요한지
  const preview = useMemo(() => {
    const sorted = [...available].sort((a, b) => b.capacityM3 - a.capacityM3);
    let remaining = stats.remainingQuantityM3;
    let count = 0;
    let filled = 0;
    for (const v of sorted) {
      if (remaining <= 1e-9) break;
      const q = Math.round(Math.min(v.capacityM3, remaining) * 10) / 10;
      if (q <= 0) break;
      count += 1;
      filled += q;
      remaining -= q;
    }
    return { count, filled, leftover: Math.max(0, Math.round((stats.remainingQuantityM3 - filled) * 10) / 10) };
  }, [available, stats.remainingQuantityM3]);

  const selected = available.find((v) => v.id === vehicleId);
  const defaultQty = selected
    ? Math.min(selected.capacityM3, stats.remainingQuantityM3)
    : Math.min(6, stats.remainingQuantityM3);
  const qty = quantity === '' ? defaultQty : Number(quantity);

  const dispatchable = ['accepted', 'in_progress'].includes(order.status);

  function handleAssignAuto() {
    assignAuto.mutate([order.id, trackingMode], {
      onSuccess: () => toast.success(`${preview.count}대 일괄 배차했습니다`),
    });
  }

  function handleAssign() {
    if (vehicleId === '') return;
    assign.mutate([order.id, { vehicleId: Number(vehicleId), quantityM3: qty, trackingMode }], {
      onSuccess: () => {
        setVehicleId('');
        setQuantity('');
      },
    });
  }

  if (order.status === 'paused') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        현장이 배차를 일시 중단했습니다. 재개 요청이 올 때까지 추가 출발을 보류하세요.
      </div>
    );
  }

  if (!dispatchable) return null;

  if (stats.remainingQuantityM3 <= 0) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        주문 수량이 모두 배차되었습니다.
      </div>
    );
  }

  const noVehicles = available.length === 0;

  return (
    <div className="space-y-3">
      {/* 위치 추적 방식 (일괄·직접 공통) */}
      <div className="flex items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-semibold text-slate-600">위치 추적 방식</label>
          <select
            className={inputCls}
            value={trackingMode}
            onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}
          >
            <option value="estimated">추정 (지도거리)</option>
            <option value="gps">실측 (기사 폰)</option>
          </select>
        </div>
        <div className="flex-1 text-xs text-slate-500">
          잔여 {formatQuantity(stats.remainingQuantityM3)} · 대기 차량 {available.length}대
        </div>
      </div>

      {/* 기본: 필요한 만큼 한 번에 일괄 배차 */}
      {noVehicles ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          배차할 수 있는 대기 차량이 없습니다.
        </div>
      ) : (
        <Button onClick={handleAssignAuto} loading={assignAuto.isPending} className="w-full justify-center py-3">
          가용 차량 {preview.count}대로 일괄 배차 (약 {formatQuantity(preview.filled)})
          {preview.leftover > 0 ? ` · ${formatQuantity(preview.leftover)} 남음` : ''}
        </Button>
      )}

      {/* 고급: 한 대씩 직접 선택 */}
      <button
        type="button"
        className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        onClick={() => setShowManual((v) => !v)}
      >
        {showManual ? '직접 선택 닫기' : '한 대씩 직접 선택'}
      </button>

      {showManual && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-44 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600">차량 선택</label>
            <select
              className={inputCls}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">차량을 선택하세요</option>
              {available.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.truckNumber} · {v.driverName} ({formatQuantity(v.capacityM3)})
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-semibold text-slate-600">수량 (m³)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max={stats.remainingQuantityM3}
              className={inputCls}
              value={quantity === '' ? defaultQty : quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleAssign}
            disabled={vehicleId === '' || qty <= 0}
            loading={assign.isPending}
          >
            한 대 추가
          </Button>
        </div>
      )}
    </div>
  );
}
