export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_STATE: 'INVALID_STATE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 도메인 service에서 throw하는 표준 에러 — error middleware가 표준 응답으로 변환 */
export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly status: number;
  readonly detail?: unknown;

  constructor(code: ErrorCodeValue, message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }

  static notFound(message = '대상을 찾을 수 없습니다'): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  static invalidState(message: string): AppError {
    return new AppError(ErrorCode.INVALID_STATE, message, 409);
  }

  static conflict(message: string): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409);
  }
}
