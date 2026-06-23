import { z } from 'zod';

/** 업체가 주문에 차량을 배정해 회전을 생성 */
export const assignDeliverySchema = z.object({
  vehicleId: z.number().int().positive(),
  quantityM3: z
    .number({ error: '운반 수량을 입력하세요' })
    .positive('수량은 0보다 커야 합니다')
    .max(20, '믹서트럭 1대 적재량을 초과합니다'),
  /** 위치 추적 방식 — 기본은 추정(지도거리 기반) */
  trackingMode: z.enum(['gps', 'estimated']).default('estimated'),
});

export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;

/** 잔여 수량을 가용 차량으로 한 번에 채우는 일괄 배차 — 추적 방식만 받는다 */
export const autoAssignSchema = z.object({
  trackingMode: z.enum(['gps', 'estimated']).default('estimated'),
});

export type AutoAssignInput = z.infer<typeof autoAssignSchema>;

/** 기사 폰이 전송하는 위치 좌표 */
export const locationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type LocationPingInput = z.infer<typeof locationPingSchema>;
