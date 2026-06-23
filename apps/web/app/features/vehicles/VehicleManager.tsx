// 업체 차량 관리 — 등록/정비 전환/삭제

import { useState } from 'react';
import { VEHICLE_STATUS_LABEL, formatQuantity } from '@rmc/shared';
import { vehicleApi } from '~/entities/vehicle/api';
import { useVehicleAction, useVehicleList } from '~/entities/vehicle/queries';
import { useAuthStore } from '~/shared/lib/auth.store';
import { Badge, Button, Card, EmptyState, Field, inputCls, Modal, Spinner } from '~/shared/ui';

const STATUS_COLOR = {
  available: '#10b981',
  on_delivery: '#8b5cf6',
  maintenance: '#64748b',
} as const;

function AddVehicleModal({ plantId, onClose }: { plantId: number; onClose: () => void }) {
  const [truckNumber, setTruckNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [capacity, setCapacity] = useState('6');
  const create = useVehicleAction(vehicleApi.create, '차량을 등록했습니다');

  const valid = truckNumber.trim() && driverName.trim() && Number(capacity) > 0;

  function submit() {
    if (!valid) return;
    create.mutate(
      [
        {
          plantId,
          truckNumber: truckNumber.trim(),
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim() || undefined,
          capacityM3: Number(capacity),
        },
      ],
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title="차량 등록" onClose={onClose}>
      <Field label="차량번호">
        <input className={inputCls} placeholder="예) 12가 3456" value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} />
      </Field>
      <Field label="기사 이름">
        <input className={inputCls} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
      </Field>
      <Field label="기사 연락처 (선택)">
        <input className={inputCls} placeholder="010-0000-0000" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
      </Field>
      <Field label="적재량 (m³)">
        <input type="number" step="0.5" className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
          닫기
        </Button>
        <Button onClick={submit} disabled={!valid} loading={create.isPending}>
          등록
        </Button>
      </div>
    </Modal>
  );
}

export function VehicleManager() {
  const { plantId } = useAuthStore();
  const { data: vehicles, isLoading } = useVehicleList(plantId ?? undefined);
  const update = useVehicleAction(vehicleApi.update, '차량 상태를 변경했습니다');
  const remove = useVehicleAction(vehicleApi.remove, '차량을 삭제했습니다');
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) return <Spinner />;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold">보유 차량 ({vehicles?.length ?? 0}대)</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + 차량 등록
        </Button>
      </div>

      {!vehicles || vehicles.length === 0 ? (
        <EmptyState message="등록된 차량이 없습니다" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-2 py-2">차량번호</th>
                <th className="px-2 py-2">기사</th>
                <th className="px-2 py-2">연락처</th>
                <th className="px-2 py-2">적재량</th>
                <th className="px-2 py-2">상태</th>
                <th className="px-2 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="px-2 py-2.5 font-semibold">{v.truckNumber}</td>
                  <td className="px-2 py-2.5">{v.driverName}</td>
                  <td className="px-2 py-2.5 text-xs text-slate-500">{v.driverPhone ?? '-'}</td>
                  <td className="px-2 py-2.5">{formatQuantity(v.capacityM3)}</td>
                  <td className="px-2 py-2.5">
                    <Badge color={STATUS_COLOR[v.status]}>{VEHICLE_STATUS_LABEL[v.status]}</Badge>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1.5">
                      {v.status === 'available' && (
                        <Button size="sm" variant="secondary" onClick={() => update.mutate([v.id, { status: 'maintenance' }])}>
                          정비 전환
                        </Button>
                      )}
                      {v.status === 'maintenance' && (
                        <Button size="sm" variant="secondary" onClick={() => update.mutate([v.id, { status: 'available' }])}>
                          정비 해제
                        </Button>
                      )}
                      {v.status !== 'on_delivery' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => remove.mutate([v.id])}
                          loading={remove.isPending}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && plantId && <AddVehicleModal plantId={plantId} onClose={() => setShowAdd(false)} />}
    </Card>
  );
}
