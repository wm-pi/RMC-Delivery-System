import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  index('routes/login.tsx'),

  // 기사용 추적 페이지 (공개, 서명 링크로 진입 — 레이아웃/로그인 불필요)
  route('track/:deliveryId', 'routes/track.tsx'),

  // 현장(건설사) 화면
  ...prefix('site', [
    layout('routes/site-layout.tsx', [
      index('routes/site-dashboard.tsx'),
      route('orders/new', 'routes/site-order-new.tsx'),
      route('orders/:orderId', 'routes/site-order-detail.tsx'),
      route('map', 'routes/site-map.tsx'),
    ]),
  ]),

  // 레미콘업체 화면
  ...prefix('plant', [
    layout('routes/plant-layout.tsx', [
      index('routes/plant-dashboard.tsx'),
      route('orders/:orderId', 'routes/plant-order-detail.tsx'),
      route('vehicles', 'routes/plant-vehicles.tsx'),
      route('map', 'routes/plant-map.tsx'),
    ]),
  ]),
] satisfies RouteConfig;
