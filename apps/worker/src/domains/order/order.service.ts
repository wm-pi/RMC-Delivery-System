import type {
  AdjustOrderInput,
  AuthUserDto,
  CreateOrderInput,
  OrderDto,
  OrderEventActor,
  OrderEventDto,
  OrderEventType,
  OrderListItemDto,
  OrderStatsDto,
  OrderStatus,
} from '@rmc/shared';
import { formatQuantity } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { assertOrderOwnership, assertRole } from '../../platform/auth/authorize';
import { nowIso } from '../../platform/db/client';
import { PlantService } from '../plant/plant.service';
import { SiteService } from '../site/site.service';
import { OrderRepository } from './order.repository';
import { computeOrderStats, type DeliveryAggRow } from './order.stats';

function statsOf(order: OrderDto): OrderStatsDto {
  const rows = OrderRepository.aggregateDeliveries(order.id) as DeliveryAggRow[];
  return computeOrderStats(order.totalQuantityM3, rows);
}

function assertTransition(order: OrderDto, allowed: OrderStatus[], action: string): void {
  if (!allowed.includes(order.status)) {
    throw AppError.invalidState(`현재 상태(${order.status})에서는 ${action}할 수 없습니다`);
  }
}

/** 진행 중(미종료) 배차가 있으면 막아야 하는 동작에 사용 */
function hasActiveDeliveries(stats: OrderStatsDto): boolean {
  const active = ['assigned', 'loading', 'in_transit', 'arrived', 'pouring'] as const;
  return active.some((s) => (stats.statusCounts[s] ?? 0) > 0);
}

/** 현장/업체 사용자가 볼 수 있는 자기 테넌트 주문만 조회하기 위한 필터 */
function tenantFilter(actor: AuthUserDto): { siteId?: number; plantId?: number } {
  return actor.role === 'site'
    ? { siteId: actor.siteId ?? -1 }
    : { plantId: actor.plantId ?? -1 };
}

export const OrderService = {
  list(actor: AuthUserDto): OrderListItemDto[] {
    const orders = OrderRepository.findAll(tenantFilter(actor));
    return orders.map((order) => ({ ...order, stats: statsOf(order) }));
  },

  getById(id: number): OrderDto {
    const order = OrderRepository.findById(id);
    if (!order) throw AppError.notFound('주문을 찾을 수 없습니다');
    return order;
  },

  /** 소유권 검증 후 주문 조회 (route-facing) */
  getOwned(actor: AuthUserDto, id: number): OrderDto {
    const order = this.getById(id);
    assertOrderOwnership(actor, order);
    return order;
  },

  getDetailBase(
    actor: AuthUserDto,
    id: number,
  ): { order: OrderDto; events: OrderEventDto[]; stats: OrderStatsDto } {
    const order = this.getOwned(actor, id);
    return { order, events: OrderRepository.findEvents(id), stats: statsOf(order) };
  },

  create(actor: AuthUserDto, input: CreateOrderInput): OrderDto {
    assertRole(actor, 'site', '주문을 등록');
    // 현장은 자기 현장으로만 주문 가능 — 클라이언트가 보낸 siteId는 신뢰하지 않는다
    const siteId = actor.siteId ?? -1;
    const site = SiteService.getById(siteId);
    PlantService.getById(input.plantId);

    const today = nowIso().slice(0, 10).replaceAll('-', '');
    const orderNo = `ORD-${today}-${String(OrderRepository.countToday() + 1).padStart(3, '0')}`;
    const order = OrderRepository.create({ ...input, siteId, orderNo });
    OrderRepository.addEvent(
      order.id,
      'site',
      'status',
      `${site.name} 주문 등록 (${input.concreteGrade}, ${formatQuantity(input.totalQuantityM3)})`,
    );
    return order;
  },

  accept(actor: AuthUserDto, id: number): OrderDto {
    assertRole(actor, 'plant', '주문을 접수');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['requested'], '접수');
    OrderRepository.updateStatus(id, 'accepted');
    OrderRepository.addEvent(id, 'plant', 'status', '주문을 접수했습니다. 배차를 준비합니다.');
    return this.getById(id);
  },

  reject(actor: AuthUserDto, id: number, reason?: string): OrderDto {
    assertRole(actor, 'plant', '주문을 거절');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['requested'], '거절');
    OrderRepository.updateStatus(id, 'rejected');
    OrderRepository.addEvent(id, 'plant', 'status', `주문을 거절했습니다${reason ? ` — ${reason}` : ''}`);
    return this.getById(id);
  },

  cancel(actor: AuthUserDto, id: number): OrderDto {
    assertRole(actor, 'site', '주문을 취소');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['requested', 'accepted', 'paused'], '취소');
    if (hasActiveDeliveries(statsOf(order))) {
      throw AppError.invalidState('진행 중인 배차가 있어 취소할 수 없습니다. 업체에 배차 취소를 먼저 요청하세요.');
    }
    OrderRepository.updateStatus(id, 'cancelled');
    OrderRepository.addEvent(id, 'site', 'status', '현장에서 주문을 취소했습니다');
    return this.getById(id);
  },

  pause(actor: AuthUserDto, id: number): OrderDto {
    assertRole(actor, 'site', '배차를 일시 중단');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['accepted', 'in_progress'], '일시 중단');
    OrderRepository.updateStatus(id, 'paused');
    OrderRepository.addEvent(id, 'site', 'status', '현장 사정으로 배차를 일시 중단합니다. 추가 출발을 보류해주세요.');
    return this.getById(id);
  },

  resume(actor: AuthUserDto, id: number): OrderDto {
    assertRole(actor, 'site', '배차를 재개');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['paused'], '재개');
    const stats = statsOf(order);
    const hasDispatched = stats.arrivedTotalCount > 0 || stats.inTransitCount > 0;
    OrderRepository.updateStatus(id, hasDispatched ? 'in_progress' : 'accepted');
    OrderRepository.addEvent(id, 'site', 'status', '배차를 재개합니다. 다음 차량을 보내주세요.');
    return this.getById(id);
  },

  complete(actor: AuthUserDto, id: number): OrderDto {
    assertRole(actor, 'site', '완료 처리');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['accepted', 'in_progress', 'paused'], '완료 처리');
    const stats = statsOf(order);
    if (hasActiveDeliveries(stats)) {
      throw AppError.invalidState('아직 현장에 도착하지 않았거나 타설 중인 차량이 있습니다.');
    }
    OrderRepository.updateStatus(id, 'completed');
    OrderRepository.addEvent(
      id,
      'site',
      'status',
      `타설 완료 — 총 ${formatQuantity(stats.pouredQuantityM3)} / ${stats.pouredCount}회전`,
    );
    return this.getById(id);
  },

  /** 유선 "n대 더/덜 보내주세요"를 대체하는 총 수량 조절 */
  adjust(actor: AuthUserDto, id: number, input: AdjustOrderInput): OrderDto {
    assertRole(actor, 'site', '수량을 조절');
    const order = this.getOwned(actor, id);
    assertTransition(order, ['requested', 'accepted', 'in_progress', 'paused'], '수량 조절');
    const stats = statsOf(order);
    if (input.totalQuantityM3 < stats.assignedQuantityM3) {
      throw AppError.invalidState(
        `이미 배차된 수량(${formatQuantity(stats.assignedQuantityM3)})보다 적게 줄일 수 없습니다`,
      );
    }
    OrderRepository.updateTotalQuantity(id, input.totalQuantityM3);
    const direction = input.totalQuantityM3 > order.totalQuantityM3 ? '증가' : '감소';
    const before = formatQuantity(order.totalQuantityM3);
    const after = formatQuantity(input.totalQuantityM3);
    const reasonText = input.reason ? ` (${input.reason})` : '';
    OrderRepository.addEvent(id, 'site', 'adjust', `총 수량 ${direction}: ${before} → ${after}${reasonText}`);
    return this.getById(id);
  },

  /** 통화 대체 메시지 — 발신자(actor)는 토큰의 역할을 신뢰한다 */
  addMessage(actor: AuthUserDto, id: number, message: string): OrderEventDto {
    this.getOwned(actor, id);
    return OrderRepository.addEvent(id, actor.role, 'message', message);
  },

  // ── 아래는 delivery 도메인에서 호출하는 공개 메서드 ──

  /** 배차/운행 이벤트 기록 */
  addEvent(orderId: number, actor: OrderEventActor, type: OrderEventType, message: string): void {
    OrderRepository.addEvent(orderId, actor, type, message);
  },

  /** 첫 차량 출발 시 주문을 운송 중 상태로 전환 */
  markInProgress(orderId: number): void {
    const order = this.getById(orderId);
    if (order.status === 'accepted') {
      OrderRepository.updateStatus(orderId, 'in_progress');
    }
  },

  /** 배차 가능 여부 검증 + 잔여 수량 반환 (delivery 도메인이 사용) */
  assertDispatchable(orderId: number): { order: OrderDto; remainingQuantityM3: number } {
    const order = this.getById(orderId);
    if (order.status === 'paused') {
      throw AppError.invalidState('현장이 배차를 일시 중단한 주문입니다');
    }
    if (!['accepted', 'in_progress'].includes(order.status)) {
      throw AppError.invalidState(`배차할 수 없는 주문 상태입니다 (${order.status})`);
    }
    return { order, remainingQuantityM3: statsOf(order).remainingQuantityM3 };
  },
};
