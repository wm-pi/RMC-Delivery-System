import type {
  ActiveDeliveryDto,
  AssignDeliveryInput,
  DeliveryDto,
  DriverLinkDto,
  RoutePathDto,
  TrackingMode,
} from '@rmc/shared';
import { api } from '~/shared/api/client';

export const deliveryApi = {
  listActive: () => api.get<ActiveDeliveryDto[]>('/deliveries/active'),
  assign: (orderId: number, input: AssignDeliveryInput) =>
    api.post<DeliveryDto>(`/orders/${orderId}/deliveries`, input),
  /** 잔여 수량을 가용 차량으로 한 번에 채우는 일괄 배차 */
  assignAuto: (orderId: number, trackingMode: TrackingMode) =>
    api.post<DeliveryDto[]>(`/orders/${orderId}/deliveries/auto`, { trackingMode }),
  trackLink: (id: number) => api.get<DriverLinkDto>(`/deliveries/${id}/track-link`),
  route: (id: number) => api.get<RoutePathDto>(`/deliveries/${id}/route`),
  /** 출발 (상차+출발 통합) */
  depart: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/depart`),
  /** 타설 완료 (타설 시작+완료 통합) */
  pourComplete: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/pour-complete`),
  cancel: (id: number) => api.post<DeliveryDto>(`/deliveries/${id}/cancel`),
};
