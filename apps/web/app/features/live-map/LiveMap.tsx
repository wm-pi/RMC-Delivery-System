// 실시간 운송 지도 — 서버(시뮬레이터)가 갱신하는 배차 위치를 네이버 지도에 표시한다

import { useEffect, useRef, useState } from 'react';
import type { ActiveDeliveryDto } from '@rmc/shared';
import { DELIVERY_STATUS_LABEL, formatDistance, formatETA, formatQuantity } from '@rmc/shared';
import { useActiveDeliveries } from '~/entities/delivery/queries';
import { usePlants, useSites } from '~/entities/master/queries';

const C = {
  sidebar: '#0f1e36',
  border: '#1e3a5f',
  accent: '#00c896',
  accentBg: 'rgba(0,200,150,0.12)',
  text: '#e2e8f0',
  muted: '#7a90a8',
  card: '#162338',
};

const ROUTE_COLORS = ['#00c896', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#22d3ee'];

const MOVING_STATUSES = new Set(['in_transit', 'returning']);

function factoryMarkerHTML(name: string) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:38px;height:38px;background:#1d4ed8;border-radius:8px;
        display:flex;align-items:center;justify-content:center;font-size:20px;
        box-shadow:0 2px 10px rgba(0,0,0,.5);border:2px solid #93c5fd;">🏭</div>
      <div style="background:rgba(15,30,54,.9);color:#93c5fd;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;margin-top:3px;white-space:nowrap;
        border:1px solid #1e3a5f;">${name}</div>
    </div>`;
}

function siteMarkerHTML(name: string) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:38px;height:38px;background:#b45309;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:20px;
        box-shadow:0 2px 10px rgba(0,0,0,.5);border:2px solid #fcd34d;">🏗️</div>
      <div style="background:rgba(15,30,54,.9);color:#fcd34d;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;margin-top:3px;white-space:nowrap;
        border:1px solid #1e3a5f;">${name}</div>
    </div>`;
}

function truckMarkerHTML(truckNumber: string, statusLabel: string, color: string, selected: boolean, seq: number) {
  const ring = selected
    ? `box-shadow:0 0 0 3px ${color},0 2px 12px rgba(0,0,0,.6);`
    : 'box-shadow:0 2px 8px rgba(0,0,0,.5);';
  return `
    <div style="position:relative;background:${color};border-radius:9px;padding:4px 8px;${ring}
      border:2px solid ${selected ? '#fff' : 'rgba(255,255,255,.6)'};display:flex;flex-direction:column;
      align-items:center;gap:1px;min-width:62px;cursor:pointer;">
      <div style="position:absolute;top:-8px;left:-8px;width:18px;height:18px;border-radius:50%;
        background:#fff;color:#000;font-size:10px;font-weight:900;line-height:18px;text-align:center;">${seq}</div>
      <span style="font-size:16px;line-height:1.1;">🚛</span>
      <span style="font-size:9px;color:#fff;font-weight:800;white-space:nowrap;">${truckNumber}</span>
      <span style="font-size:8px;color:rgba(255,255,255,.85);white-space:nowrap;">${statusLabel}</span>
    </div>`;
}

function colorOf(delivery: ActiveDeliveryDto, index: number): string {
  if (delivery.status === 'arrived' || delivery.status === 'pouring') return '#f97316';
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

export function LiveMap() {
  const { data: plants = [] } = usePlants();
  const { data: sites = [] } = useSites();
  const { data: deliveries = [] } = useActiveDeliveries(2000);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapElRef = useRef<HTMLDivElement>(null);
  const naverMap = useRef<naver.maps.Map | null>(null);
  const plantMkrs = useRef<Record<number, naver.maps.Marker>>({});
  const siteMkrs = useRef<Record<number, naver.maps.Marker>>({});
  const truckMkrs = useRef<Record<number, naver.maps.Marker>>({});
  const pastLines = useRef<Record<number, naver.maps.Polyline>>({});
  const futureLines = useRef<Record<number, naver.maps.Polyline>>({});

  // ── 지도 초기화 (root.tsx에서 스크립트 선로드, 전역 naver 폴링) ──
  useEffect(() => {
    if (!mapElRef.current || naverMap.current) return;

    function initMap() {
      if (naverMap.current || !mapElRef.current) return;
      naverMap.current = new naver.maps.Map(mapElRef.current, {
        center: new naver.maps.LatLng(37.352, 127.927),
        zoom: 13,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
        scaleControl: false,
        mapDataControl: false,
      });
      setMapReady(true);
      // 인증 성공 — 자동 재시도 카운터 초기화 (다음 일시 오류 때 다시 재시도 가능)
      try {
        sessionStorage.removeItem('naverAuthRetry');
      } catch {
        /* sessionStorage 비활성 환경 무시 */
      }
    }

    let poll: ReturnType<typeof setInterval> | null = null;
    if (typeof naver !== 'undefined' && naver.maps) {
      initMap();
    } else {
      poll = setInterval(() => {
        if (typeof naver !== 'undefined' && naver.maps) {
          clearInterval(poll!);
          poll = null;
          initMap();
        }
      }, 50);
    }

    return () => {
      if (poll) clearInterval(poll);
      [plantMkrs, siteMkrs, truckMkrs].forEach((ref) =>
        Object.values(ref.current).forEach((m) => m.setMap(null)),
      );
      [pastLines, futureLines].forEach((ref) =>
        Object.values(ref.current).forEach((l) => l.setMap(null)),
      );
      naverMap.current = null;
    };
  }, []);

  // ── 공장/현장 마커 동기화 ──
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    const map = naverMap.current;

    plants.forEach((p) => {
      if (plantMkrs.current[p.id]) return;
      plantMkrs.current[p.id] = new naver.maps.Marker({
        position: new naver.maps.LatLng(p.lat, p.lng),
        map,
        icon: { content: factoryMarkerHTML(p.name), anchor: new naver.maps.Point(19, 58) },
        zIndex: 10,
      });
    });
    sites.forEach((s) => {
      if (siteMkrs.current[s.id]) return;
      siteMkrs.current[s.id] = new naver.maps.Marker({
        position: new naver.maps.LatLng(s.lat, s.lng),
        map,
        icon: { content: siteMarkerHTML(s.name), anchor: new naver.maps.Point(19, 58) },
        zIndex: 10,
      });
    });
  }, [mapReady, plants, sites]);

  // ── 차량 마커 + 경로선 동기화 ──
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    const map = naverMap.current;

    const visible = deliveries.filter((d) => d.lat != null && d.lng != null);
    const visibleIds = new Set(visible.map((d) => d.id));

    // 사라진 배차 정리
    for (const ref of [truckMkrs, pastLines, futureLines] as const) {
      for (const idStr of Object.keys(ref.current)) {
        const id = Number(idStr);
        if (!visibleIds.has(id)) {
          ref.current[id].setMap(null);
          delete ref.current[id];
        }
      }
    }

    visible.forEach((d, i) => {
      const color = colorOf(d, i);
      const isSel = selectedId === d.id;
      const cur = new naver.maps.LatLng(d.lat!, d.lng!);
      const statusLabel = DELIVERY_STATUS_LABEL[d.status];

      if (truckMkrs.current[d.id]) {
        truckMkrs.current[d.id].setPosition(cur);
        truckMkrs.current[d.id].setIcon({
          content: truckMarkerHTML(d.truckNumber, statusLabel, color, isSel, d.seq),
          anchor: new naver.maps.Point(34, 26),
        });
        truckMkrs.current[d.id].setZIndex(isSel ? 100 : 50);
      } else {
        const marker = new naver.maps.Marker({
          position: cur,
          map,
          icon: {
            content: truckMarkerHTML(d.truckNumber, statusLabel, color, isSel, d.seq),
            anchor: new naver.maps.Point(34, 26),
          },
          zIndex: isSel ? 100 : 50,
        });
        naver.maps.Event.addListener(marker, 'click', () =>
          setSelectedId((prev) => (prev === d.id ? null : d.id)),
        );
        truckMkrs.current[d.id] = marker;
      }

      // 이동 중인 차량만 경로선 표시
      if (MOVING_STATUSES.has(d.status)) {
        const [from, to] =
          d.status === 'returning' ? [d.destination, d.origin] : [d.origin, d.destination];
        const fromLL = new naver.maps.LatLng(from.lat, from.lng);
        const toLL = new naver.maps.LatLng(to.lat, to.lng);

        if (pastLines.current[d.id]) {
          pastLines.current[d.id].setOptions({
            path: [fromLL, cur],
            strokeColor: color,
            strokeWeight: isSel ? 4 : 2,
            strokeOpacity: isSel ? 1 : 0.6,
          });
        } else {
          pastLines.current[d.id] = new naver.maps.Polyline({
            path: [fromLL, cur], map, strokeColor: color,
            strokeWeight: isSel ? 4 : 2, strokeOpacity: isSel ? 1 : 0.6, strokeStyle: 'solid',
          });
        }
        if (futureLines.current[d.id]) {
          futureLines.current[d.id].setOptions({
            path: [cur, toLL],
            strokeColor: color,
            strokeOpacity: isSel ? 0.5 : 0.2,
          });
        } else {
          futureLines.current[d.id] = new naver.maps.Polyline({
            path: [cur, toLL], map, strokeColor: color,
            strokeWeight: 2, strokeOpacity: isSel ? 0.5 : 0.2, strokeStyle: 'shortdash',
          });
        }
      } else {
        for (const ref of [pastLines, futureLines] as const) {
          if (ref.current[d.id]) {
            ref.current[d.id].setMap(null);
            delete ref.current[d.id];
          }
        }
      }
    });
  }, [mapReady, deliveries, selectedId]);

  const selected = deliveries.find((d) => d.id === selectedId) ?? null;
  const selectedColor = selected
    ? colorOf(selected, deliveries.findIndex((d) => d.id === selected.id))
    : C.accent;

  const inTransit = deliveries.filter((d) => d.status === 'in_transit').length;
  const onSite = deliveries.filter((d) => d.status === 'arrived' || d.status === 'pouring').length;
  const returning = deliveries.filter((d) => d.status === 'returning').length;
  const totalQty = deliveries.reduce((sum, d) => sum + d.quantityM3, 0);

  return (
    <div className="flex h-full" style={{ background: C.sidebar }}>
      {/* ── 사이드바: 활성 배차 목록 ── */}
      <div
        className="flex w-72 min-w-72 flex-col overflow-hidden border-r"
        style={{ background: C.sidebar, borderColor: C.border }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: C.border }}>
          <div className="text-sm font-extrabold" style={{ color: C.text }}>
            실시간 운송 현황
          </div>
          <div className="mt-0.5 text-xs" style={{ color: C.muted }}>
            <span style={{ color: C.accent }}>{inTransit}대 운송 중</span> · 현장 {onSite}대 · 복귀 {returning}대
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {deliveries.length === 0 && (
            <p className="pt-10 text-center text-xs" style={{ color: C.muted }}>
              활성 배차가 없습니다
            </p>
          )}
          {deliveries.map((d, i) => {
            const color = colorOf(d, i);
            const isSel = selectedId === d.id;
            return (
              <div
                key={d.id}
                onClick={() => setSelectedId(isSel ? null : d.id)}
                className="mb-1.5 cursor-pointer rounded-lg border p-2.5"
                style={{
                  background: isSel ? C.border : C.card,
                  borderColor: isSel ? color : C.border,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white"
                      style={{ background: color }}
                    >
                      {d.seq}
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: C.text }}>
                      {d.truckNumber}
                    </span>
                    <span
                      className="rounded px-1 py-0.5 text-[9px] font-bold"
                      style={
                        d.trackingMode === 'gps'
                          ? { color: '#34d399', border: '1px solid rgba(52,211,153,.4)' }
                          : { color: C.muted, border: `1px solid ${C.border}` }
                      }
                      title={d.trackingMode === 'gps' ? '기사 폰 실측' : '지도거리 추정'}
                    >
                      {d.trackingMode === 'gps' ? '실측' : '추정'}
                    </span>
                    {d.stale && (
                      <span className="text-[9px] font-bold text-amber-400" title="GPS 신호 끊김">
                        위치 끊김
                      </span>
                    )}
                  </div>
                  <span
                    className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ color, borderColor: color, background: C.accentBg }}
                  >
                    {DELIVERY_STATUS_LABEL[d.status]}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-relaxed" style={{ color: C.muted }}>
                  <div style={{ color: '#93c5fd' }}>🏭 {d.plantName}</div>
                  <div style={{ color: '#fcd34d' }}>🏗️ {d.siteName}</div>
                  <div>
                    {d.orderNo} · {d.concreteGrade} · {formatQuantity(d.quantityM3)}
                  </div>
                </div>
                {MOVING_STATUSES.has(d.status) && (
                  <div className="mt-1.5">
                    <div className="h-1 overflow-hidden rounded-full" style={{ background: C.border }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round(d.progress * 100)}%`, background: color }}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px]" style={{ color: C.muted }}>
                      <span>{Math.round(d.progress * 100)}%</span>
                      <span style={{ color: C.accent }}>{formatETA(d.etaMinutes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="flex gap-3 border-t px-4 py-2 text-[11px]"
          style={{ borderColor: C.border, color: C.muted }}
        >
          <span>🏭 공장</span>
          <span>🏗️ 현장</span>
          <span>🚛 차량</span>
        </div>
      </div>

      {/* ── 지도 영역 ── */}
      <div className="relative flex-1">
        <div ref={mapElRef} className="h-full w-full" />

        {/* 상단 통계 */}
        <div className="absolute left-1/2 top-4 z-[500] flex -translate-x-1/2 gap-2">
          {[
            { label: '운송 중', value: `${inTransit}대`, color: C.accent },
            { label: '현장 대기/타설', value: `${onSite}대`, color: '#f97316' },
            { label: '복귀 중', value: `${returning}대`, color: '#14b8a6' },
            { label: '운송 물량', value: formatQuantity(totalQty), color: '#93c5fd' },
          ].map((s) => (
            <div
              key={s.label}
              className="min-w-20 rounded-lg border px-3 py-1.5 text-center backdrop-blur"
              style={{ background: 'rgba(15,30,54,.9)', borderColor: C.border }}
            >
              <div className="text-[15px] font-extrabold" style={{ color: s.color }}>
                {s.value}
              </div>
              <div className="text-[10px]" style={{ color: C.muted }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 선택 차량 정보 패널 */}
        <div
          className="absolute right-4 top-4 z-[500] w-48 rounded-xl border backdrop-blur"
          style={{ background: 'rgba(15,30,54,0.93)', borderColor: C.border }}
        >
          <div className="border-b px-4 py-3 text-center" style={{ borderColor: C.border }}>
            <div className="text-[10px] tracking-widest" style={{ color: C.muted }}>
              현재 속도
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span
                className="text-4xl font-extrabold tabular-nums"
                style={{ color: selected && selected.currentSpeedKmh > 0 ? C.accent : C.muted }}
              >
                {(selected?.currentSpeedKmh ?? 0).toFixed(0)}
              </span>
              <span className="text-xs" style={{ color: C.muted }}>
                km/h
              </span>
            </div>
          </div>
          {selected ? (
            <div className="px-3.5 py-2.5">
              {[
                { label: '차량번호', value: selected.truckNumber, c: selectedColor },
                { label: '기사', value: selected.driverName },
                { label: '상태', value: DELIVERY_STATUS_LABEL[selected.status] },
                { label: '규격', value: selected.concreteGrade },
                { label: '수량', value: formatQuantity(selected.quantityM3) },
                ...(MOVING_STATUSES.has(selected.status)
                  ? [
                      { label: '남은 거리', value: formatDistance(selected.remainingKm) },
                      { label: '도착 예상', value: formatETA(selected.etaMinutes), c: C.accent },
                    ]
                  : []),
              ].map(({ label, value, c }) => (
                <div key={label} className="mb-1 flex justify-between text-[11px]">
                  <span style={{ color: C.muted }}>{label}</span>
                  <span className="font-semibold" style={{ color: c ?? C.text }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-3 text-center text-xs" style={{ color: C.muted }}>
              차량을 선택하세요
            </div>
          )}
        </div>

        {!mapReady && (
          <div
            className="absolute inset-0 z-[400] flex items-center justify-center text-sm"
            style={{ background: 'rgba(15,30,54,.85)', color: C.muted }}
          >
            지도 로딩 중...
          </div>
        )}
      </div>
    </div>
  );
}
