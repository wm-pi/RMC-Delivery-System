import type { Context } from 'hono';
import type { ZodError } from 'zod';
import { ErrorCode } from '../errors/app-error';

/** 성공 응답 — 프로젝트 표준: body 그대로 반환 */
export function ok<T>(c: Context, data: T) {
  return c.json(data as object, 200);
}

export function created<T>(c: Context, data: T) {
  return c.json(data as object, 201);
}

export function validationError(c: Context, error: ZodError) {
  return c.json(
    {
      message: '입력값이 올바르지 않습니다',
      code: ErrorCode.VALIDATION_ERROR,
      detail: error.flatten(),
    },
    400,
  );
}
