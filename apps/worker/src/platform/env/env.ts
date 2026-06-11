// 로컬 서버 환경변수 — 프로토타입은 모두 기본값으로 동작한다

export const env = {
  port: Number(process.env.PORT ?? 8787),
  /** SQLite 파일 경로 (디렉터리는 부팅 시 생성) */
  dbPath: process.env.DB_PATH ?? 'data/rmc.db',
  /** 운송 시뮬레이션 배속 — 6이면 실제 8분 거리를 약 80초에 주파 */
  simMultiplier: Number(process.env.SIM_MULTIPLIER ?? 6),
  /** 시뮬레이터 틱 주기 (ms) */
  simTickMs: Number(process.env.SIM_TICK_MS ?? 2000),
};
