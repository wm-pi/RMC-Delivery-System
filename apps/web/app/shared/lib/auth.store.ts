// 인증 컨텍스트 — 로그인 토큰과 사용자 정보를 보관 (localStorage 영속)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUserDto, UserRole } from '@rmc/shared';

interface DerivedFields {
  role: UserRole | null;
  siteId: number | null;
  siteName: string | null;
  plantId: number | null;
  plantName: string | null;
}

interface AuthState extends DerivedFields {
  token: string | null;
  user: AuthUserDto | null;
  login: (token: string, user: AuthUserDto) => void;
  logout: () => void;
}

/** user에서 화면이 쓰는 편의 필드(현장/공장 id·이름)를 파생 */
function derive(user: AuthUserDto | null): DerivedFields {
  return {
    role: user?.role ?? null,
    siteId: user?.role === 'site' ? user.siteId : null,
    siteName: user?.role === 'site' ? user.orgName : null,
    plantId: user?.role === 'plant' ? user.plantId : null,
    plantName: user?.role === 'plant' ? user.orgName : null,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      ...derive(null),
      login: (token, user) => set({ token, user, ...derive(user) }),
      logout: () => set({ token: null, user: null, ...derive(null) }),
    }),
    { name: 'rmc-auth' },
  ),
);
