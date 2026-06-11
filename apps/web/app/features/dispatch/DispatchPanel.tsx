// 업체 화면의 배차 패널 — 가용 차량을 골라 회전을 추가한다

import { useMemo, useState } from 'react';
import type { OrderDto, OrderStatsDto } from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { deliveryApi } from '~/entities/delivery/api';
import { useDeliveryAction } from '~/entities/delivery/queries';
import { useVehicleList } from '~/entities/vehicle/queries';
import { Button, inputCls } from '~/shared/ui';

export function DispatchPanel({ order, stats }: { order: OrderDto; stats: OrderStatsDto }) {
  const { data: vehicles = [] } = useVehicleList(order.plantId);
  const assign = useDeliveryAction(deliveryApi.assign);

  const available = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');

  const selected = available.find((v) => v.id === vehicleId);
  const defaultQty = selected
    ? Math.min(selected.capacityM3, stats.remainingQuantityM3)
    : Math.min(6, stats.remainingQuantityM3);
  const qty = quantity === '' ? defaultQty : Number(quantity);

  const dispatchable = ['accepted', 'in_progress'].includes(order.status);
  const canAssign =
    dispatchable && vehicleId !== '' && qty > 0 && stats.remainingQuantityM3 > 0 && !assign.isPending;

  function handleAssign() {
    if (vehicleId === '') return;
    assign.mutate([order.id, { vehicleId: Number(vehicleId), quantityM3: qty }], {
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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1">
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          차량 선택 (대기 {available.length}대)
        </label>
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
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          수량 (잔여 {formatQuantity(stats.remainingQuantityM3)})
        </label>
        <input
          type="number"
          step="0.5"
          min="0.5"
          className={inputCls}
          value={quantity === '' ? defaultQty : quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>
      <Button onClick={handleAssign} disabled={!canAssign}>
        배차 추가
      </Button>
    </div>
  );
}
