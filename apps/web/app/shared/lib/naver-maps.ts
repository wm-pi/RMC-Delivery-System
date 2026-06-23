// 네이버 지도 SDK 로더 — 지도 화면에서만 1회 로드한다(전역 <head> 선로드 금지).
// SPA 이동 시에도 직접 진입과 동일하게 단일 인증이 일어나, 불필요한 중복 인증을 없앤다.

const KEY_ID = import.meta.env.VITE_NAVER_MAPS_KEY_ID as string | undefined;
const CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID as string | undefined;

// 신형 키(ncpKeyId) 우선, 없으면 구형(ncpClientId)
const SCRIPT_SRC = KEY_ID
  ? `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${KEY_ID}`
  : CLIENT_ID
    ? `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}`
    : null;

const SCRIPT_ID = 'naver-maps-sdk';

type NaverWindow = typeof globalThis & {
  naver?: { maps?: { Map?: unknown } };
  navermap_authFailure?: () => void;
};

export function isNaverReady(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as NaverWindow).naver?.maps?.Map);
}

/** SDK를 1회 로드(이미 있으면 재사용)하고 naver.maps.Map 준비 시 resolve */
export function loadNaverMaps(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!SCRIPT_SRC) {
      reject(new Error('네이버 지도 키가 설정되지 않았습니다'));
      return;
    }
    if (isNaverReady()) {
      resolve();
      return;
    }
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onerror = () => reject(new Error('네이버 지도 스크립트 로드 실패'));
      document.head.appendChild(s);
    }
    const start = Date.now();
    const iv = setInterval(() => {
      if (isNaverReady()) {
        clearInterval(iv);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(iv);
        reject(new Error('네이버 지도 로드 시간 초과'));
      }
    }, 50);
  });
}

/** 인증 실패(네이버 일시 오류) 후 재시도를 위해 SDK 흔적 제거 */
export function resetNaverMaps(): void {
  if (typeof window === 'undefined') return;
  document.getElementById(SCRIPT_ID)?.remove();
  try {
    Reflect.deleteProperty(window as NaverWindow, 'naver');
  } catch {
    /* 삭제 불가 환경 무시 */
  }
}

/** 인증 실패 콜백 등록/해제 (네이버 SDK 전역 훅) */
export function setAuthFailureHandler(fn: (() => void) | null): void {
  if (typeof window === 'undefined') return;
  (window as NaverWindow).navermap_authFailure = fn ?? undefined;
}
