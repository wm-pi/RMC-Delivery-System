import { Hono } from 'hono';
import { deliveryRoute } from './domains/delivery/delivery.route';
import { orderRoute } from './domains/order/order.route';
import { plantRoute } from './domains/plant/plant.route';
import { siteRoute } from './domains/site/site.route';
import { vehicleRoute } from './domains/vehicle/vehicle.route';

export const apiRoutes = new Hono();

apiRoutes.route('/plants', plantRoute);
apiRoutes.route('/sites', siteRoute);
apiRoutes.route('/vehicles', vehicleRoute);
apiRoutes.route('/orders', orderRoute);
apiRoutes.route('/deliveries', deliveryRoute);
