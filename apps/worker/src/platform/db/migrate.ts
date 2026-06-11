// 부팅 시 실행되는 스키마 정의 — 로컬 프로토타입이므로 단일 파일 idempotent migration

import { getDb } from './client';

const SCHEMA = `
create table if not exists plants (
  id integer primary key autoincrement,
  name text not null,
  address text,
  contact text,
  lat real not null,
  lng real not null,
  created_at text not null
);

create table if not exists sites (
  id integer primary key autoincrement,
  name text not null,
  address text,
  contact text,
  lat real not null,
  lng real not null,
  created_at text not null
);

create table if not exists vehicles (
  id integer primary key autoincrement,
  plant_id integer not null references plants(id),
  truck_number text not null unique,
  driver_name text not null,
  driver_phone text,
  capacity_m3 real not null default 6,
  status text not null default 'available'
    check (status in ('available','on_delivery','maintenance')),
  created_at text not null
);

create table if not exists orders (
  id integer primary key autoincrement,
  order_no text not null unique,
  site_id integer not null references sites(id),
  plant_id integer not null references plants(id),
  concrete_grade text not null,
  total_quantity_m3 real not null check (total_quantity_m3 > 0),
  truck_interval_min integer not null default 15,
  requested_at text not null,
  status text not null default 'requested'
    check (status in ('requested','accepted','in_progress','paused','completed','rejected','cancelled')),
  notes text,
  created_at text not null,
  updated_at text not null
);

create table if not exists deliveries (
  id integer primary key autoincrement,
  order_id integer not null references orders(id),
  vehicle_id integer not null references vehicles(id),
  seq integer not null,
  quantity_m3 real not null check (quantity_m3 > 0),
  status text not null default 'assigned'
    check (status in ('assigned','loading','in_transit','arrived','pouring','returning','returned','cancelled')),
  dispatched_at text,
  arrived_at text,
  pouring_started_at text,
  pouring_ended_at text,
  returned_at text,
  lat real,
  lng real,
  progress real not null default 0,
  created_at text not null,
  updated_at text not null,
  unique (order_id, seq)
);

create index if not exists idx_deliveries_order_id on deliveries(order_id);
create index if not exists idx_deliveries_status on deliveries(status);

create table if not exists order_events (
  id integer primary key autoincrement,
  order_id integer not null references orders(id),
  actor text not null check (actor in ('site','plant','system')),
  type text not null check (type in ('message','status','adjust','dispatch')),
  message text not null,
  created_at text not null
);

create index if not exists idx_order_events_order_id on order_events(order_id);
`;

export function migrate(): void {
  getDb().exec(SCHEMA);
}
