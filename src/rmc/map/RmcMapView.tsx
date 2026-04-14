import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVehicleTracking } from './useVehicleTracking';
import type { TrackedVehicle } from './useVehicleTracking';
import { SITES, loadPlants, savePlants } from './mapData';
import type { PlantLocation } from './mapData';
import type { LatLng } from './mapUtils';

// ─────────────────────────────────────────────
// 색상 팔레트
// ─────────────────────────────────────────────
const C = {
  sidebar:  '#0f1e36',
  border:   '#1e3a5f',
  accent:   '#00c896',
  accentBg: 'rgba(0,200,150,0.12)',
  text:     '#e2e8f0',
  muted:    '#7a90a8',
  card:     '#162338',
  input:    '#0d1b2e',
};
const ROUTE_COLORS = ['#00c896', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899'];

// ─────────────────────────────────────────────
// 커스텀 마커 HTML
// ─────────────────────────────────────────────
function factoryMarkerHTML(name: string) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="width:38px;height:38px;background:#1d4ed8;border-radius:8px;
        display:flex;align-items:center;justify-content:center;font-size:20px;
        box-shadow:0 2px 10px rgba(0,0,0,.5);border:2px solid #93c5fd;">🏭</div>
      <div style="background:rgba(15,30,54,.9);color:#93c5fd;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;margin-top:3px;white-space:nowrap;
        border:1px solid #1e3a5f;box-shadow:0 1px 4px rgba(0,0,0,.4);">${name}</div>
    </div>`;
}

function siteMarkerHTML(name: string) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="width:38px;height:38px;background:#b45309;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:20px;
        box-shadow:0 2px 10px rgba(0,0,0,.5);border:2px solid #fcd34d;">🏗️</div>
      <div style="background:rgba(15,30,54,.9);color:#fcd34d;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;margin-top:3px;white-space:nowrap;
        border:1px solid #1e3a5f;box-shadow:0 1px 4px rgba(0,0,0,.4);">${name}</div>
    </div>`;
}

function truckMarkerHTML(truckNumber: string, arrived: boolean, color: string, selected: boolean, seq: number) {
  const bg     = arrived ? '#374151' : color;
  const ring   = selected ? `box-shadow:0 0 0 3px ${color},0 2px 12px rgba(0,0,0,.6);` : 'box-shadow:0 2px 8px rgba(0,0,0,.5);';
  const border = selected ? '#fff' : 'rgba(255,255,255,.6)';
  return `
    <div style="position:relative;background:${bg};border-radius:9px;padding:4px 8px;${ring}
      border:2px solid ${border};display:flex;flex-direction:column;
      align-items:center;gap:2px;min-width:62px;cursor:pointer;">
      <div style="position:absolute;top:-8px;left:-8px;width:18px;height:18px;border-radius:50%;
        background:#fff;color:#000;font-size:10px;font-weight:900;line-height:18px;text-align:center;
        box-shadow:0 1px 4px rgba(0,0,0,.5);">${seq}</div>
      <span style="font-size:16px;line-height:1.1;">🚛</span>
      <span style="font-size:9px;color:#fff;font-weight:800;white-space:nowrap;letter-spacing:.3px;">${truckNumber}</span>
    </div>`;
}

function pinMarkerHTML() {
  return `<div style="width:20px;height:20px;background:#ef4444;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6);"></div>`;
}

// ─────────────────────────────────────────────
// 공장 추가 모달
// ─────────────────────────────────────────────
function AddPlantModal({
  pickingMode,
  onStartPick,
  onAdd,
  onClose,
  pickedPos,
  initialName,
}: {
  pickingMode: boolean;
  onStartPick: (name: string) => void;
  onAdd: (plant: Omit<PlantLocation, 'id'>) => void;
  onClose: () => void;
  pickedPos: LatLng | null;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [lat, setLat]   = useState('');
  const [lng, setLng]   = useState('');

  useEffect(() => {
    if (pickedPos) {
      setLat(pickedPos.lat.toFixed(6));
      setLng(pickedPos.lng.toFixed(6));
    }
  }, [pickedPos]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.text, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  function handleAdd() {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (!name.trim() || isNaN(latN) || isNaN(lngN)) return;
    onAdd({ name: name.trim(), position: { lat: latN, lng: lngN } });
  }

  if (pickingMode) return null; // 핀 찍기 모드 중엔 모달 숨김

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 2000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 2001, width: 340,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: 22, boxShadow: '0 8px 40px rgba(0,0,0,.7)',
      }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 16 }}>🏭 레미콘 공장 추가</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>공장 이름</div>
          <input style={inputStyle} placeholder="예) 덕원레미콘 원주공장" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>위도 (lat)</div>
            <input style={inputStyle} placeholder="37.361200" value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>경도 (lng)</div>
            <input style={inputStyle} placeholder="127.908800" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>

        <button
          onClick={() => { if (name.trim()) onStartPick(name.trim()); }}
          style={{
            width: '100%', padding: '8px', marginBottom: 12,
            borderRadius: 6, border: `1px dashed ${C.border}`,
            background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer',
          }}
        >
          📍 지도에서 직접 클릭해서 위치 선택
        </button>

        {pickedPos && (
          <div style={{ fontSize: 11, color: C.accent, marginBottom: 10 }}>
            ✓ 선택된 위치: {pickedPos.lat.toFixed(5)}, {pickedPos.lng.toFixed(5)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !lat || !lng}
            style={{ flex: 1, padding: 9, borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 13, cursor: name.trim() && lat && lng ? 'pointer' : 'not-allowed', background: name.trim() && lat && lng ? C.accent : '#1e3a5f', color: name.trim() && lat && lng ? '#000' : C.muted }}
          >
            추가
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// 우측 속도 패널
// ─────────────────────────────────────────────
function InfoPanel({ v, color }: { v: TrackedVehicle | null; color: string }) {
  const speed = v ? (v.arrived ? 0 : v.currentSpeedKmh) : 0;
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 500,
      width: 178, background: 'rgba(15,30,54,0.93)',
      border: `1px solid ${C.border}`, borderRadius: 12,
      backdropFilter: 'blur(10px)', boxShadow: '0 4px 24px rgba(0,0,0,.5)',
    }}>
      <div style={{ padding: '14px 16px 10px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, marginBottom: 4 }}>현재 속도</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: speed > 0 ? C.accent : C.muted, lineHeight: 1, fontVariantNumeric: 'tabular-nums', transition: 'color .3s' }}>
            {speed.toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>km/h</span>
        </div>
      </div>
      {v ? (
        <div style={{ padding: '10px 14px' }}>
          {[
            { label: '차량번호', value: v.truckNumber, c: color },
            { label: '기사',     value: v.driverName },
            { label: '배합',     value: v.concreteGrade },
            { label: '수량',     value: `${v.quantity}m³` },
            { label: '남은 거리', value: v.distanceText },
            ...(!v.arrived ? [{ label: '도착 예상', value: v.etaText, c: C.accent }] : []),
          ].map(({ label, value, c }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: C.muted }}>{label}</span>
              <span style={{ color: c ?? C.text, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: C.muted }}>차량을 선택하세요</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 상단 통계 칩
// ─────────────────────────────────────────────
function StatBar({ vehicles }: { vehicles: TrackedVehicle[] }) {
  const inTransit = vehicles.filter((v) => !v.arrived).length;
  const arrived   = vehicles.filter((v) => v.arrived).length;
  const totalQty  = vehicles.reduce((s, v) => s + v.quantity, 0);
  return (
    <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', gap: 8 }}>
      {[
        { label: '운송 중',  value: `${inTransit}대`, color: C.accent },
        { label: '도착 완료', value: `${arrived}대`,  color: C.muted  },
        { label: '총 출하량', value: `${totalQty}m³`, color: '#93c5fd' },
      ].map((s) => (
        <div key={s.label} style={{
          background: 'rgba(15,30,54,.9)', border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '7px 14px',
          backdropFilter: 'blur(8px)', textAlign: 'center', minWidth: 76,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 지도 컴포넌트
// ─────────────────────────────────────────────
export default function RmcMapView() {
  const [plants, setPlants]       = useState<PlantLocation[]>(loadPlants);
  const [showModal, setShowModal] = useState(false);
  const [pickingMode, setPickingMode] = useState(false);
  const [pickedPos, setPickedPos] = useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady]   = useState(false);
  const [now, setNow] = useState(() => new Date());
  const pendingNameRef = useRef('');

  const vehicles = useVehicleTracking(60, plants);

  // Naver Map refs
  const mapElRef    = useRef<HTMLDivElement>(null);
  const naverMap    = useRef<naver.maps.Map | null>(null);
  const plantMkrs   = useRef<Record<string, naver.maps.Marker>>({});
  const siteMkrs    = useRef<Record<string, naver.maps.Marker>>({});
  const vehicleMkrs = useRef<Record<string, naver.maps.Marker>>({});
  const pastLines   = useRef<Record<string, naver.maps.Polyline>>({});
  const futureLines = useRef<Record<string, naver.maps.Polyline>>({});
  const pinMkr      = useRef<naver.maps.Marker | null>(null);
  const clickListener = useRef<naver.maps.MapEventListener | null>(null);

  // 1초마다 현재 시각 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── 네이버 지도 초기화 (index.html에서 스크립트 선로드) ──
  useEffect(() => {
    if (!mapElRef.current || naverMap.current) return;

    function initMap() {
      if (naverMap.current) return; // double-init 방지
      const map = new naver.maps.Map(mapElRef.current!, {
        center: new naver.maps.LatLng(37.348, 127.927),
        zoom: 14,
        zoomControl: true,
        zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT },
        scaleControl: false,
        mapDataControl: false,
      });
      naverMap.current = map;
      setMapReady(true);
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
      Object.values(plantMkrs.current).forEach((m) => m.setMap(null));
      Object.values(siteMkrs.current).forEach((m) => m.setMap(null));
      Object.values(vehicleMkrs.current).forEach((m) => m.setMap(null));
      Object.values(pastLines.current).forEach((l) => l.setMap(null));
      Object.values(futureLines.current).forEach((l) => l.setMap(null));
      naverMap.current = null;
    };
  }, []);

  // ── 공장 마커 동기화 ──────────────────────────
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    if (typeof naver === 'undefined' || !naver.maps) return;
    const map = naverMap.current;

    // 삭제된 공장 마커 제거
    Object.keys(plantMkrs.current).forEach((id) => {
      if (!plants.find((p) => p.id === id)) {
        plantMkrs.current[id].setMap(null);
        delete plantMkrs.current[id];
      }
    });

    // 추가/갱신
    plants.forEach((p) => {
      if (plantMkrs.current[p.id]) {
        plantMkrs.current[p.id].setPosition(new naver.maps.LatLng(p.position.lat, p.position.lng));
        (plantMkrs.current[p.id] as naver.maps.Marker).setIcon({
          content: factoryMarkerHTML(p.name),
          anchor: new naver.maps.Point(19, 58),
        });
      } else {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(p.position.lat, p.position.lng),
          map,
          icon: { content: factoryMarkerHTML(p.name), anchor: new naver.maps.Point(19, 58) },
          zIndex: 10,
        });
        plantMkrs.current[p.id] = marker;
      }
    });
  }, [mapReady, plants]);

  // ── 현장 마커 (최초 1회) ──────────────────────
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    if (typeof naver === 'undefined' || !naver.maps) return;
    const map = naverMap.current;

    SITES.forEach((s) => {
      if (siteMkrs.current[s.id]) return;
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(s.position.lat, s.position.lng),
        map,
        icon: { content: siteMarkerHTML(s.name), anchor: new naver.maps.Point(19, 58) },
        zIndex: 10,
      });
      siteMkrs.current[s.id] = marker;
    });
  }, [mapReady]);

  // ── 차량 마커 + 경로선 업데이트 (매초) ─────────
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    if (typeof naver === 'undefined' || !naver.maps) return;
    const map = naverMap.current;

    vehicles.forEach((v, i) => {
      const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
      const isSel = selectedId === v.id;
      const cur   = new naver.maps.LatLng(v.currentPosition.lat, v.currentPosition.lng);
      const org   = new naver.maps.LatLng(v.origin.lat, v.origin.lng);
      const dst   = new naver.maps.LatLng(v.destination.lat, v.destination.lng);

      // 차량 마커
      if (vehicleMkrs.current[v.id]) {
        vehicleMkrs.current[v.id].setPosition(cur);
        vehicleMkrs.current[v.id].setIcon({
          content: truckMarkerHTML(v.truckNumber, v.arrived, color, isSel, i + 1),
          anchor: new naver.maps.Point(34, 21),
        });
        vehicleMkrs.current[v.id].setZIndex(isSel ? 100 : 50);
      } else {
        const marker = new naver.maps.Marker({
          position: cur,
          map,
          icon: { content: truckMarkerHTML(v.truckNumber, v.arrived, color, isSel, i + 1), anchor: new naver.maps.Point(34, 21) },
          zIndex: isSel ? 100 : 50,
        });
        naver.maps.Event.addListener(marker, 'click', () =>
          setSelectedId((prev) => (prev === v.id ? null : v.id)),
        );
        vehicleMkrs.current[v.id] = marker;
      }

      // 지나온 경로 (실선)
      if (pastLines.current[v.id]) {
        pastLines.current[v.id].setPath([org, cur]);
        pastLines.current[v.id].setOptions({ strokeColor: color, strokeWeight: isSel ? 4 : 2, strokeOpacity: isSel ? 1 : 0.6 });
      } else {
        pastLines.current[v.id] = new naver.maps.Polyline({
          path: [org, cur], map,
          strokeColor: color, strokeWeight: isSel ? 4 : 2,
          strokeOpacity: isSel ? 1 : 0.6, strokeStyle: 'solid',
        });
      }

      // 남은 경로 (점선)
      if (futureLines.current[v.id]) {
        futureLines.current[v.id].setPath([cur, dst]);
        futureLines.current[v.id].setOptions({ strokeColor: color, strokeWeight: 2, strokeOpacity: isSel ? 0.5 : 0.2 });
      } else {
        futureLines.current[v.id] = new naver.maps.Polyline({
          path: [cur, dst], map,
          strokeColor: color, strokeWeight: 2,
          strokeOpacity: isSel ? 0.5 : 0.2, strokeStyle: 'dashed',
          strokeLineCap: 'round',
        });
      }
    });
  }, [mapReady, vehicles, selectedId]);

  // ── 지도 클릭 핀 찍기 ─────────────────────────
  useEffect(() => {
    if (!mapReady || !naverMap.current) return;
    if (typeof naver === 'undefined' || !naver.maps) return;
    const map = naverMap.current;

    if (clickListener.current) {
      naver.maps.Event.removeListener(clickListener.current);
      clickListener.current = null;
    }

    if (pickingMode) {
      clickListener.current = naver.maps.Event.addListener(map, 'click', (e: { coord: naver.maps.LatLng }) => {
        const pos = { lat: e.coord.lat(), lng: e.coord.lng() };
        setPickedPos(pos);

        // 핀 마커
        if (pinMkr.current) {
          pinMkr.current.setPosition(new naver.maps.LatLng(pos.lat, pos.lng));
        } else {
          pinMkr.current = new naver.maps.Marker({
            position: new naver.maps.LatLng(pos.lat, pos.lng),
            map,
            icon: { content: pinMarkerHTML(), anchor: new naver.maps.Point(10, 20) },
            zIndex: 200,
          });
        }

        // 모달 다시 열기
        setPickingMode(false);
        setShowModal(true);
      });
    }

    return () => {
      if (clickListener.current) {
        naver.maps.Event.removeListener(clickListener.current);
        clickListener.current = null;
      }
    };
  }, [mapReady, pickingMode]);

  // ── 공장 추가 콜백 ────────────────────────────
  const handleAddPlant = useCallback((data: Omit<PlantLocation, 'id'>) => {
    const newPlant: PlantLocation = { id: `P${Date.now()}`, ...data };
    const updated = [...plants, newPlant];
    setPlants(updated);
    savePlants(updated);
    setShowModal(false);
    setPickingMode(false);
    setPickedPos(null);
    pinMkr.current?.setMap(null);
    pinMkr.current = null;
  }, [plants]);

  const handleRemovePlant = useCallback((id: string) => {
    const updated = plants.filter((p) => p.id !== id);
    setPlants(updated);
    savePlants(updated);
  }, [plants]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;
  const selectedColor   = selectedVehicle
    ? ROUTE_COLORS[vehicles.findIndex((v) => v.id === selectedId) % ROUTE_COLORS.length]
    : C.accent;

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div style={{ display: 'flex', height: '100%', background: C.sidebar }}>

      {/* ── 다크 사이드바 ── */}
      <div style={{
        width: 260, minWidth: 260,
        background: C.sidebar, borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>배차 현황</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            🕐 {timeStr} &nbsp;·&nbsp;
            <span style={{ color: C.accent }}>{vehicles.filter((v) => !v.arrived).length}대 운송 중</span>
          </div>
        </div>

        {/* 차량 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {vehicles.map((v, i) => {
            const color  = ROUTE_COLORS[i % ROUTE_COLORS.length];
            const isSel  = selectedId === v.id;
            return (
              <div key={v.id} onClick={() => setSelectedId(isSel ? null : v.id)}
                style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                  background: isSel ? C.border : C.card, border: `1px solid ${isSel ? color : C.border}`, transition: 'background .15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: v.arrived ? '#374151' : color, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{v.truckNumber}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: v.arrived ? 'rgba(75,85,99,.3)' : C.accentBg,
                    color: v.arrived ? C.muted : C.accent,
                    border: `1px solid ${v.arrived ? '#374151' : 'rgba(0,200,150,.3)'}` }}>
                    {v.arrived ? '도착 완료' : '운송 중'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
                  <div style={{ color: '#93c5fd' }}>🏭 {v.plantName}</div>
                  <div style={{ color: '#fcd34d' }}>🏗️ {v.siteName}</div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: v.progressText, background: v.arrived ? '#4b5563' : color, borderRadius: 2, transition: 'width 1s linear' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginTop: 3 }}>
                    <span>{v.progressText}</span>
                    {!v.arrived && <span style={{ color: C.accent }}>{v.etaText}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 공장 목록 */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏭 등록 공장</span>
            <button onClick={() => { setPickedPos(null); setShowModal(true); }}
              style={{ background: C.accentBg, border: `1px solid rgba(0,200,150,.4)`, color: C.accent, borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              + 추가
            </button>
          </div>
          {plants.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text }}>{p.name}</span>
              <button onClick={() => handleRemovePlant(p.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: '0 4px' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted, display: 'flex', gap: 12 }}>
          <span>🏭 공장</span><span>🏗️ 현장</span><span>🚛 차량</span>
        </div>
      </div>

      {/* ── 지도 ── */}
      <div style={{ flex: 1, position: 'relative', cursor: pickingMode ? 'crosshair' : 'default' }}>
        <div ref={mapElRef} style={{ height: '100%', width: '100%' }} />

        <StatBar vehicles={vehicles} />
        <InfoPanel v={selectedVehicle} color={selectedColor} />

        {pickingMode && (
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500, background: C.accent, color: '#000',
            padding: '10px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13,
            boxShadow: '0 4px 20px rgba(0,0,0,.5)', pointerEvents: 'none',
          }}>
            📍 공장 위치를 지도에서 클릭하세요
          </div>
        )}

        {!mapReady && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,30,54,.85)', zIndex: 400, color: C.muted, fontSize: 14,
          }}>
            지도 로딩 중...
          </div>
        )}
      </div>

      {/* 공장 추가 모달 */}
      {showModal && (
        <AddPlantModal
          pickingMode={pickingMode}
          pickedPos={pickedPos}
          initialName={pendingNameRef.current}
          onStartPick={(name) => { pendingNameRef.current = name; setShowModal(false); setPickingMode(true); }}
          onAdd={handleAddPlant}
          onClose={() => { setShowModal(false); setPickingMode(false); pendingNameRef.current = ''; }}
        />
      )}
    </div>
  );
}

