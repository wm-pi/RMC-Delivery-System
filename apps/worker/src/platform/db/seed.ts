// 최초 부팅(빈 DB) 시 데모 기준정보 + 진행 중 주문 1건을 시드한다

import { getDb, nowIso } from './client';
import { hashPassword } from '../auth/password';

export function seedIfEmpty(): void {
  const db = getDb();
  const row = db.prepare('select count(*) as cnt from plants').get() as { cnt: number };
  if (row.cnt > 0) return;

  const now = nowIso();
  const insertPlant = db.prepare(
    'insert into plants (name, address, contact, lat, lng, created_at) values (?, ?, ?, ?, ?, ?)',
  );
  const p1 = Number(
    insertPlant.run('덕원레미콘 원주공장', '강원 원주시 판부면', '033-741-1234', 37.3612, 127.9088, now)
      .lastInsertRowid,
  );
  const p2 = Number(
    insertPlant.run('한라레미콘 원주2공장', '강원 원주시 우산동', '033-742-5678', 37.3725, 127.9301, now)
      .lastInsertRowid,
  );

  const insertSite = db.prepare(
    'insert into sites (name, address, contact, lat, lng, created_at) values (?, ?, ?, ?, ?, ?)',
  );
  const s1 = Number(
    insertSite.run('원주역 우미린 더 스텔라', '강원 원주시 무실동 2066', '010-1234-0001', 37.3398, 127.9451, now)
      .lastInsertRowid,
  );
  Number(
    insertSite.run('원주 기업도시 우미린 현장', '강원 원주시 지정면', '010-1234-0002', 37.3863, 127.8772, now)
      .lastInsertRowid,
  );

  const insertVehicle = db.prepare(
    'insert into vehicles (plant_id, truck_number, driver_name, driver_phone, capacity_m3, status, created_at) values (?, ?, ?, ?, ?, ?, ?)',
  );
  const v1 = Number(insertVehicle.run(p1, '12가 3456', '김철수', '010-1111-2222', 6, 'available', now).lastInsertRowid);
  const v2 = Number(insertVehicle.run(p1, '34나 5678', '이영희', '010-3333-4444', 6, 'available', now).lastInsertRowid);
  insertVehicle.run(p1, '56다 7890', '박민준', '010-5555-6666', 6, 'available', now);
  insertVehicle.run(p1, '78라 1234', '정수현', '010-7777-8888', 6, 'available', now);
  insertVehicle.run(p1, '90마 5678', '최영호', '010-9999-0000', 7, 'available', now);
  insertVehicle.run(p2, '11바 2233', '한지민', '010-2222-3333', 6, 'available', now);
  insertVehicle.run(p2, '44사 5566', '오세훈', '010-4444-5555', 6, 'available', now);

  // ── 데모 주문 1: 진행 중 (1회전 복귀 완료, 2회전 운송 중, 3회전 배차 완료) ──
  const today = now.slice(0, 10);
  const insertOrder = db.prepare(
    `insert into orders
       (order_no, site_id, plant_id, concrete_grade, total_quantity_m3, truck_interval_min,
        requested_at, status, notes, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const o1 = Number(
    insertOrder.run(
      `ORD-${today.replaceAll('-', '')}-001`, s1, p1, '25-24-150', 36, 15,
      `${today}T09:00:00.000Z`, 'in_progress', '지하 1층 바닥 타설', now, now,
    ).lastInsertRowid,
  );

  const insertDelivery = db.prepare(
    `insert into deliveries
       (order_id, vehicle_id, seq, quantity_m3, status, dispatched_at, arrived_at,
        pouring_started_at, pouring_ended_at, returned_at, lat, lng, progress, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const minAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  // 1회전: 복귀 완료
  insertDelivery.run(
    o1, v1, 1, 6, 'returned', minAgo(40), minAgo(30), minAgo(28), minAgo(15), minAgo(5),
    37.3612, 127.9088, 1, minAgo(45), minAgo(5),
  );
  // 2회전: 방금 출발해 운송 중 (시뮬레이터가 이어서 이동)
  insertDelivery.run(
    o1, v2, 2, 6, 'in_transit', minAgo(1), null, null, null, null,
    37.3612, 127.9088, 0, minAgo(3), now,
  );
  db.prepare('update vehicles set status = ? where id = ?').run('on_delivery', v2);

  const insertEvent = db.prepare(
    'insert into order_events (order_id, actor, type, message, created_at) values (?, ?, ?, ?, ?)',
  );
  insertEvent.run(o1, 'site', 'status', '주문이 등록되었습니다 (25-24-150, 36m³)', minAgo(120));
  insertEvent.run(o1, 'plant', 'status', '주문을 접수했습니다', minAgo(110));
  insertEvent.run(o1, 'plant', 'dispatch', '1호차 12가 3456 출발 (6m³)', minAgo(40));
  insertEvent.run(o1, 'system', 'status', '1호차 12가 3456 현장 도착', minAgo(30));
  insertEvent.run(o1, 'site', 'status', '1호차 타설 완료', minAgo(15));
  insertEvent.run(o1, 'plant', 'dispatch', '2호차 34나 5678 출발 (6m³)', minAgo(1));

  // ── 데모 주문 2: 접수 대기 중인 신규 요청 ──
  insertOrder.run(
    `ORD-${today.replaceAll('-', '')}-002`, s1, p2, '30-21-120', 24, 20,
    `${today}T13:00:00.000Z`, 'requested', '옹벽 타설, 펌프카 대기 중', now, now,
  );

  console.log('[seed] demo data inserted');
}

/**
 * 데모 로그인 계정 시드 — users가 비어 있을 때만.
 * 기존(이미 기준정보가 시드된) DB에도 계정을 추가할 수 있도록 별도 idempotent 함수로 둔다.
 */
export function seedUsersIfEmpty(): void {
  const db = getDb();
  const { cnt } = db.prepare('select count(*) as cnt from users').get() as { cnt: number };
  if (cnt > 0) return;

  const site = db.prepare('select id from sites order by id limit 1').get() as
    | { id: number }
    | undefined;
  const plants = db.prepare('select id from plants order by id').all() as { id: number }[];
  if (!site || plants.length === 0) return; // 기준정보가 아직 없으면 보류

  const now = nowIso();
  const insert = db.prepare(
    `insert into users (username, password_hash, name, role, site_id, plant_id, created_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
  );
  insert.run('site1', hashPassword('1234'), '현장 담당자', 'site', site.id, null, now);
  insert.run('plant1', hashPassword('1234'), '덕원레미콘 배차', 'plant', null, plants[0].id, now);
  if (plants[1]) {
    insert.run('plant2', hashPassword('1234'), '한라레미콘 배차', 'plant', null, plants[1].id, now);
  }
  console.log('[seed] demo users inserted (site1 / plant1 / plant2, 비밀번호 1234)');
}
