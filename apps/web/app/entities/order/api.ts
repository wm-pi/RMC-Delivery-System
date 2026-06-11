import type {
  AdjustOrderInput,
  CreateOrderInput,
  OrderDetailDto,
  OrderDto,
  OrderEventDto,
  OrderListItemDto,
} from '@rmc/shared';
import { api } from '~/shared/api/client';

export interface OrderListFilter {
  siteId?: number;
  plantId?: number;
  status?: string;
}

export const orderApi = {
  list(filter: OrderListFilter): Promise<OrderListItemDto[]> {
    const params = new URLSearchParams();
    if (filter.siteId) params.set('siteId', String(filter.siteId));
    if (filter.plantId) params.set('plantId', String(filter.plantId));
    if (filter.status) params.set('status', filter.status);
    const qs = params.toString();
    return api.get(`/orders${qs ? `?${qs}` : ''}`);
  },
  detail: (id: number) => api.get<OrderDetailDto>(`/orders/${id}`),
  create: (input: CreateOrderInput) => api.post<OrderDto>('/orders', input),
  accept: (id: number) => api.post<OrderDto>(`/orders/${id}/accept`),
  reject: (id: number, reason?: string) => api.post<OrderDto>(`/orders/${id}/reject`, { reason }),
  cancel: (id: number) => api.post<OrderDto>(`/orders/${id}/cancel`),
  pause: (id: number) => api.post<OrderDto>(`/orders/${id}/pause`),
  resume: (id: number) => api.post<OrderDto>(`/orders/${id}/resume`),
  complete: (id: number) => api.post<OrderDto>(`/orders/${id}/complete`),
  adjust: (id: number, input: AdjustOrderInput) => api.post<OrderDto>(`/orders/${id}/adjust`, input),
  addMessage: (id: number, actor: 'site' | 'plant', message: string) =>
    api.post<OrderEventDto>(`/orders/${id}/messages`, { actor, message }),
};
