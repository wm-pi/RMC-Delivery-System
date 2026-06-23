// 로컬 서버 환경변수 — 프로토타입은 모두 기본값으로 동작한다

import { loadEnvFile } from './load-env';

// process.env를 가장 먼저 읽는 모듈이므로 여기서 .env를 적재한다
loadEnvFile();

const DEFAULT_JWT_SECRET = 'rmc-local-dev-secret-change-me';

export const env = {
  port: Number(process.env.PORT ?? 8787),
  /** SQLite 파일 경로 (디렉터리는 부팅 시 생성) */
  dbPath: process.env.DB_PATH ?? 'data/rmc.db',
  /** 운송 시뮬레이션 배속 — 6이면 실제 8분 거리를 약 80초에 주파 */
  simMultiplier: Number(process.env.SIM_MULTIPLIER ?? 6),
  /** 시뮬레이터 틱 주기 (ms) */
  simTickMs: Number(process.env.SIM_TICK_MS ?? 2000),
  /** JWT 서명 비밀키 — 운영에서는 반드시 환경변수로 주입 */
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  /** 토큰 유효 기간 (초). 기본 12시간 */
  tokenTtlSec: Number(process.env.TOKEN_TTL_SEC ?? 60 * 60 * 12),
  /** 기사 추적 토큰 유효 기간 (초). 기본 24시간 */
  driverTokenTtlSec: Number(process.env.DRIVER_TOKEN_TTL_SEC ?? 60 * 60 * 24),
  /** 지오펜스 반경 (m) — 목적지 이 거리 내 진입 시 자동 도착/복귀 */
  geofenceM: Number(process.env.GEOFENCE_M ?? 150),
  /** gps 핑이 이 시간(ms) 넘게 끊기면 stale 처리 */
  gpsStaleMs: Number(process.env.GPS_STALE_MS ?? 60_000),
  /** 네이버 길찾기(Directions) API — 미설정 시 직선거리로 폴백 */
  directions: {
    keyId: process.env.NAVER_DIRECTIONS_KEY_ID ?? '',
    key: process.env.NAVER_DIRECTIONS_KEY ?? '',
  },
};

if (env.jwtSecret === DEFAULT_JWT_SECRET) {
  console.warn('[env] JWT_SECRET 미설정 — 기본 개발용 키 사용 중. 운영 배포 시 반드시 설정하세요.');
}
