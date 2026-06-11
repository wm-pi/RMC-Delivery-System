import type { SiteDto } from '@rmc/shared';
import { getDb, nowIso } from '../../platform/db/client';

interface SiteRow {
  id: number;
  name: string;
  address: string | null;
  contact: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

function toDto(row: SiteRow): SiteDto {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    contact: row.contact,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
  };
}

export const SiteRepository = {
  findAll(): SiteDto[] {
    const rows = getDb().prepare('select * from sites order by id').all() as unknown as SiteRow[];
    return rows.map(toDto);
  },

  findById(id: number): SiteDto | null {
    const row = getDb().prepare('select * from sites where id = ?').get(id) as unknown as
      | SiteRow
      | undefined;
    return row ? toDto(row) : null;
  },

  create(input: { name: string; address?: string; contact?: string; lat: number; lng: number }): SiteDto {
    const result = getDb()
      .prepare('insert into sites (name, address, contact, lat, lng, created_at) values (?, ?, ?, ?, ?, ?)')
      .run(input.name, input.address ?? null, input.contact ?? null, input.lat, input.lng, nowIso());
    return this.findById(Number(result.lastInsertRowid))!;
  },
};
