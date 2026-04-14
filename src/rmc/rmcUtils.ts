// 레미콘 운송 시스템 유틸리티

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────

export type DeliveryStatus =
  | 'pending'    // 대기
  | 'loading'    // 상차 중
  | 'in_transit' // 운송 중
  | 'delivered'  // 납품 완료
  | 'cancelled'; // 취소

export interface Plant {
  id: string;
  name: string;
  address: string;
  contact: string;
}

export interface ConstructionSite {
  id: string;
  name: string;
  address: string;
  contact: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  truckNumber: string; // 차량 번호
}

export interface DeliveryOrder {
  id: string;
  orderDate: string;         // ISO 날짜 문자열
  plant: Plant;
  site: ConstructionSite;
  driver: Driver;
  concreteGrade: string;     // 배합 강도 (예: "25-150-12")
  quantity: number;          // 수량 (m³)
  scheduledTime: string;     // 출발 예정 시각 (ISO)
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  status: DeliveryStatus;
  notes?: string;
}

// ──────────────────────────────────────────────
// 상태 한글 레이블
// ──────────────────────────────────────────────

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: '대기',
  loading: '상차 중',
  in_transit: '운송 중',
  delivered: '납품 완료',
  cancelled: '취소',
};

// ──────────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────────

/**
 * ISO 날짜/시각 문자열을 'YYYY-MM-DD HH:mm' 형식으로 포맷
 */
export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * 운송 완료까지 소요 시간(분) 계산
 */
export function calcTransitMinutes(order: DeliveryOrder): number | null {
  if (!order.actualDepartureTime || !order.actualArrivalTime) return null;
  const departure = new Date(order.actualDepartureTime).getTime();
  const arrival = new Date(order.actualArrivalTime).getTime();
  return Math.round((arrival - departure) / 60_000);
}

/**
 * 배차 목록에서 특정 상태의 주문만 필터링
 */
export function filterByStatus(
  orders: DeliveryOrder[],
  status: DeliveryStatus,
): DeliveryOrder[] {
  return orders.filter((o) => o.status === status);
}

/**
 * 주문 ID 생성 (날짜 기반 간단 ID)
 */
export function generateOrderId(): string {
  const now = new Date();
  const timestamp = now.getTime().toString(36).toUpperCase();
  return `RMC-${timestamp}`;
}
