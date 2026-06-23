// 기사용 모바일 추적 페이지 (공개) — 서명 링크로 진입, 폰 GPS를 서버로 전송한다.
// 로그인 불필요. api client(토큰 주입/401 리다이렉트)를 쓰지 않고 독립 fetch를 쓴다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import type { DriverTrackInfoDto, LocationPingResultDto } from '@rmc/shared';
import { DELIVERY_STATUS_LABEL } from '@rmc/shared';

async function trackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/track${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { message?: string } | null)?.message ?? '요청 실패');
  return body as T;
}

const HEADING_TEXT: Record<string, string> = {
  in_transit: '현장으로 운송 중',
  returning: '공장으로 복귀 중',
  arrived: '현장 도착 — 타설 대기',
  pouring: '타설 중',
};

export default function Track() {
  const { deliveryId } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const id = Number(deliveryId);

  const [info, setInfo] = useState<DriverTrackInfoDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [lastPing, setLastPing] = useState<{ at: Date; dist: number | null } | null>(null);
  const [status, setStatus] = useState<string>('');
  const watchRef = useRef<number | null>(null);

  // 부트스트랩
  useEffect(() => {
    if (!token || !Number.isFinite(id)) {
      setError('잘못된 추적 링크입니다');
      return;
    }
    trackFetch<DriverTrackInfoDto>(`/${id}?t=${encodeURIComponent(token)}`)
      .then((d) => {
        setInfo(d);
        setStatus(d.status);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, token]);

  const sendLocation = useCallback(
    async (lat: number, lng: number) => {
      try {
        const r = await trackFetch<LocationPingResultDto>(`/${id}/location?t=${encodeURIComponent(token)}`, {
          method: 'POST',
          body: JSON.stringify({ lat, lng }),
        });
        setStatus(r.status);
        setLastPing({ at: new Date(), dist: r.distanceToDestM });
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [id, token],
  );

  function startSharing() {
    if (!('geolocation' in navigator)) {
      setError('이 기기에서 위치 기능을 사용할 수 없습니다');
      return;
    }
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => void sendLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => setError(`위치 권한이 필요합니다 (${err.message})`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  function stopSharing() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharing(false);
  }

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const done = status === 'returned' || status === 'cancelled';

  if (error && !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center">
        <div className="rounded-xl bg-slate-800 p-6 text-slate-200">
          <div className="mb-2 text-3xl">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-900 px-5 py-8 text-slate-100">
      <div className="mb-1 text-center text-3xl">🚛</div>
      <h1 className="mb-6 text-center text-lg font-extrabold">기사 위치 공유</h1>

      {info && (
        <div className="mb-5 rounded-xl bg-slate-800 p-5">
          <div className="text-xl font-extrabold">{info.truckNumber}</div>
          <div className="mt-1 text-sm text-slate-400">
            {info.orderNo} · {info.plantName} → {info.siteName}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
              {DELIVERY_STATUS_LABEL[status as keyof typeof DELIVERY_STATUS_LABEL] ?? status}
            </span>
            <span className="text-sm text-slate-300">{HEADING_TEXT[status] ?? ''}</span>
          </div>
        </div>
      )}

      {done ? (
        <div className="rounded-xl bg-emerald-600/20 p-5 text-center text-emerald-200">
          운행이 종료되었습니다. 위치 공유를 종료합니다. 수고하셨습니다 🙌
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={sharing ? stopSharing : startSharing}
            className={`rounded-xl py-4 text-base font-extrabold transition-colors ${
              sharing ? 'bg-red-600 text-white' : 'bg-emerald-500 text-slate-900'
            }`}
          >
            {sharing ? '■ 위치 공유 중지' : '▶ 위치 공유 시작'}
          </button>

          {sharing && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              실시간 위치를 전송하고 있습니다
            </p>
          )}

          {lastPing && (
            <div className="mt-4 rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
              <div>
                마지막 전송:{' '}
                {lastPing.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              {lastPing.dist !== null && (
                <div className="mt-1">
                  목적지까지 약 <b className="text-emerald-300">{lastPing.dist.toLocaleString()}m</b>
                </div>
              )}
            </div>
          )}

          {error && info && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
        </>
      )}

      <p className="mt-auto pt-8 text-center text-xs text-slate-500">
        이 페이지는 운행 중에만 켜두세요. 위치는 배차 관제에만 사용됩니다.
      </p>
    </div>
  );
}
