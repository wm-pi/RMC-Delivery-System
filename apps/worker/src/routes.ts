import { Hono } from 'hono';
import { authMiddleware } from './platform/auth/auth.middleware';
import { deliveryRoute } from './domains/delivery/delivery.route';
import { orderRoute } from './domains/order/order.route';
import { plantRoute } from './domains/plant/plant.route';
import { siteRoute } from './domains/site/site.route';
import { vehicleRoute } from './domains/vehicle/vehicle.route';

export const apiRoutes = new Hono();

// 이 하위의 모든 도메인 라우트는 인증 필요 (/api/auth는 app.ts에서 별도 공개 마운트)
apiRoutes.use('*', authMiddleware);

apiRoutes.route('/plants', plantRoute);
apiRoutes.route('/sites', siteRoute);
apiRoutes.route('/vehicles', vehicleRoute);
apiRoutes.route('/orders', orderRoute);
apiRoutes.route('/deliveries', deliveryRoute);
