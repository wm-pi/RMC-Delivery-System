import React, { useState, lazy, Suspense } from 'react';
import type { DeliveryOrder, DeliveryStatus } from './rmcUtils';
import {
  DELIVERY_STATUS_LABEL,
  filterByStatus,
  formatDateTime,
  calcTransitMinutes,
} from './rmcUtils';

// 지도 컴포넌트는 Leaflet CSS 포함으로 지연 로딩
const RmcMapView = lazy(() => import('./map/RmcMapView'));

// ──────────────────────────────────────────────
// 샘플 배차 데이터
// ──────────────────────────────────────────────

const SAMPLE_ORDERS: DeliveryOrder[] = [
  {
    id: 'RMC-001',
    orderDate: '2026-04-13T08:00:00',
    plant: { id: 'P1', name: '한강레미콘 성수공장', address: '서울 성동구', contact: '02-1234-5678' },
    site: { id: 'S1', name: '강남 오피스텔 신축현장', address: '서울 강남구', contact: '010-0000-1111' },
    driver: { id: 'D1', name: '김철수', phone: '010-1111-2222', truckNumber: '12가 3456' },
    concreteGrade: '25-150-12',
    quantity: 6,
    scheduledTime: '2026-04-13T09:00:00',
    actualDepartureTime: '2026-04-13T09:05:00',
    actualArrivalTime: '2026-04-13T09:45:00',
    status: 'delivered',
  },
  {
    id: 'RMC-002',
    orderDate: '2026-04-13T08:30:00',
    plant: { id: 'P1', name: '한강레미콘 성수공장', address: '서울 성동구', contact: '02-1234-5678' },
    site: { id: 'S2', name: '마포 아파트 현장', address: '서울 마포구', contact: '010-0000-2222' },
    driver: { id: 'D2', name: '이영희', phone: '010-3333-4444', truckNumber: '34나 5678' },
    concreteGrade: '30-180-19',
    quantity: 8,
    scheduledTime: '2026-04-13T10:00:00',
    status: 'in_transit',
  },
  {
    id: 'RMC-003',
    orderDate: '2026-04-13T09:00:00',
    plant: { id: 'P2', name: '한강레미콘 구로공장', address: '서울 구로구', contact: '02-9876-5432' },
    site: { id: 'S3', name: '여의도 상업시설 현장', address: '서울 영등포구', contact: '010-0000-3333' },
    driver: { id: 'D3', name: '박민준', phone: '010-5555-6666', truckNumber: '56다 7890' },
    concreteGrade: '24-120-25',
    quantity: 5,
    scheduledTime: '2026-04-13T11:30:00',
    status: 'pending',
  },
];

// ──────────────────────────────────────────────
// 배차 목록 뷰
// ──────────────────────────────────────────────

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: '#f59e0b',
  loading: '#3b82f6',
  in_transit: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        backgroundColor: STATUS_COLOR[status],
      }}
    >
      {DELIVERY_STATUS_LABEL[status]}
    </span>
  );
}

function OrderCard({ order }: { order: DeliveryOrder }) {
  const transitMin = calcTransitMinutes(order);
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 12,
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{order.id}</span>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
        <div>
          <b>배합:</b> {order.concreteGrade} &nbsp;|&nbsp; <b>수량:</b> {order.quantity} m³
        </div>
        <div><b>출발지:</b> {order.plant.name}</div>
        <div><b>현장:</b> {order.site.name}</div>
        <div><b>기사:</b> {order.driver.name} ({order.driver.truckNumber})</div>
        <div><b>예정 출발:</b> {formatDateTime(order.scheduledTime)}</div>
        {order.actualDepartureTime && (
          <div><b>실제 출발:</b> {formatDateTime(order.actualDepartureTime)}</div>
        )}
        {order.actualArrivalTime && (
          <div><b>도착:</b> {formatDateTime(order.actualArrivalTime)}</div>
        )}
        {transitMin !== null && <div><b>소요 시간:</b> {transitMin}분</div>}
      </div>
    </div>
  );
}

const STATUS_FILTERS: Array<{ value: DeliveryStatus | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'loading', label: '상차 중' },
  { value: 'in_transit', label: '운송 중' },
  { value: 'delivered', label: '납품 완료' },
  { value: 'cancelled', label: '취소' },
];

function OrderListView() {
  const [orders] = useState<DeliveryOrder[]>(SAMPLE_ORDERS);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | 'all'>('all');

  const filteredOrders =
    selectedStatus === 'all' ? orders : filterByStatus(orders, selectedStatus);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>
      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { label: '전체', count: orders.length, color: '#6b7280' },
          { label: '운송 중', count: filterByStatus(orders, 'in_transit').length, color: '#8b5cf6' },
          { label: '납품 완료', count: filterByStatus(orders, 'delivered').length, color: '#10b981' },
          { label: '대기', count: filterByStatus(orders, 'pending').length, color: '#f59e0b' },
        ] as const).map((item) => (
          <div
            key={item.label}
            style={{
              flex: '1 1 100px',
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.count}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setSelectedStatus(value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: selectedStatus === value ? '#3b82f6' : '#d1d5db',
              backgroundColor: selectedStatus === value ? '#3b82f6' : '#fff',
              color: selectedStatus === value ? '#fff' : '#374151',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: selectedStatus === value ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 주문 목록 */}
      {filteredOrders.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>
          해당 상태의 배차가 없습니다.
        </p>
      ) : (
        filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// 탭 레이아웃 메인
// ──────────────────────────────────────────────

type Tab = 'list' | 'map';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'list', label: '배차 목록', icon: '📋' },
  { id: 'map', label: '실시간 지도', icon: '🗺️' },
];

export default function RmcMain() {
  const [activeTab, setActiveTab] = useState<Tab>('map');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      {/* 앱 헤더 */}
      <header
        style={{
          background: '#1e3a5f',
          color: '#fff',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          height: 52,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ fontSize: 20 }}>🚛</span>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>
          레미콘 운송 관리 시스템
        </span>

        {/* 탭 버튼 */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 400,
                background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'background .15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 콘텐츠 영역 */}
      <main style={{ flex: 1, minHeight: 0, overflow: activeTab === 'map' ? 'hidden' : 'auto' }}>
        {activeTab === 'list' && <OrderListView />}
        {activeTab === 'map' && (
          <Suspense
            fallback={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
                지도 로딩 중...
              </div>
            }
          >
            <div style={{ height: '100%' }}>
              <RmcMapView />
            </div>
          </Suspense>
        )}
      </main>
    </div>
  );
}
