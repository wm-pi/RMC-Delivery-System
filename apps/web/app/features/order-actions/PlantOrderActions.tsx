// 업체 주문 액션 — 접수 / 거절. 거절 사유는 native prompt 대신 인라인 입력으로 받는다.

import { useState } from 'react';
import type { OrderDto } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { useOrderAction } from '~/entities/order/queries';
import { toast } from '~/shared/lib/toast.store';
import { Button, inputCls } from '~/shared/ui';

export function PlantOrderActions({ order }: { readonly order: OrderDto }) {
  const accept = useOrderAction(orderApi.accept, '주문을 접수했습니다');
  const reject = useOrderAction(orderApi.reject);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (order.status !== 'requested') return null;

  function submitReject() {
    reject.mutate([order.id, reason.trim() || undefined], {
      onSuccess: () => {
        toast.info('주문을 거절했습니다');
        setRejecting(false);
        setReason('');
      },
    });
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          className={`${inputCls} w-48`}
          placeholder="거절 사유 (선택)"
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitReject();
            if (e.key === 'Escape') setRejecting(false);
          }}
        />
        <Button size="sm" variant="danger" onClick={submitReject} loading={reject.isPending}>
          거절 확정
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setRejecting(false)} disabled={reject.isPending}>
          취소
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="success" onClick={() => accept.mutate([order.id])} loading={accept.isPending}>
        주문 접수
      </Button>
      <Button variant="secondary" onClick={() => setRejecting(true)}>
        거절
      </Button>
    </div>
  );
}
