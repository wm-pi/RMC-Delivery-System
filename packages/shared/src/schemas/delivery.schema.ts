import { z } from 'zod';

/** 업체가 주문에 차량을 배정해 회전을 생성 */
export const assignDeliverySchema = z.object({
  vehicleId: z.number().int().positive(),
  quantityM3: z
    .number({ error: '운반 수량을 입력하세요' })
    .positive('수량은 0보다 커야 합니다')
    .max(20, '믹서트럭 1대 적재량을 초과합니다'),
});

export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;
