// 프로토타입 역할 컨텍스트 — 로그인 대신 시작 화면에서 역할/소속을 선택한다

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@rmc/shared';

interface RoleState {
  role: UserRole | null;
  siteId: number | null;
  siteName: string | null;
  plantId: number | null;
  plantName: string | null;
  selectSite: (id: number, name: string) => void;
  selectPlant: (id: number, name: string) => void;
  reset: () => void;
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: null,
      siteId: null,
      siteName: null,
      plantId: null,
      plantName: null,
      selectSite: (id, name) => set({ role: 'site', siteId: id, siteName: name }),
      selectPlant: (id, name) => set({ role: 'plant', plantId: id, plantName: name }),
      reset: () =>
        set({ role: null, siteId: null, siteName: null, plantId: null, plantName: null }),
    }),
    { name: 'rmc-role' },
  ),
);
