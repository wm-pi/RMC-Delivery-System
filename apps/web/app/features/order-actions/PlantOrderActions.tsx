// 업체 주문 액션 — 접수 / 거절

import type { OrderDto } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { useOrderAction } from '~/entities/order/queries';
import { Button } from '~/shared/ui';

export function PlantOrderActions({ order }: { order: OrderDto }) {
  const accept = useOrderAction(orderApi.accept);
  const reject = useOrderAction(orderApi.reject);

  if (order.status !== 'requested') return null;

  return (
    <div className="flex gap-2">
      <Button variant="success" onClick={() => accept.mutate([order.id])} disabled={accept.isPending}>
        주문 접수
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          const reason = prompt('거절 사유를 입력하세요 (선택)') ?? undefined;
          reject.mutate([order.id, reason || undefined]);
        }}
        disabled={reject.isPending}
      >
        거절
      </Button>
    </div>
  );
}
