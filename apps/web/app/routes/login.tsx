// 로그인 화면 — 역할 선택을 대체. 인증 성공 시 역할에 맞는 화면으로 이동

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import type { LoginResponseDto } from '@rmc/shared';
import { api, ApiError } from '~/shared/api/client';
import { useAuthStore } from '~/shared/lib/auth.store';
import { Button, ErrorState, inputCls } from '~/shared/ui';

const HOME_BY_ROLE = { site: '/site', plant: '/plant' } as const;

/** 프로토타입 데모 계정 — 클릭 한 번으로 로그인 */
const DEMO_ACCOUNTS = [
  { username: 'site1', label: '🏗️ 현장 담당자', desc: '주문·타설 관리' },
  { username: 'plant1', label: '🏭 덕원레미콘', desc: '접수·배차' },
  { username: 'plant2', label: '🏭 한라레미콘', desc: '접수·배차' },
];
const DEMO_PASSWORD = '1234';

export default function Login() {
  const navigate = useNavigate();
  const { token, role, login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 이미 로그인된 상태면 대시보드로
  useEffect(() => {
    if (token && role) navigate(HOME_BY_ROLE[role], { replace: true });
  }, [token, role, navigate]);

  const submit = useMutation({
    mutationFn: (creds: { username: string; password: string }) =>
      api.post<LoginResponseDto>('/auth/login', creds),
    onSuccess: (res) => {
      login(res.token, res.user);
      navigate(HOME_BY_ROLE[res.user.role], { replace: true });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    submit.mutate({ username: username.trim(), password });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6">
      <div className="mb-8 text-center">
        <div className="text-4xl">🚛</div>
        <h1 className="mt-2 text-2xl font-extrabold text-white">레미콘 운송 관리 시스템</h1>
        <p className="mt-1 text-sm text-slate-400">
          유선 통화 없이 주문 · 배차 · 타설 현황을 한 화면에서 관리합니다
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-slate-800 p-6">
        <label className="mb-1 block text-xs font-semibold text-slate-300">아이디</label>
        <input
          className={`${inputCls} mb-3`}
          placeholder="site1"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="mb-1 block text-xs font-semibold text-slate-300">비밀번호</label>
        <input
          type="password"
          className={`${inputCls} mb-4`}
          placeholder="••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {submit.isError && (
          <div className="mb-3">
            <ErrorState
              message={submit.error instanceof ApiError ? submit.error.message : '로그인에 실패했습니다'}
            />
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={submit.isPending}
          disabled={!username.trim() || !password}
        >
          로그인
        </Button>

        <div className="mt-5 border-t border-slate-700 pt-4">
          <div className="mb-2 text-xs font-semibold text-slate-300">데모 계정 — 클릭 한 번으로 로그인</div>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                disabled={submit.isPending}
                onClick={() => submit.mutate({ username: acc.username, password: DEMO_PASSWORD })}
                className="flex items-center justify-between rounded-md border border-slate-600 bg-slate-700/40 px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:border-blue-400 hover:bg-slate-700 disabled:opacity-50"
              >
                <span className="font-semibold">{acc.label}</span>
                <span className="text-xs text-slate-400">{acc.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </form>

      <p className="mt-6 text-xs text-slate-500">
        로컬 프로토타입 — 데이터는 로컬 SQLite에 저장되며, 차량 위치는 시뮬레이션됩니다
      </p>
    </div>
  );
}
