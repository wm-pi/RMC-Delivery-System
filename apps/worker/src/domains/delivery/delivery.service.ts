import type {
  ActiveDeliveryDto,
  AssignDeliveryInput,
  AuthUserDto,
  DeliveryDto,
  DeliveryStatus,
  DriverLinkDto,
  LatLng,
  RoutePathDto,
  UserRole,
} from '@rmc/shared';
import { DELIVERY_TRANSITIONS, formatQuantity } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { assertOrderOwnership, assertRole } from '../../platform/auth/authorize';
import { signDriverToken } from '../../platform/auth/jwt';
import { getRoutePath } from '../../platform/directions/route-info';
import { nowIso } from '../../platform/db/client';
import { OrderService } from '../order/order.service';
import { PlantService } from '../plant/plant.service';
import { SiteService } from '../site/site.service';
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

  /**
   * 업체: 잔여 수량을 가용 차량으로 한 번에 채우는 일괄 배차(클릭 최소화).
   * 적재량 큰 차량부터 잔여 수량이 0이 될 때까지 자동 배정한다.
   * 개별 검증은 assign을 재사용한다(매 회 잔여 수량 재계산).
   */
  assignAuto(actor: AuthUserDto, orderId: number, trackingMode: AssignDeliveryInput['trackingMode']): DeliveryDto[] {
    assertRole(actor, 'plant', '일괄 배차');
    const { order, remainingQuantityM3 } = OrderService.assertDispatchable(orderId);
    assertOrderOwnership(actor, order);
    if (remainingQuantityM3 <= 1e-9) {
      throw AppError.invalidState('주문 수량이 모두 배차되었습니다. 현장에 수량 조절을 요청하세요.');
    }
    const available = VehicleService.list(actor)
      .filter((v) => v.status === 'available')
      .sort((a, b) => b.capacityM3 - a.capacityM3);
    if (available.length === 0) {
      throw AppError.invalidState('배차할 수 있는 대기 차량이 없습니다.');
    }

    const created: DeliveryDto[] = [];
    let remaining = remainingQuantityM3;
    for (const vehicle of available) {
      if (remaining <= 1e-9) break;
      const qty = Math.round(Math.min(vehicle.capacityM3, remaining) * 10) / 10;
      if (qty <= 0) break;
      created.push(this.assign(actor, orderId, { vehicleId: vehicle.id, quantityM3: qty, trackingMode }));
      remaining -= qty;
    }
    return created;
  },

  /** 현재 운행 구간의 도로 경로 (지도 경로선/마커 이동용) — 주문 소유자만 */
  async getRoute(actor: AuthUserDto, id: number): Promise<RoutePathDto> {
    const delivery = this.getById(id);
    const order = OrderService.getById(delivery.orderId);
    assertOrderOwnership(actor, order);
    const plant = PlantService.getById(order.plantId);
    const site = SiteService.getById(order.siteId);
    const plantPos: LatLng = { lat: plant.lat, lng: plant.lng };
    const sitePos: LatLng = { lat: site.lat, lng: site.lng };
    // 복귀 중이면 현장→공장, 그 외엔 공장→현장
    const [from, to] = delivery.status === 'returning' ? [sitePos, plantPos] : [plantPos, sitePos];
    return getRoutePath(from, to);
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

  /**
   * 업체: 출발 — 상차+출발을 한 번에 처리(클릭 최소화).
   * 배정(assigned) 또는 상차 중(loading) 상태에서 바로 운송 중으로 전환한다.
   */
  depart(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'plant', '출발 처리');
    if (delivery.status !== 'assigned' && delivery.status !== 'loading') {
      throw AppError.invalidState(`출발할 수 없는 상태입니다 (${delivery.status})`);
    }
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

  /**
   * 현장: 타설 완료 — 타설 시작+완료를 한 번에 처리(클릭 최소화).
   * 도착(arrived) 상태에서 바로 복귀로 전환한다. 도착~지금을 타설 구간으로 본다.
   */
  pourComplete(actor: AuthUserDto, id: number): DeliveryDto {
    const delivery = loadOwnedDelivery(actor, id, 'site', '타설 완료 처리');
    if (delivery.status !== 'arrived' && delivery.status !== 'pouring') {
      throw AppError.invalidState(`타설 완료할 수 없는 상태입니다 (${delivery.status})`);
    }
    DeliveryRepository.updateStatus(
      id,
      'returning',
      {
        // 타설 시작 시각이 없으면 도착 시각(없으면 지금)을 시작으로 간주
        pouring_started_at: delivery.pouringStartedAt ?? delivery.arrivedAt ?? nowIso(),
        pouring_ended_at: nowIso(),
      },
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
