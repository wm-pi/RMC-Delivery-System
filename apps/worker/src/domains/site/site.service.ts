import type { CreateSiteInput, SiteDto } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { SiteRepository } from './site.repository';

export const SiteService = {
  list(): SiteDto[] {
    return SiteRepository.findAll();
  },

  getById(id: number): SiteDto {
    const site = SiteRepository.findById(id);
    if (!site) throw AppError.notFound('현장을 찾을 수 없습니다');
    return site;
  },

  create(input: CreateSiteInput): SiteDto {
    return SiteRepository.create(input);
  },
};
