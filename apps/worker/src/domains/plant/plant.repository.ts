import type { PlantDto } from '@rmc/shared';
import { getDb, nowIso } from '../../platform/db/client';

interface PlantRow {
  id: number;
  name: string;
  address: string | null;
  contact: string | null;
  lat: number;
  lng: number;
  created_at: string;
}

function toDto(row: PlantRow): PlantDto {
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

export const PlantRepository = {
  findAll(): PlantDto[] {
    const rows = getDb().prepare('select * from plants order by id').all() as unknown as PlantRow[];
    return rows.map(toDto);
  },

  findById(id: number): PlantDto | null {
    const row = getDb().prepare('select * from plants where id = ?').get(id) as unknown as
      | PlantRow
      | undefined;
    return row ? toDto(row) : null;
  },

  create(input: { name: string; address?: string; contact?: string; lat: number; lng: number }): PlantDto {
    const result = getDb()
      .prepare('insert into plants (name, address, contact, lat, lng, created_at) values (?, ?, ?, ?, ?, ?)')
      .run(input.name, input.address ?? null, input.contact ?? null, input.lat, input.lng, nowIso());
    return this.findById(Number(result.lastInsertRowid))!;
  },

  remove(id: number): boolean {
    return getDb().prepare('delete from plants where id = ?').run(id).changes > 0;
  },
};
