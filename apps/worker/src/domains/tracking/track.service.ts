// 기사용 추적 (공개) — 서명 토큰으로 인증하며 계정이 필요 없다.
// 위치 핑을 받아 위치/진행률을 갱신하고, 지오펜스 반경 진입 시 도착/복귀를 자동 처리한다.

import type { DriverTrackInfoDto, LatLng, LocationPingResultDto } from '@rmc/shared';
import { haversineDistance } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { verifyDriverToken } from '../../platform/auth/jwt';
import { env } from '../../platform/env/env';
import { DeliveryRepository, type ActiveDeliveryRow } from '../delivery/delivery.repository';
import { DeliveryService } from '../delivery/delivery.service';

async function authorize(deliveryId: number, token: string): Promise<ActiveDeliveryRow> {
  let tokenDeliveryId: number;
  try {
    tokenDeliveryId = await verifyDriverToken(token);
  } catch {
    throw AppError.unauthorized('유효하지 않거나 만료된 추적 링크입니다');
  }
  if (tokenDeliveryId !== deliveryId) {
    throw AppError.forbidden('링크가 해당 배차와 일치하지 않습니다');
  }
  const row = DeliveryRepository.findActiveRowById(deliveryId);
  if (!row) throw AppError.notFound('배차를 찾을 수 없습니다');
  return row;
}

/** 현재 상태 기준 목적지 (운송 중=현장, 복귀 중=공장, 그 외 없음) */
function destinationOf(row: ActiveDeliveryRow): { pos: LatLng; name: string } | null {
  if (row.status === 'in_transit') return { pos: { lat: row.site_lat, lng: row.site_lng }, name: row.site_name };
  if (row.status === 'returning') return { pos: { lat: row.plant_lat, lng: row.plant_lng }, name: row.plant_name };
  return null;
}

export const TrackService = {
  async bootstrap(deliveryId: number, token: string): Promise<DriverTrackInfoDto> {
    const row = await authorize(deliveryId, token);
    const dest = destinationOf(row);
    return {
      deliveryId: row.id,
      orderNo: row.order_no,
      truckNumber: row.truck_number,
      driverName: row.driver_name,
      plantName: row.plant_name,
      siteName: row.site_name,
      status: row.status,
      trackingMode: row.tracking_mode,
      destination: dest?.pos ?? null,
      destinationName: dest?.name ?? null,
    };
  },

  async recordLocation(deliveryId: number, token: string, loc: LatLng): Promise<LocationPingResultDto> {
    const row = await authorize(deliveryId, token);
    if (row.tracking_mode !== 'gps') {
      throw AppError.invalidState('실측(GPS) 모드 배차가 아닙니다');
    }
    if (row.status === 'returned' || row.status === 'cancelled') {
      throw AppError.invalidState('이미 종료된 배차입니다');
    }

    const dest = destinationOf(row);
    let distanceToDestM: number | null = null;
    let progress = row.progress;

    if (dest) {
      const from =
        row.status === 'returning'
          ? { lat: row.site_lat, lng: row.site_lng }
          : { lat: row.plant_lat, lng: row.plant_lng };
      const totalKm = haversineDistance(from, dest.pos);
      const remainKm = haversineDistance(loc, dest.pos);
      distanceToDestM = Math.round(remainKm * 1000);
      progress = totalKm > 0 ? Math.max(0, Math.min(1, 1 - remainKm / totalKm)) : 1;
    }

    DeliveryRepository.recordPing(deliveryId, loc.lat, loc.lng, progress);

    // 지오펜스 자동 전이
    let arrived = false;
    if (distanceToDestM !== null && distanceToDestM <= env.geofenceM) {
      if (row.status === 'in_transit') {
        DeliveryService.systemArrive(deliveryId, loc);
        arrived = true;
      } else if (row.status === 'returning') {
        DeliveryService.systemReturn(deliveryId, loc);
        arrived = true;
      }
    }

    const latest = DeliveryRepository.findById(deliveryId);
    return { status: latest?.status ?? row.status, arrived, distanceToDestM };
  },
};
