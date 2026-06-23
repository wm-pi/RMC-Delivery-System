// 인증 미들웨어 — Bearer 토큰 검증 후 요청 컨텍스트에 사용자 주입

import type { Context, Next } from 'hono';
import type { AuthUserDto } from '@rmc/shared';
import { AppError } from '../errors/app-error';
import { verifyToken } from './jwt';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUserDto;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }
  try {
    c.set('user', await verifyToken(header.slice(7)));
  } catch {
    throw AppError.unauthorized('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
  }
  await next();
}

/** 보호된 라우트에서 인증 사용자 조회 (미들웨어 통과 후 항상 존재) */
export function getUser(c: Context): AuthUserDto {
  const user = c.get('user');
  if (!user) throw AppError.unauthorized();
  return user;
}
