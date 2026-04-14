// 차량 위치 시뮬레이션 훅 — 1초마다 위치·ETA 갱신
import { useEffect, useRef, useState } from 'react';
import type { LatLng } from './mapUtils';
import {
  AVERAGE_SPEED_KMH,
  haversineDistance,
  interpolateLatLng,
  calcTotalMinutes,
  formatETA,
  formatDistance,
  formatProgress,
} from './mapUtils';
import { SITES, SIM_VEHICLES } from './mapData';
import type { SimVehicle, PlantLocation } from './mapData';

export interface TrackedVehicle {
  id: string;
  truckNumber: string;
  driverName: string;
  plantName: string;
  siteName: string;
  concreteGrade: string;
  quantity: number;
  origin: LatLng;
  destination: LatLng;
  currentPosition: LatLng;
  progress: number;
  distanceTotalKm: number;
  distanceRemainingKm: number;
  totalMinutes: number;
  etaMinutes: number;
  etaText: string;
  distanceText: string;
  progressText: string;
  arrived: boolean;
  currentSpeedKmh: number;
}

function buildTrackedVehicle(
  v: SimVehicle,
  progress: number,
  plants: PlantLocation[],
): TrackedVehicle | null {
  const plant = plants.find((p) => p.id === v.plantId);
  const site  = SITES.find((s) => s.id === v.siteId);
  if (!plant || !site) return null;

  const distanceTotalKm   = haversineDistance(plant.position, site.position);
  const totalMinutes      = calcTotalMinutes(distanceTotalKm);
  const clampedProgress   = Math.min(progress, 1);
  const currentPosition   = interpolateLatLng(plant.position, site.position, clampedProgress);
  const distanceRemainingKm = distanceTotalKm * (1 - clampedProgress);
  const etaMinutes        = totalMinutes * (1 - clampedProgress);

  return {
    id: v.id,
    truckNumber: v.truckNumber,
    driverName: v.driverName,
    plantName: plant.name,
    siteName: site.name,
    concreteGrade: v.concreteGrade,
    quantity: v.quantity,
    origin: plant.position,
    destination: site.position,
    currentPosition,
    progress: clampedProgress,
    distanceTotalKm,
    distanceRemainingKm,
    totalMinutes,
    etaMinutes,
    etaText: formatETA(etaMinutes),
    distanceText: formatDistance(distanceRemainingKm),
    progressText: formatProgress(clampedProgress),
    arrived: clampedProgress >= 1,
    currentSpeedKmh: clampedProgress >= 1 ? 0 : AVERAGE_SPEED_KMH,
  };
}

/**
 * 1초마다 차량 위치를 갱신하는 훅.
 * plants: 동적으로 변경 가능한 공장 목록
 * speedMultiplier: 시뮬레이션 배속 (기본 60 → 실제 1분 = 1초)
 */
export function useVehicleTracking(
  speedMultiplier = 60,
  plants: PlantLocation[] = [],
): TrackedVehicle[] {
  const startTimeRef = useRef(Date.now());

  const [vehicles, setVehicles] = useState<TrackedVehicle[]>(() =>
    SIM_VEHICLES.flatMap((v) => {
      const t = buildTrackedVehicle(v, v.initialProgress, plants);
      return t ? [t] : [];
    }),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsedMs      = Date.now() - startTimeRef.current;
      const elapsedRealMin = elapsedMs / 60_000;

      setVehicles(
        SIM_VEHICLES.flatMap((v) => {
          const plant = plants.find((p) => p.id === v.plantId);
          const site  = SITES.find((s) => s.id === v.siteId);
          if (!plant || !site) return [];

          const distanceKm         = haversineDistance(plant.position, site.position);
          const totalMin           = calcTotalMinutes(distanceKm, AVERAGE_SPEED_KMH);
          const simulatedElapsedMin = elapsedRealMin * speedMultiplier;
          const progress           = v.initialProgress + simulatedElapsedMin / totalMin;

          const t = buildTrackedVehicle(v, progress, plants);
          return t ? [t] : [];
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [speedMultiplier, plants]);

  return vehicles;
}
