// 지도 관련 유틸리티 — 거리·ETA·위치 보간

export interface LatLng {
  lat: number;
  lng: number;
}

/** 서울 시내 평균 운송 속도 (km/h) */
export const AVERAGE_SPEED_KMH = 40;

/**
 * Haversine 공식으로 두 좌표 간 직선 거리(km) 계산
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 출발지와 목적지 사이에서 t(0~1) 비율 위치 반환
 */
export function interpolateLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    lng: from.lng + (to.lng - from.lng) * clamped,
  };
}

/**
 * 총 거리(km)와 속도(km/h)로 총 소요 시간(분) 계산
 */
export function calcTotalMinutes(distanceKm: number, speedKmh = AVERAGE_SPEED_KMH): number {
  return (distanceKm / speedKmh) * 60;
}

/**
 * 남은 시간(분)을 한국어 문자열로 변환
 */
export function formatETA(remainingMinutes: number): string {
  if (remainingMinutes <= 0) return '도착 완료';
  if (remainingMinutes < 1) return '잠시 후 도착';
  const min = Math.round(remainingMinutes);
  if (min < 60) return `약 ${min}분 후 도착`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `약 ${h}시간${m > 0 ? ` ${m}분` : ''} 후 도착`;
}

/**
 * km 거리를 읽기 좋은 문자열로 변환
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * 진행률(0~1)에서 퍼센트 문자열 반환
 */
export function formatProgress(progress: number): string {
  return `${Math.round(Math.min(progress, 1) * 100)}%`;
}
