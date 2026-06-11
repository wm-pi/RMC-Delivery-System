import type { ActiveDeliveryDto, AssignDeliveryInput, DeliveryDto, DeliveryStatus } from '@rmc/shared';
import { DELIVERY_TRANSITIONS, formatQuantity } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
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

export const DeliveryService = {
  listByOrder(orderId: number): DeliveryDto[] {
    return DeliveryRepository.findByOrderId(orderId);
  },

  listActive(): ActiveDeliveryDto[] {
    return DeliveryRepository.findActive();
  },

  getById(id: number): DeliveryDto {
    const delivery = DeliveryRepository.findById(id);
    if (!delivery) throw AppError.notFound('배차를 찾을 수 없습니다');
    return delivery;
  },

  /** 업체: 주문에 차량 배정 (회전 생성) */
  assign(orderId: number, input: AssignDeliveryInput): DeliveryDto {
    const { order, remainingQuantityM3 } = OrderService.assertDispatchable(orderId);

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

  /** 업체: 상차 시작 */
  startLoading(id: number): DeliveryDto {
    const delivery = this.getById(id);
    assertTransition(delivery.status, 'loading');
    DeliveryRepository.updateStatus(id, 'loading');
    return this.getById(id);
  },

  /** 업체: 출발 — 운송 시작, 주문을 운송 중으로 전환 */
  dispatch(id: number): DeliveryDto {
    const delivery = this.getById(id);
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
  startPouring(id: number): DeliveryDto {
    const delivery = this.getById(id);
    assertTransition(delivery.status, 'pouring');
    DeliveryRepository.updateStatus(id, 'pouring', { pouring_started_at: nowIso() });
    OrderService.addEvent(delivery.orderId, 'site', 'status', `${delivery.seq}호차 타설 시작`);
    return this.getById(id);
  },

  /** 현장: 타설 완료 — 차량은 공장으로 복귀 시작 */
  endPouring(id: number): DeliveryDto {
    const delivery = this.getById(id);
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

  /** 업체: 출발 전 배차 취소 */
  cancel(id: number): DeliveryDto {
    const delivery = this.getById(id);
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
