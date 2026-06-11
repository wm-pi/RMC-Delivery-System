import { z } from 'zod';

// 호칭강도-슬럼프-굵은골재 형식 (예: 25-24-150). 자유 입력도 허용하되 공백은 금지.
export const concreteGradeSchema = z
  .string()
  .trim()
  .min(1, '규격을 입력하세요')
  .max(30, '규격이 너무 깁니다');

export const createOrderSchema = z.object({
  siteId: z.number().int().positive(),
  plantId: z.number().int().positive(),
  concreteGrade: concreteGradeSchema,
  totalQuantityM3: z
    .number({ error: '수량을 입력하세요' })
    .positive('수량은 0보다 커야 합니다')
    .max(10000, '수량이 너무 큽니다'),
  truckIntervalMin: z.number().int().min(0).max(180).default(15),
  requestedAt: z.string().min(1, '납품 희망 일시를 선택하세요'),
  notes: z.string().trim().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** 대수(수량) 조절 — 유선으로 하던 "n대 더/덜 보내주세요"를 대체 */
export const adjustOrderSchema = z.object({
  totalQuantityM3: z
    .number({ error: '변경할 총 수량을 입력하세요' })
    .positive('수량은 0보다 커야 합니다')
    .max(10000),
  reason: z.string().trim().max(300).optional(),
});

export type AdjustOrderInput = z.infer<typeof adjustOrderSchema>;

export const orderMessageSchema = z.object({
  actor: z.enum(['site', 'plant']),
  message: z.string().trim().min(1, '메시지를 입력하세요').max(500),
});

export type OrderMessageInput = z.infer<typeof orderMessageSchema>;

export const rejectOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const orderListQuerySchema = z.object({
  siteId: z.coerce.number().int().positive().optional(),
  plantId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD')
    .optional(),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
