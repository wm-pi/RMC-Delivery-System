import type {
  AuthUserDto,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleDto,
  VehicleStatus,
} from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { assertRole } from '../../platform/auth/authorize';
import { VehicleRepository } from './vehicle.repository';

/** 차량은 공장 자원 — 업체 사용자가 자기 공장 차량만 다룰 수 있게 한다 */
function assertVehicleOwnership(actor: AuthUserDto, vehicle: VehicleDto): void {
  if (vehicle.plantId !== actor.plantId) {
    throw AppError.forbidden('이 차량에 접근할 권한이 없습니다');
  }
}

export const VehicleService = {
  /** 업체: 자기 공장 차량 목록 (plantId는 토큰에서 강제) */
  list(actor: AuthUserDto): VehicleDto[] {
    assertRole(actor, 'plant', '차량을 조회');
    return VehicleRepository.findAll(actor.plantId ?? -1);
  },

  getById(id: number): VehicleDto {
    const vehicle = VehicleRepository.findById(id);
    if (!vehicle) throw AppError.notFound('차량을 찾을 수 없습니다');
    return vehicle;
  },

  getOwned(actor: AuthUserDto, id: number): VehicleDto {
    assertRole(actor, 'plant', '차량을 조회');
    const vehicle = this.getById(id);
    assertVehicleOwnership(actor, vehicle);
    return vehicle;
  },

  create(actor: AuthUserDto, input: CreateVehicleInput): VehicleDto {
    assertRole(actor, 'plant', '차량을 등록');
    if (VehicleRepository.findByTruckNumber(input.truckNumber)) {
      throw AppError.conflict(`이미 등록된 차량번호입니다: ${input.truckNumber}`);
    }
    // 소속 공장은 토큰에서 강제 — 클라이언트가 보낸 plantId는 신뢰하지 않는다
    return VehicleRepository.create({ ...input, plantId: actor.plantId ?? -1 });
  },

  update(actor: AuthUserDto, id: number, input: UpdateVehicleInput): VehicleDto {
    this.getOwned(actor, id);
    if (input.truckNumber) {
      const dup = VehicleRepository.findByTruckNumber(input.truckNumber);
      if (dup && dup.id !== id) {
        throw AppError.conflict(`이미 등록된 차량번호입니다: ${input.truckNumber}`);
      }
    }
    // 소속 공장 이전은 막는다 (다른 공장으로 탈취 방지)
    return VehicleRepository.update(id, { ...input, plantId: actor.plantId ?? -1 })!;
  },

  remove(actor: AuthUserDto, id: number): void {
    const vehicle = this.getOwned(actor, id);
    if (vehicle.status === 'on_delivery') {
      throw AppError.invalidState('운행 중인 차량은 삭제할 수 없습니다');
    }
    VehicleRepository.remove(id);
  },

  /** 배차 도메인에서 호출하는 내부 메서드 — 차량 가용 상태 전환 */
  setStatus(id: number, status: VehicleStatus): void {
    this.getById(id);
    VehicleRepository.updateStatus(id, status);
  },
};
