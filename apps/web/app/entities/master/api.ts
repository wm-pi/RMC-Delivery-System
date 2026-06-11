import type { PlantDto, SiteDto } from '@rmc/shared';
import { api } from '~/shared/api/client';

export const masterApi = {
  plants: () => api.get<PlantDto[]>('/plants'),
  sites: () => api.get<SiteDto[]>('/sites'),
};
