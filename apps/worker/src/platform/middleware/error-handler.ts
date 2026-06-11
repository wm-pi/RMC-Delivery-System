import type { Context } from 'hono';
import { AppError, ErrorCode } from '../errors/app-error';

/** Hono onError 핸들러 — AppError는 표준 에러 응답으로, 그 외는 500으로 변환 */
export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { message: err.message, code: err.code, detail: err.detail },
      err.status as 400,
    );
  }
  console.error('[unhandled]', err);
  return c.json(
    { message: '서버 오류가 발생했습니다', code: ErrorCode.INTERNAL_ERROR },
    500,
  );
}
