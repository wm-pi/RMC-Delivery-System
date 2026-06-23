// 공통 API client — 모든 feature/entity API 함수는 이 client만 사용한다

import type { ApiErrorBody } from '@rmc/shared';
import { useAuthStore } from '~/shared/lib/auth.store';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.detail = body.detail;
  }
}

/** 401 응답 시 세션을 비우고 로그인 화면으로 보낸다 */
function handleUnauthorized(): void {
  useAuthStore.getState().logout();
  if (typeof globalThis !== 'undefined' && globalThis.location?.pathname !== '/') {
    globalThis.location.href = '/';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useAuthStore.getState().token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { headers, ...init });
  if (res.status === 401) handleUnauthorized();
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (body as ApiErrorBody | null) ?? { message: '요청에 실패했습니다', code: 'INTERNAL_ERROR' },
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
