import { z } from 'zod';

const latLngFields = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};

export const createPlantSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력하세요').max(100),
  address: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(50).optional(),
  ...latLngFields,
});

export type CreatePlantInput = z.infer<typeof createPlantSchema>;

export const createSiteSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력하세요').max(100),
  address: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(50).optional(),
  ...latLngFields,
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const createVehicleSchema = z.object({
  plantId: z.number().int().positive(),
  truckNumber: z.string().trim().min(1, '차량번호를 입력하세요').max(20),
  driverName: z.string().trim().min(1, '기사 이름을 입력하세요').max(50),
  driverPhone: z.string().trim().max(20).optional(),
  capacityM3: z.number().positive().max(20).default(6),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(['available', 'on_delivery', 'maintenance']).optional(),
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
