import type {
  ActiveDeliveryDto,
  AssignDeliveryInput,
  AuthUserDto,
  DeliveryDto,
  DeliveryStatus,
  DriverLinkDto,
  LatLng,
  UserRole,
} from '@rmc/shared';
import { DELIVERY_TRANSITIONS, formatQuantity } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { assertOrderOwnership, assertRole } from '../../platform/auth/authorize';
import { signDriverToken } from '../../platform/auth/jwt';
import { nowIso } from '../../platform/db/client';
import { OrderService } from '../order/order.service';
import { PlantService } from '../plant/plant.service';
import { VehicleService } from '../vehicle/vehicle.service';
import { DeliveryRepository } from './delivery.repository';

function assertTransition(current: DeliveryStatus, target: DeliveryStatus): void {
  if (!DELIVERY_TRANSITIONS[current].includes(target)) {
    throw AppError.invalidState(`배차 상태를 ${current} → ${target}(으)로 변경할 수 없습니다`);
  }
}

/** 역할 검증 + 배차 소유권(상위 주문 기준) 검증 후 배차를 반환 */
function loadOwnedDelivery(actor: AuthUserDto, id: number, requiredRole: UserRole, action: string): DeliveryDto {
  assertRole(actor, requiredRole, action);
  const delivery = DeliveryService.getById(id);
  const order = OrderService.getById(delivery.orderId);
  assertOrderOwnership(actor, order);
  return delivery;
}

export const DeliveryService = {
  listByOrder(orderId: number): DeliveryDto[] {
    return DeliveryRepository.findByOrderId(orderId);
  },

  /** 실시간 지도/현황 — 자기 테넌트의 활성 배차만 반환 */
  listActive(actor: AuthUserDto): ActiveDeliveryDto[] {
    const all = DeliveryRepository.findActive();
    return all.filter((d) =>
      actor.role === 'site' ? d.siteId === actor.siteId : d.plantId === actor.plantId,
    );
  },

  getById(id: number): DeliveryDto {
    const delivery = DeliveryRepository.findById(id);
    if (!delivery) throw AppError.notFound('배차를 찾을 수 없습니다');
    return delivery;
  },

  /** 업체: 주문에 차량 배정 (회전 생성) */
  assign(actor: AuthUserDto, orderId: number, input: AssignDeliveryInput): DeliveryDto {
    assertRole(actor, 'plant', '배차');
    const { order, remainingQuantityM3 } = OrderService.assertDispatchable(orderId);
    assertOrderOwnership(actor, order);

    const vehicle = VehicleService.getById(input.vehicleId);
    if (vehicle.plantId !== order.plantId) {
      throw AppError.invalidState('해당 공장 소속 차량이 아닙니다');
    }
    if (vehicle.status !== 'available') {
      throw AppError.invalidState(`현재 배차할 수 없는 차량입니다 (${vehicle.status})`);
    }
    if (remainingQuantityM3 <= 0) {
      throw AppError.invalidState('주문 수량이 모두 배차되었습니다. 현장에 수량 조절을 요청하세요.');
    }
    if (input.quantityM3 > remainingQuantityM3 + 1e-9) {
      throw AppError.invalidState(`잔여 수량(${formatQuantity(remainingQuantityM3)})을 초과해 배차할 수 없습니다`);
    }
    if (input.quantityM3 > vehicle.capacityM3 + 1e-9) {
      throw AppError.invalidState(`차량 적재량(${formatQuantity(vehicle.capacityM3)})을 초과합니다`);
    }

    const plant = PlantService.getById(order.plantId);
    const delivery = DeliveryRepository.create({
      orderId,
      vehicleId: input.vehicleId,
      seq: DeliveryRepository.nextSeq(orderId),
      quantityM3: input.quantityM3,
      lat: plant.lat,
      lng: plant.lng,
      trackingMode: input.trackingMode,
    });
    VehicleService.setStatus(input.vehicleId, 'on_delivery');
    OrderService.addEvent(
      orderId,
      'plant',
      'dispatch',
      `${delivery.seq}호차 ${vehicle.truckNumber} 배정 (${formatQuantity(input.quantityM3)})`,
    );
    return delivery;
  },

  /** 업체: 기사 추적 링크(서명 토큰) 발급 — gps 모드 배차에 한함 */
  async getDriverLink(actor: AuthUserDto, id: number): Promise<DriverLinkDto> {
    const delivery = loadOwnedDelivery(actor, id, 'plant', '기사 링크 발급');
    if (delivery.trackingMode !== 'gps') {
      throw AppError.invalidState('실측(GPS) 모드 배차에서만 기사 추적 링크를 발급할 수 있습니다');
    }
    const token = await signDriverToken(id);
    return { token, path: `/track/${id}?t=${token}` };
  },

  /** 업체: 상차 시작 */
  startLoading(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'plant', '상차 처리');
    assertTransition(delivery.status, 'loading');
    DeliveryRepository.updateStatus(id, 'loading');
    return this.getById(id);
  },

  /** 업체: 출발 — 운송 시작, 주문을 운송 중으로 전환 */
  dispatch(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'plant', '출발 처리');
    assertTransition(delivery.status, 'in_transit');
    DeliveryRepository.updateStatus(id, 'in_transit', { dispatched_at: nowIso() });
    OrderService.markInProgress(delivery.orderId);
    OrderService.addEvent(
      delivery.orderId,
      'plant',
      'dispatch',
      `${delivery.seq}호차 ${delivery.truckNumber} 출발 (${formatQuantity(delivery.quantityM3)})`,
    );
    return this.getById(id);
  },

  /** 현장: 타설 시작 */
  startPouring(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'site', '타설 시작 처리');
    assertTransition(delivery.status, 'pouring');
    DeliveryRepository.updateStatus(id, 'pouring', { pouring_started_at: nowIso() });
    OrderService.addEvent(delivery.orderId, 'site', 'status', `${delivery.seq}호차 타설 시작`);
    return this.getById(id);
  },

  /** 현장: 타설 완료 — 차량은 공장으로 복귀 시작 */
  endPouring(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'site', '타설 완료 처리');
    assertTransition(delivery.status, 'returning');
    DeliveryRepository.updateStatus(
      id,
      'returning',
      { pouring_ended_at: nowIso() },
      // 복귀 구간은 progress 0부터 다시 시작
      { lat: delivery.lat ?? 0, lng: delivery.lng ?? 0, progress: 0 },
    );
    OrderService.addEvent(
      delivery.orderId,
      'site',
      'status',
      `${delivery.seq}호차 타설 완료 (${formatQuantity(delivery.quantityM3)})`,
    );
    return this.getById(id);
  },

  // ── 시스템 자동 전이 (시뮬레이터 / GPS 지오펜스 공용, 인증 없음) ──

  /** 현장 도착 처리 — in_transit 상태에서만 */
  systemArrive(deliveryId: number, pos: LatLng): void {
    const d = DeliveryRepository.findById(deliveryId);
    if (d?.status !== 'in_transit') return;
    DeliveryRepository.updateStatus(deliveryId, 'arrived', { arrived_at: nowIso() }, { ...pos, progress: 1 });
    OrderService.addEvent(d.orderId, 'system', 'status', `${d.seq}호차 ${d.truckNumber} 현장 도착`);
  },

  /** 공장 복귀 처리 — returning 상태에서만 */
  systemReturn(deliveryId: number, pos: LatLng): void {
    const d = DeliveryRepository.findById(deliveryId);
    if (d?.status !== 'returning') return;
    DeliveryRepository.updateStatus(deliveryId, 'returned', { returned_at: nowIso() }, { ...pos, progress: 1 });
    VehicleService.setStatus(d.vehicleId, 'available');
    OrderService.addEvent(d.orderId, 'system', 'status', `${d.seq}호차 ${d.truckNumber} 공장 복귀`);
  },

  /** 업체: 출발 전 배차 취소 */
  cancel(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'plant', '배차 취소');
    assertTransition(delivery.status, 'cancelled');
    DeliveryRepository.updateStatus(id, 'cancelled');
    VehicleService.setStatus(delivery.vehicleId, 'available');
    OrderService.addEvent(
      delivery.orderId,
      'plant',
      'dispatch',
      `${delivery.seq}호차 ${delivery.truckNumber} 배차 취소`,
    );
    return this.getById(id);
  },
};
