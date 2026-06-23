import { Hono } from 'hono';
import { loginSchema } from '@rmc/shared';
import { authMiddleware, getUser } from '../../platform/auth/auth.middleware';
import { ok, validationError } from '../../platform/response/respond';
import { AuthService } from './auth.service';

export const authRoute = new Hono();

// 공개 — 로그인
authRoute.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(c, parsed.error);
  return ok(c, await AuthService.login(parsed.data));
});

// 보호 — 현재 로그인 사용자 (토큰 유효성 확인 + 새로고침 시 복원용)
authRoute.get('/me', authMiddleware, (c) => ok(c, getUser(c)));
