import type { OrderStatus } from '@rmc/shared';
import { ORDER_STATUS_LABEL } from '@rmc/shared';
import { Badge } from '~/shared/ui';

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  requested: '#f59e0b',
  accepted: '#3b82f6',
  in_progress: '#8b5cf6',
  paused: '#64748b',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#ef4444',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge color={ORDER_STATUS_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
