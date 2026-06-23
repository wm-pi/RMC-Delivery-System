// 역할/소유권 가드 — service 레이어에서 테넌트 격리를 강제한다

import type { AuthUserDto, UserRole } from '@rmc/shared';
import { AppError } from '../errors/app-error';

const ROLE_LABEL: Record<UserRole, string> = { site: '현장', plant: '레미콘업체' };

export function assertRole(user: AuthUserDto, role: UserRole, action = '이 작업을 수행'): void {
  if (user.role !== role) {
    throw AppError.forbidden(`${ROLE_LABEL[role]} 계정만 ${action}할 수 있습니다`);
  }
}

/** 주문 소유권 검증 — 현장은 자기 현장 주문만, 업체는 자기 공장 주문만 */
export function assertOrderOwnership(
  user: AuthUserDto,
  order: { siteId: number; plantId: number },
): void {
  const owns =
    user.role === 'site' ? order.siteId === user.siteId : order.plantId === user.plantId;
  if (!owns) {
    throw AppError.forbidden('이 주문에 접근할 권한이 없습니다');
  }
}
