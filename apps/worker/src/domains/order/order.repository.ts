import type {
  OrderDto,
  OrderEventActor,
  OrderEventDto,
  OrderEventType,
  OrderStatus,
} from '@rmc/shared';
import { getDb, nowIso } from '../../platform/db/client';

interface OrderRow {
  id: number;
  order_no: string;
  site_id: number;
  site_name: string;
  plant_id: number;
  plant_name: string;
  concrete_grade: string;
  total_quantity_m3: number;
  truck_interval_min: number;
  requested_at: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderEventRow {
  id: number;
  order_id: number;
  actor: OrderEventActor;
  type: OrderEventType;
  message: string;
  created_at: string;
}

const ORDER_SELECT = `
  select o.*, s.name as site_name, p.name as plant_name
    from orders o
    join sites s on s.id = o.site_id
    join plants p on p.id = o.plant_id
`;

function toDto(row: OrderRow): OrderDto {
  return {
    id: row.id,
    orderNo: row.order_no,
    siteId: row.site_id,
    siteName: row.site_name,
    plantId: row.plant_id,
    plantName: row.plant_name,
    concreteGrade: row.concrete_grade,
    totalQuantityM3: row.total_quantity_m3,
    truckIntervalMin: row.truck_interval_min,
    requestedAt: row.requested_at,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEventDto(row: OrderEventRow): OrderEventDto {
  return {
    id: row.id,
    orderId: row.order_id,
    actor: row.actor,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
  };
}

export const OrderRepository = {
  findAll(filter: { siteId?: number; plantId?: number; status?: OrderStatus[] }): OrderDto[] {
    const conditions: string[] = [];
    const params: (number | string)[] = [];
    if (filter.siteId) {
      conditions.push('o.site_id = ?');
      params.push(filter.siteId);
    }
    if (filter.plantId) {
      conditions.push('o.plant_id = ?');
      params.push(filter.plantId);
    }
    if (filter.status && filter.status.length > 0) {
      conditions.push(`o.status in (${filter.status.map(() => '?').join(',')})`);
      params.push(...filter.status);
    }
    const where = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
    const rows = getDb()
      .prepare(`${ORDER_SELECT} ${where} order by o.id desc`)
      .all(...params) as unknown as OrderRow[];
    return rows.map(toDto);
  },

  findById(id: number): OrderDto | null {
    const row = getDb().prepare(`${ORDER_SELECT} where o.id = ?`).get(id) as unknown as
      | OrderRow
      | undefined;
    return row ? toDto(row) : null;
  },

  countToday(): number {
    const today = nowIso().slice(0, 10);
    const row = getDb()
      .prepare("select count(*) as cnt from orders where date(created_at) = ?")
      .get(today) as { cnt: number };
    return row.cnt;
  },

  create(input: {
    orderNo: string;
    siteId: number;
    plantId: number;
    concreteGrade: string;
    totalQuantityM3: number;
    truckIntervalMin: number;
    requestedAt: string;
    notes?: string;
  }): OrderDto {
    const now = nowIso();
    const result = getDb()
      .prepare(
        `insert into orders
           (order_no, site_id, plant_id, concrete_grade, total_quantity_m3, truck_interval_min,
            requested_at, status, notes, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)`,
      )
      .run(
        input.orderNo,
        input.siteId,
        input.plantId,
        input.concreteGrade,
        input.totalQuantityM3,
        input.truckIntervalMin,
        input.requestedAt,
        input.notes ?? null,
        now,
        now,
      );
    return this.findById(Number(result.lastInsertRowid))!;
  },

  updateStatus(id: number, status: OrderStatus): void {
    getDb()
      .prepare('update orders set status = ?, updated_at = ? where id = ?')
      .run(status, nowIso(), id);
  },

  updateTotalQuantity(id: number, totalQuantityM3: number): void {
    getDb()
      .prepare('update orders set total_quantity_m3 = ?, updated_at = ? where id = ?')
      .run(totalQuantityM3, nowIso(), id);
  },

  /**
   * 주문 진행 집계용 배차 상태 합계.
   * delivery 도메인 repository를 직접 호출하지 않기 위한 read-only 집계 쿼리 (DB view 대체).
   */
  aggregateDeliveries(orderId: number): { status: string; qty: number; cnt: number }[] {
    return getDb()
      .prepare(
        `select status, sum(quantity_m3) as qty, count(*) as cnt
           from deliveries
          where order_id = ?
          group by status`,
      )
      .all(orderId) as { status: string; qty: number; cnt: number }[];
  },

  findEvents(orderId: number): OrderEventDto[] {
    const rows = getDb()
      .prepare('select * from order_events where order_id = ? order by id desc')
      .all(orderId) as unknown as OrderEventRow[];
    return rows.map(toEventDto);
  },

  addEvent(orderId: number, actor: OrderEventActor, type: OrderEventType, message: string): OrderEventDto {
    const result = getDb()
      .prepare(
        'insert into order_events (order_id, actor, type, message, created_at) values (?, ?, ?, ?, ?)',
      )
      .run(orderId, actor, type, message, nowIso());
    const row = getDb()
      .prepare('select * from order_events where id = ?')
      .get(Number(result.lastInsertRowid)) as unknown as OrderEventRow;
    return toEventDto(row);
  },
};
