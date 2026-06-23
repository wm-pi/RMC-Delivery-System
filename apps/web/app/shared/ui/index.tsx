// 도메인 지식 없는 공통 UI — Tailwind 기반 경량 디자인 시스템

import { useEffect } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useToastStore, type ToastType } from '~/shared/lib/toast.store';

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
  /** 처리 중 — 비활성화 + 스피너 표시 (중복 제출 방지) */
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const sizeCls = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors disabled:cursor-not-allowed ${sizeCls} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {label}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-12 text-center text-sm text-slate-400">{message}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-1/2 top-1/2 z-50 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

/** 파괴적/영향 큰 액션 확인 — 무엇이 바뀌는지 + 확인/취소를 한 곳에서 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = '확인',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: {
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel?: string;
  readonly confirmVariant?: keyof typeof BUTTON_VARIANTS;
  readonly loading?: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="mb-5 text-sm text-slate-600">{description}</div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

const TOAST_STYLE: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-slate-200 bg-white text-slate-700',
};

/** 단일 토스트 — 표시 후 자동 소멸 (undo 액션이 있으면 더 오래 유지) */
function ToastRow({ id, type, message, action }: ToastItemProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const ms = action ? 6000 : 3000;
    const timer = setTimeout(() => dismiss(id), ms);
    return () => clearTimeout(timer);
  }, [id, action, dismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-md ${TOAST_STYLE[type]}`}
    >
      <span className="min-w-0 flex-1">{message}</span>
      {action && (
        <button
          type="button"
          className="shrink-0 font-bold underline underline-offset-2"
          onClick={() => {
            action.onClick();
            dismiss(id);
          }}
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="닫기"
        className="shrink-0 text-current/50 hover:text-current"
        onClick={() => dismiss(id)}
      >
        ✕
      </button>
    </div>
  );
}

interface ToastItemProps {
  readonly id: number;
  readonly type: ToastType;
  readonly message: string;
  readonly action?: { label: string; onClick: () => void };
}

/** 전역 토스트 스택 — root에서 1회 렌더 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <ToastRow key={t.id} id={t.id} type={t.type} message={t.message} action={t.action} />
      ))}
    </div>
  );
}

export function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
      <div className="text-xl font-extrabold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

export const inputCls =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
