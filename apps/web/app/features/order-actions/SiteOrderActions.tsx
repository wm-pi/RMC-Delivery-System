// 현장 주문 액션 — 대수(수량) 조절, 일시중단/재개, 완료, 취소

import { useState } from 'react';
import type { OrderDto, OrderStatsDto } from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { useOrderAction } from '~/entities/order/queries';
import { Button, Field, inputCls, Modal } from '~/shared/ui';

/** 기본 1대 분량 — 빠른 +1대/-1대 버튼에 사용 */
const ONE_TRUCK_M3 = 6;

function AdjustModal({
  order,
  stats,
  onClose,
}: {
  order: OrderDto;
  stats: OrderStatsDto;
  onClose: () => void;
}) {
  const [total, setTotal] = useState(String(order.totalQuantityM3));
  const [reason, setReason] = useState('');
  const adjust = useOrderAction(orderApi.adjust);

  const totalNum = Number(total);
  const minTotal = stats.assignedQuantityM3;
  const valid = !Number.isNaN(totalNum) && totalNum > 0 && totalNum >= minTotal;
  const deltaTrucks = valid ? Math.round(((totalNum - order.totalQuantityM3) / ONE_TRUCK_M3) * 10) / 10 : 0;

  function submit() {
    if (!valid) return;
    adjust.mutate([order.id, { totalQuantityM3: totalNum, reason: reason.trim() || undefined }], {
      onSuccess: onClose,
    });
  }

  return (
    <Modal title="수량(대수) 조절" onClose={onClose}>
      <p className="mb-3 text-xs text-slate-500">
        현재 총 {formatQuantity(order.totalQuantityM3)} · 배차 완료 {formatQuantity(stats.assignedQuantityM3)} ·
        이미 배차된 수량 아래로는 줄일 수 없습니다.
      </p>
      <div className="mb-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTotal(String(Math.max(minTotal, totalNum - ONE_TRUCK_M3)))}
        >
          −1대 ({ONE_TRUCK_M3}m³)
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setTotal(String(totalNum + ONE_TRUCK_M3))}>
          +1대 ({ONE_TRUCK_M3}m³)
        </Button>
      </div>
      <Field label="변경할 총 수량 (m³)">
        <input type="number" step="0.5" className={inputCls} value={total} onChange={(e) => setTotal(e.target.value)} />
      </Field>
      <Field label="사유 (선택)">
        <input
          className={inputCls}
          placeholder="예) 물량 산출 변경, 타설 구간 추가"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      {valid && deltaTrucks !== 0 && (
        <p className="mb-3 text-xs font-semibold text-blue-600">
          약 {Math.abs(deltaTrucks)}대 {deltaTrucks > 0 ? '추가' : '감소'} 요청입니다
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
        <Button onClick={submit} disabled={!valid || adjust.isPending}>
          조절 요청
        </Button>
      </div>
    </Modal>
  );
}

export function SiteOrderActions({ order, stats }: { order: OrderDto; stats: OrderStatsDto }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const pause = useOrderAction(orderApi.pause);
  const resume = useOrderAction(orderApi.resume);
  const complete = useOrderAction(orderApi.complete);
  const cancel = useOrderAction(orderApi.cancel);

  const { status } = order;
  const adjustable = ['requested', 'accepted', 'in_progress', 'paused'].includes(status);

  return (
    <div className="flex flex-wrap gap-2">
      {adjustable && (
        <Button variant="secondary" onClick={() => setShowAdjust(true)}>
          수량(대수) 조절
        </Button>
      )}
      {(status === 'accepted' || status === 'in_progress') && (
        <Button
          variant="warning"
          onClick={() => {
            if (confirm('배차를 일시 중단할까요? 업체에 추가 출발 보류가 전달됩니다.')) pause.mutate([order.id]);
          }}
        >
          배차 일시 중단
        </Button>
      )}
      {status === 'paused' && (
        <Button variant="success" onClick={() => resume.mutate([order.id])}>
          배차 재개
        </Button>
      )}
      {['accepted', 'in_progress', 'paused'].includes(status) && (
        <Button
          variant="success"
          onClick={() => {
            if (confirm('이 주문을 타설 완료 처리할까요?')) complete.mutate([order.id]);
          }}
        >
          타설 완료 처리
        </Button>
      )}
      {['requested', 'accepted', 'paused'].includes(status) && (
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('주문을 취소할까요?')) cancel.mutate([order.id]);
          }}
        >
          주문 취소
        </Button>
      )}

      {showAdjust && <AdjustModal order={order} stats={stats} onClose={() => setShowAdjust(false)} />}
    </div>
  );
}
