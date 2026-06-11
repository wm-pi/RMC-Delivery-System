import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router';
import './app.css';

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID as string | undefined;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>레미콘 운송 관리</title>
        <Meta />
        <Links />
        {NAVER_CLIENT_ID && (
          <script
            src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`}
          />
        )}
      </head>
      <body className="bg-slate-100 text-slate-900">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '알 수 없는 오류가 발생했습니다';
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
      <p className="text-sm text-slate-500">{message}</p>
      <a href="/" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
        처음으로 돌아가기
      </a>
    </div>
  );
}
