// 유선 통화를 대체하는 주문별 메시지/이벤트 타임라인

import { useState } from 'react';
import type { OrderEventDto, UserRole } from '@rmc/shared';
import { ORDER_EVENT_ACTOR_LABEL, formatDateTime } from '@rmc/shared';
import { orderApi } from '~/entities/order/api';
import { useOrderAction } from '~/entities/order/queries';
import { Button, EmptyState, inputCls } from '~/shared/ui';

const ACTOR_COLOR: Record<OrderEventDto['actor'], string> = {
  site: 'bg-amber-100 text-amber-800',
  plant: 'bg-blue-100 text-blue-800',
  system: 'bg-slate-100 text-slate-500',
};

export function OrderTimeline({
  orderId,
  events,
  role,
}: {
  orderId: number;
  events: OrderEventDto[];
  role: UserRole;
}) {
  const [message, setMessage] = useState('');
  const send = useOrderAction(orderApi.addMessage);

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    send.mutate([orderId, role, trimmed], { onSuccess: () => setMessage('') });
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <input
          className={inputCls}
          placeholder={role === 'site' ? '업체에 전달할 메시지 (예: 배차 간격 10분으로 줄여주세요)' : '현장에 전달할 메시지 (예: 다음 차량 10분 뒤 출발합니다)'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <Button onClick={handleSend} disabled={send.isPending || !message.trim()}>
          전송
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState message="아직 기록이 없습니다" />
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${ACTOR_COLOR[event.actor]}`}
              >
                {ORDER_EVENT_ACTOR_LABEL[event.actor]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-slate-700">{event.message}</p>
                <p className="text-[11px] text-slate-400">{formatDateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
