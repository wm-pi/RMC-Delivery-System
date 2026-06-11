import type { CreateVehicleInput, UpdateVehicleInput, VehicleDto } from '@rmc/shared';
import { api } from '~/shared/api/client';

export const vehicleApi = {
  list: (plantId?: number) =>
    api.get<VehicleDto[]>(`/vehicles${plantId ? `?plantId=${plantId}` : ''}`),
  create: (input: CreateVehicleInput) => api.post<VehicleDto>('/vehicles', input),
  update: (id: number, input: UpdateVehicleInput) => api.put<VehicleDto>(`/vehicles/${id}`, input),
  remove: (id: number) => api.delete<{ deleted: boolean }>(`/vehicles/${id}`),
};
