// 주문/배차/차량 상태값 정의 — DB check constraint, API 검증, 화면 라벨의 단일 소스

export const ORDER_STATUSES = [
  'requested', // 현장이 주문 요청
  'accepted', // 업체가 접수 확정
  'in_progress', // 첫 차량 출발 이후
  'paused', // 현장 사정으로 일시 중단
  'completed', // 타설 완료
  'rejected', // 업체가 접수 거절
  'cancelled', // 현장이 취소
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  requested: '요청',
  accepted: '접수 완료',
  in_progress: '운송 중',
  paused: '일시 중단',
  completed: '완료',
  rejected: '거절',
  cancelled: '취소',
};

/** 업체가 배차를 진행할 수 있는 주문 상태 */
export const DISPATCHABLE_ORDER_STATUSES: OrderStatus[] = ['accepted', 'in_progress'];

/** 현장/업체 화면에서 "진행 중"으로 묶이는 상태 */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'requested',
  'accepted',
  'in_progress',
  'paused',
];

export const DELIVERY_STATUSES = [
  'assigned', // 차량 배정
  'loading', // 상차 중
  'in_transit', // 현장으로 운송 중
  'arrived', // 현장 도착, 타설 대기
  'pouring', // 타설 중
  'returning', // 공장으로 복귀 중
  'returned', // 복귀 완료
  'cancelled', // 배차 취소
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  assigned: '배차 완료',
  loading: '상차 중',
  in_transit: '운송 중',
  arrived: '현장 도착',
  pouring: '타설 중',
  returning: '복귀 중',
  returned: '복귀 완료',
  cancelled: '취소',
};

/** 종료되지 않은 배차 상태 (지도/현황판 대상) */
export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'assigned',
  'loading',
  'in_transit',
  'arrived',
  'pouring',
  'returning',
];

/** 배차 상태 전이 허용 표 — service 레이어에서 검증 */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  assigned: ['loading', 'cancelled'],
  loading: ['in_transit', 'cancelled'],
  in_transit: ['arrived'],
  arrived: ['pouring'],
  pouring: ['returning'],
  returning: ['returned'],
  returned: [],
  cancelled: [],
};

export const VEHICLE_STATUSES = ['available', 'on_delivery', 'maintenance'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  available: '대기',
  on_delivery: '운행 중',
  maintenance: '정비 중',
};

export const ORDER_EVENT_ACTORS = ['site', 'plant', 'system'] as const;

export type OrderEventActor = (typeof ORDER_EVENT_ACTORS)[number];

export const ORDER_EVENT_ACTOR_LABEL: Record<OrderEventActor, string> = {
  site: '현장',
  plant: '레미콘업체',
  system: '시스템',
};

export const ORDER_EVENT_TYPES = ['message', 'status', 'adjust', 'dispatch'] as const;

export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

/** 사용자 역할 — 프로토타입은 로그인 없이 역할 선택으로 대체 */
export const USER_ROLES = ['site', 'plant'] as const;

export type UserRole = (typeof USER_ROLES)[number];
