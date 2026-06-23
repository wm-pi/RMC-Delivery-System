// JWT 서명/검증 — hono/jwt (Web Crypto 기반, 외부 의존성 없음)

import { sign, verify } from 'hono/jwt';
import type { AuthUserDto } from '@rmc/shared';
import { env } from '../env/env';

const ALG = 'HS256';

interface TokenPayload {
  // hono/jwt JWTPayload(인덱스 시그니처)와 호환되도록
  [key: string]: unknown;
  sub: number;
  username: string;
  name: string;
  role: AuthUserDto['role'];
  siteId: number | null;
  plantId: number | null;
  orgName: string;
  exp: number;
}

export async function signToken(user: AuthUserDto): Promise<string> {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    siteId: user.siteId,
    plantId: user.plantId,
    orgName: user.orgName,
    exp: Math.floor(Date.now() / 1000) + env.tokenTtlSec,
  };
  return sign(payload, env.jwtSecret, ALG);
}

/** 검증 실패/만료 시 throw — 호출부에서 401로 변환 */
export async function verifyToken(token: string): Promise<AuthUserDto> {
  const p = (await verify(token, env.jwtSecret, ALG)) as unknown as TokenPayload;
  return {
    id: p.sub,
    username: p.username,
    name: p.name,
    role: p.role,
    siteId: p.siteId ?? null,
    plantId: p.plantId ?? null,
    orgName: p.orgName,
  };
}

interface DriverTokenPayload {
  [key: string]: unknown;
  sub: number; // deliveryId
  purpose: 'driver';
  exp: number;
}

/** 기사 추적 링크용 토큰 — 특정 배차에만 종속, 계정 불필요 */
export async function signDriverToken(deliveryId: number): Promise<string> {
  const payload: DriverTokenPayload = {
    sub: deliveryId,
    purpose: 'driver',
    exp: Math.floor(Date.now() / 1000) + env.driverTokenTtlSec,
  };
  return sign(payload, env.jwtSecret, ALG);
}

/** 검증 후 배차 id 반환. user 토큰과 purpose로 분리하여 교차 사용 차단 */
export async function verifyDriverToken(token: string): Promise<number> {
  const p = (await verify(token, env.jwtSecret, ALG)) as unknown as DriverTokenPayload;
  if (p.purpose !== 'driver' || typeof p.sub !== 'number') {
    throw new Error('invalid driver token');
  }
  return p.sub;
}
