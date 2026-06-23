// 전역 토스트 — 성공/오류 피드백과 되돌리기(undo) 액션을 한 곳에서 관리한다.
// 컴포넌트 밖(쿼리 onError 등)에서도 호출할 수 있도록 store getState로 push한다.

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  /** 되돌리기 등 부가 액션 (있으면 표시 시간이 길어진다) */
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = ++seq;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** 어디서든 부를 수 있는 토스트 헬퍼 */
export const toast = {
  success: (message: string) => useToastStore.getState().push({ type: 'success', message }),
  error: (message: string) => useToastStore.getState().push({ type: 'error', message }),
  info: (message: string, action?: ToastAction) =>
    useToastStore.getState().push({ type: 'info', message, action }),
};
