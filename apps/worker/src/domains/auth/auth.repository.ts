import type { UserRole } from '@rmc/shared';
import { getDb } from '../../platform/db/client';

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  site_id: number | null;
  plant_id: number | null;
  org_name: string;
}

const USER_SELECT = `
  select u.id, u.username, u.password_hash, u.name, u.role, u.site_id, u.plant_id,
         coalesce(s.name, p.name) as org_name
    from users u
    left join sites s on s.id = u.site_id
    left join plants p on p.id = u.plant_id
`;

export const AuthRepository = {
  findByUsername(username: string): UserRow | null {
    const row = getDb()
      .prepare(`${USER_SELECT} where u.username = ?`)
      .get(username) as UserRow | undefined;
    return row ?? null;
  },
};
