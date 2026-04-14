import type { LatLng } from './mapUtils';

export interface PlantLocation {
  id: string;
  name: string;
  position: LatLng;
}

export interface SiteLocation {
  id: string;
  name: string;
  position: LatLng;
}

export interface SimVehicle {
  id: string;
  truckNumber: string;
  driverName: string;
  plantId: string;
  siteId: string;
  concreteGrade: string;
  quantity: number;
  initialProgress: number;
}

// ──────────────────────────────────────────────
// 기본 공장 위치
// ──────────────────────────────────────────────
export const DEFAULT_PLANTS: PlantLocation[] = [
  {
    id: 'P1',
    name: '덕원레미콘',
    // 강원도 원주시 판부면 (원주 서쪽 공단 인근)
    position: { lat: 37.3612, lng: 127.9088 },
  },
];

// ──────────────────────────────────────────────
// 현장 위치
// ──────────────────────────────────────────────
export const SITES: SiteLocation[] = [
  {
    id: 'S1',
    name: '원주역 우미린 더 스텔라',
    // 강원도 원주시 무실동 2066
    position: { lat: 37.3398, lng: 127.9451 },
  },
];

// ──────────────────────────────────────────────
// 시뮬레이션 차량
// ──────────────────────────────────────────────
export const SIM_VEHICLES: SimVehicle[] = [
  {
    id: 'V1',
    truckNumber: '12가 3456',
    driverName: '김철수',
    plantId: 'P1',
    siteId: 'S1',
    concreteGrade: '25-150-12',
    quantity: 6,
    initialProgress: 0.15,
  },
  {
    id: 'V2',
    truckNumber: '34나 5678',
    driverName: '이영희',
    plantId: 'P1',
    siteId: 'S1',
    concreteGrade: '30-180-19',
    quantity: 8,
    initialProgress: 0.45,
  },
  {
    id: 'V3',
    truckNumber: '56다 7890',
    driverName: '박민준',
    plantId: 'P1',
    siteId: 'S1',
    concreteGrade: '24-120-25',
    quantity: 5,
    initialProgress: 0.70,
  },
];

// ──────────────────────────────────────────────
// 로컬스토리지 기반 공장 데이터 관리
// ──────────────────────────────────────────────
const STORAGE_KEY = 'rmc_plants';

export function loadPlants(): PlantLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PlantLocation[];
  } catch { /* ignore */ }
  return [...DEFAULT_PLANTS];
}

export function savePlants(plants: PlantLocation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

export const PLANTS: PlantLocation[] = loadPlants();
