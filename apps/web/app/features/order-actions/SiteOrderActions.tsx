// 현장 주문 액션 — 인라인 수량(대수) 조절, 일시중단/재개, 완료, 취소
// 클릭 최소화: 수량 조절은 모달 없이 ±1대 인라인. 영향 큰 완료/취소만 확인 dialog.

import { useState } from 'react';
import type { OrderDto, OrderStatsDto } from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { useOrderAction } from '~/entities/order/queries';
import { toast } from '~/shared/lib/toast.store';
import { Button, ConfirmDialog } from '~/shared/ui';

/** 기본 1대 분량 — 빠른 +1대/-1대 버튼에 사용 */
const ONE_TRUCK_M3 = 6;

/** 모달 없이 ±1대로 즉시 조절하는 인라인 스텝퍼 */
function QuantityStepper({ order, stats }: { readonly order: OrderDto; readonly stats: OrderStatsDto }) {
  const adjust = useOrderAction(orderApi.adjust);
  const minTotal = stats.assignedQuantityM3;

  function applyDelta(delta: number) {
    const next = Math.round((order.totalQuantityM3 + delta) * 10) / 10;
    if (next < minTotal) {
      toast.error(`이미 배차된 ${formatQuantity(minTotal)} 아래로는 줄일 수 없습니다`);
      return;
    }
    adjust.mutate([order.id, { totalQuantityM3: next }], {
      onSuccess: () => toast.success(`총 수량 ${formatQuantity(next)}(으)로 조절했습니다`),
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">수량 조절</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => applyDelta(-ONE_TRUCK_M3)}
        disabled={adjust.isPending || order.totalQuantityM3 - ONE_TRUCK_M3 < minTotal}
      >
        −1대
      </Button>
      <span className="min-w-16 text-center text-sm font-bold">{formatQuantity(order.totalQuantityM3)}</span>
      <Button size="sm" variant="secondary" onClick={() => applyDelta(ONE_TRUCK_M3)} disabled={adjust.isPending}>
        +1대
      </Button>
    </div>
  );
}

export function SiteOrderActions({ order, stats }: { readonly order: OrderDto; readonly stats: OrderStatsDto }) {
  const [confirm, setConfirm] = useState<'complete' | 'cancel' | null>(null);
  const resume = useOrderAction(orderApi.resume, '배차를 재개했습니다');
  const pause = useOrderAction(orderApi.pause);
  const complete = useOrderAction(orderApi.complete);
  const cancel = useOrderAction(orderApi.cancel);

  const { status } = order;
  const adjustable = ['requested', 'accepted', 'in_progress', 'paused'].includes(status);

  function handlePause() {
    // 일시 중단은 되돌리기 쉬움 — 확인 대신 즉시 실행 + undo 토스트
    pause.mutate([order.id], {
      onSuccess: () =>
        toast.info('배차를 일시 중단했습니다', {
          label: '재개',
          onClick: () => resume.mutate([order.id]),
        }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {adjustable && <QuantityStepper order={order} stats={stats} />}

      {(status === 'accepted' || status === 'in_progress') && (
        <Button variant="warning" onClick={handlePause} loading={pause.isPending}>
          배차 일시 중단
        </Button>
      )}
      {status === 'paused' && (
        <Button variant="success" onClick={() => resume.mutate([order.id])} loading={resume.isPending}>
          배차 재개
        </Button>
      )}
      {['accepted', 'in_progress', 'paused'].includes(status) && (
        <Button variant="success" onClick={() => setConfirm('complete')}>
          타설 완료 처리
        </Button>
      )}
      {['requested', 'accepted', 'paused'].includes(status) && (
        <Button variant="danger" onClick={() => setConfirm('cancel')}>
          주문 취소
        </Button>
      )}

      {confirm === 'complete' && (
        <ConfirmDialog
          title="타설 완료 처리"
          confirmLabel="완료 처리"
          confirmVariant="success"
          loading={complete.isPending}
          description={
            <>
              이 주문을 <b>타설 완료</b>로 종료합니다. 종료 후에는 추가 배차를 할 수 없습니다.
              <br />
              지금까지 타설 {formatQuantity(stats.pouredQuantityM3)} ({stats.pouredCount}회전)
            </>
          }
          onConfirm={() =>
            complete.mutate([order.id], {
              onSuccess: () => {
                toast.success('주문을 타설 완료 처리했습니다');
                setConfirm(null);
              },
            })
          }
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'cancel' && (
        <ConfirmDialog
          title="주문 취소"
          confirmLabel="주문 취소"
          loading={cancel.isPending}
          description={<>이 주문을 취소합니다. 되돌릴 수 없습니다.</>}
          onConfirm={() =>
            cancel.mutate([order.id], {
              onSuccess: () => {
                toast.success('주문을 취소했습니다');
                setConfirm(null);
              },
            })
          }
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
