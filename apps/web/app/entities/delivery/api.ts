import type {
  ActiveDeliveryDto,
  AssignDeliveryInput,
  DeliveryDto,
  DriverLinkDto,
  RoutePathDto,
} from '@rmc/shared';
import { api } from '~/shared/api/client';

export const deliveryApi = {
  listActive: () => api.get<ActiveDeliveryDto[]>('/deliveries/active'),
  assign: (orderId: number, input: AssignDeliveryInput) =>
    api.post<DeliveryDto>(`/orders/${orderId}/deliveries`, input),
  trackLink: (id: number) => api.get<DriverLinkDto>(`/deliveries/${id}/track-link`),
  route: (id: number) => api.get<RoutePathDto>(`/deliveries/${id}/route`),
  load: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/load`),
  dispatch: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/dispatch`),
  pouringStart: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/pouring-start`),
  pouringEnd: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/pouring-end`),
  cancel: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/cancel`),
};
