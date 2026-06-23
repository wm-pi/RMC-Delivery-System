// API 응답 DTO — 프론트엔드와 백엔드가 공유하는 계약 타입

import type {
  DeliveryStatus,
  OrderEventActor,
  OrderEventType,
  OrderStatus,
  TrackingMode,
  UserRole,
  VehicleStatus,
} from '../constants/status';
import type { LatLng } from '../utils/geo';

/** 로그인한 사용자 — 토큰 페이로드이자 프론트 인증 컨텍스트 */
export interface AuthUserDto {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  /** role === 'site'일 때만 채워짐 */
  siteId: number | null;
  /** role === 'plant'일 때만 채워짐 */
  plantId: number | null;
  /** 소속 현장 또는 공장 이름 (헤더 표시용) */
  orgName: string;
}

export interface LoginResponseDto {
  token: string;
  user: AuthUserDto;
}

export interface PlantDto {
  id: number;
  name: string;
  address: string | null;
  contact: string | null;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface SiteDto {
  id: number;
  name: string;
  address: string | null;
  contact: string | null;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface VehicleDto {
  id: number;
  plantId: number;
  truckNumber: string;
  driverName: string;
  driverPhone: string | null;
  capacityM3: number;
  status: VehicleStatus;
  createdAt: string;
}

export interface OrderDto {
  id: number;
  orderNo: string;
  siteId: number;
  siteName: string;
  plantId: number;
  plantName: string;
  concreteGrade: string;
  totalQuantityM3: number;
  truckIntervalMin: number;
  requestedAt: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDto {
  id: number;
  orderId: number;
  vehicleId: number;
  truckNumber: string;
  driverName: string;
  seq: number;
  quantityM3: number;
  status: DeliveryStatus;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  pouringStartedAt: string | null;
  pouringEndedAt: string | null;
  returnedAt: string | null;
  lat: number | null;
  lng: number | null;
  progress: number;
  trackingMode: TrackingMode;
  /** 마지막 GPS 핑 수신 시각 (gps 모드) */
  lastPingAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEventDto {
  id: number;
  orderId: number;
  actor: OrderEventActor;
  type: OrderEventType;
  message: string;
  createdAt: string;
}

/** 주문 진행 집계 — "몇 대 왔고, 몇 대 더 오고, 얼마나 쳤는지" */
export interface OrderStatsDto {
  /** 배차된(취소 제외) 총 수량 */
  assignedQuantityM3: number;
  /** 아직 배차되지 않은 잔여 수량 */
  remainingQuantityM3: number;
  /** 잔여 수량 기준 예상 추가 배차 대수 */
  estimatedRemainingTrucks: number;
  /** 타설 완료된 수량 (복귀 중/복귀 완료 기준) */
  pouredQuantityM3: number;
  /** 타설 완료 회전 수 */
  pouredCount: number;
  /** 현장 도착 누적 대수 (도착 이후 단계 포함) */
  arrivedTotalCount: number;
  /** 현재 현장으로 이동 중인 대수 */
  inTransitCount: number;
  /** 현장에서 대기/타설 중인 대수 */
  onSiteCount: number;
  /** 상태별 배차 수 */
  statusCounts: Partial<Record<DeliveryStatus, number>>;
}

export interface OrderListItemDto extends OrderDto {
  stats: OrderStatsDto;
}

export interface OrderDetailDto {
  order: OrderDto;
  deliveries: DeliveryDto[];
  events: OrderEventDto[];
  stats: OrderStatsDto;
}

/** 실시간 지도용 배차 정보 — 위치/경로/ETA 포함 */
export interface ActiveDeliveryDto extends DeliveryDto {
  orderNo: string;
  concreteGrade: string;
  plantId: number;
  plantName: string;
  siteId: number;
  siteName: string;
  origin: LatLng;
  destination: LatLng;
  totalKm: number;
  remainingKm: number;
  etaMinutes: number;
  currentSpeedKmh: number;
  /** ETA 산출 근거: 네이버 길찾기 / 직선거리 / 정지(이동 안 함) */
  etaSource: 'directions' | 'straight' | 'none';
  /** gps 모드인데 최근 핑이 끊긴 상태 */
  stale: boolean;
}

/** 기사용 추적 페이지 부트스트랩 정보 */
export interface DriverTrackInfoDto {
  deliveryId: number;
  orderNo: string;
  truckNumber: string;
  driverName: string;
  plantName: string;
  siteName: string;
  status: DeliveryStatus;
  trackingMode: TrackingMode;
  /** 현재 향하는 목적지 (운송 중=현장, 복귀 중=공장, 그 외 null) */
  destination: LatLng | null;
  destinationName: string | null;
}

/** 기사 추적 링크 발급 응답 */
export interface DriverLinkDto {
  token: string;
  path: string;
}

/** 배차의 현재 운행 구간 도로 경로 */
export interface RoutePathDto {
  path: LatLng[];
  source: 'directions' | 'straight';
}

/** 위치 핑 처리 결과 */
export interface LocationPingResultDto {
  status: DeliveryStatus;
  arrived: boolean;
  distanceToDestM: number | null;
}

export interface ApiErrorBody {
  message: string;
  code: string;
  detail?: unknown;
}
