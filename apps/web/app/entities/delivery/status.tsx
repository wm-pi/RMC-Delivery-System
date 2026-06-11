import type { DeliveryStatus } from '@rmc/shared';
import { DELIVERY_STATUS_LABEL } from '@rmc/shared';
import { Badge } from '~/shared/ui';

export const DELIVERY_STATUS_COLOR: Record<DeliveryStatus, string> = {
  assigned: '#f59e0b',
  loading: '#0ea5e9',
  in_transit: '#8b5cf6',
  arrived: '#2563eb',
  pouring: '#f97316',
  returning: '#14b8a6',
  returned: '#6b7280',
  cancelled: '#ef4444',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge color={DELIVERY_STATUS_COLOR[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>;
}
