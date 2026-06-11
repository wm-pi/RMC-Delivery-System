import type { CreateVehicleInput, UpdateVehicleInput, VehicleDto, VehicleStatus } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { VehicleRepository } from './vehicle.repository';

export const VehicleService = {
  list(plantId?: number): VehicleDto[] {
    return VehicleRepository.findAll(plantId);
  },

  getById(id: number): VehicleDto {
    const vehicle = VehicleRepository.findById(id);
    if (!vehicle) throw AppError.notFound('차량을 찾을 수 없습니다');
    return vehicle;
  },

  create(input: CreateVehicleInput): VehicleDto {
    if (VehicleRepository.findByTruckNumber(input.truckNumber)) {
      throw AppError.conflict(`이미 등록된 차량번호입니다: ${input.truckNumber}`);
    }
    return VehicleRepository.create(input);
  },

  update(id: number, input: UpdateVehicleInput): VehicleDto {
    this.getById(id);
    if (input.truckNumber) {
      const dup = VehicleRepository.findByTruckNumber(input.truckNumber);
      if (dup && dup.id !== id) {
        throw AppError.conflict(`이미 등록된 차량번호입니다: ${input.truckNumber}`);
      }
    }
    return VehicleRepository.update(id, input)!;
  },

  remove(id: number): void {
    const vehicle = this.getById(id);
    if (vehicle.status === 'on_delivery') {
      throw AppError.invalidState('운행 중인 차량은 삭제할 수 없습니다');
    }
    VehicleRepository.remove(id);
  },

  /** 배차 도메인에서 호출하는 공개 메서드 — 차량 가용 상태 전환 */
  setStatus(id: number, status: VehicleStatus): void {
    this.getById(id);
    VehicleRepository.updateStatus(id, status);
  },
};
