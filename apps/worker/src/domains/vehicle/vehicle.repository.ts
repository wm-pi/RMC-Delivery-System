import type { VehicleDto, VehicleStatus } from '@rmc/shared';
import { getDb, nowIso } from '../../platform/db/client';

interface VehicleRow {
  id: number;
  plant_id: number;
  truck_number: string;
  driver_name: string;
  driver_phone: string | null;
  capacity_m3: number;
  status: VehicleStatus;
  created_at: string;
}

function toDto(row: VehicleRow): VehicleDto {
  return {
    id: row.id,
    plantId: row.plant_id,
    truckNumber: row.truck_number,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    capacityM3: row.capacity_m3,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const VehicleRepository = {
  findAll(plantId?: number): VehicleDto[] {
    const db = getDb();
    const rows = (
      plantId
        ? db.prepare('select * from vehicles where plant_id = ? order by id').all(plantId)
        : db.prepare('select * from vehicles order by id').all()
    ) as unknown as VehicleRow[];
    return rows.map(toDto);
  },

  findById(id: number): VehicleDto | null {
    const row = getDb().prepare('select * from vehicles where id = ?').get(id) as unknown as
      | VehicleRow
      | undefined;
    return row ? toDto(row) : null;
  },

  findByTruckNumber(truckNumber: string): VehicleDto | null {
    const row = getDb()
      .prepare('select * from vehicles where truck_number = ?')
      .get(truckNumber) as unknown as VehicleRow | undefined;
    return row ? toDto(row) : null;
  },

  create(input: {
    plantId: number;
    truckNumber: string;
    driverName: string;
    driverPhone?: string;
    capacityM3: number;
  }): VehicleDto {
    const result = getDb()
      .prepare(
        `insert into vehicles (plant_id, truck_number, driver_name, driver_phone, capacity_m3, status, created_at)
         values (?, ?, ?, ?, ?, 'available', ?)`,
      )
      .run(
        input.plantId,
        input.truckNumber,
        input.driverName,
        input.driverPhone ?? null,
        input.capacityM3,
        nowIso(),
      );
    return this.findById(Number(result.lastInsertRowid))!;
  },

  updateStatus(id: number, status: VehicleStatus): void {
    getDb().prepare('update vehicles set status = ? where id = ?').run(status, id);
  },

  update(
    id: number,
    input: Partial<{
      plantId: number;
      truckNumber: string;
      driverName: string;
      driverPhone: string;
      capacityM3: number;
      status: VehicleStatus;
    }>,
  ): VehicleDto | null {
    const current = this.findById(id);
    if (!current) return null;
    getDb()
      .prepare(
        `update vehicles
            set plant_id = ?, truck_number = ?, driver_name = ?, driver_phone = ?, capacity_m3 = ?, status = ?
          where id = ?`,
      )
      .run(
        input.plantId ?? current.plantId,
        input.truckNumber ?? current.truckNumber,
        input.driverName ?? current.driverName,
        input.driverPhone ?? current.driverPhone,
        input.capacityM3 ?? current.capacityM3,
        input.status ?? current.status,
        id,
      );
    return this.findById(id);
  },

  remove(id: number): boolean {
    return getDb().prepare('delete from vehicles where id = ?').run(id).changes > 0;
  },
};
