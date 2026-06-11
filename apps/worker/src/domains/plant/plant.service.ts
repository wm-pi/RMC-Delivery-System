import type { CreatePlantInput, PlantDto } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { PlantRepository } from './plant.repository';

export const PlantService = {
  list(): PlantDto[] {
    return PlantRepository.findAll();
  },

  getById(id: number): PlantDto {
    const plant = PlantRepository.findById(id);
    if (!plant) throw AppError.notFound('레미콘 공장을 찾을 수 없습니다');
    return plant;
  },

  create(input: CreatePlantInput): PlantDto {
    return PlantRepository.create(input);
  },
};
