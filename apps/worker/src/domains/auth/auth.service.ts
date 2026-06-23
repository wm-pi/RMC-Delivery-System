import type { AuthUserDto, LoginInput, LoginResponseDto } from '@rmc/shared';
import { AppError } from '../../platform/errors/app-error';
import { verifyPassword } from '../../platform/auth/password';
import { signToken } from '../../platform/auth/jwt';
import { AuthRepository } from './auth.repository';

export const AuthService = {
  async login(input: LoginInput): Promise<LoginResponseDto> {
    const row = AuthRepository.findByUsername(input.username);
    // 사용자 부재와 비밀번호 불일치를 같은 메시지로 처리 (사용자 열거 방지)
    if (!row || !verifyPassword(input.password, row.password_hash)) {
      throw AppError.unauthorized('아이디 또는 비밀번호가 올바르지 않습니다');
    }
    const user: AuthUserDto = {
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      siteId: row.site_id,
      plantId: row.plant_id,
      orgName: row.org_name,
    };
    return { token: await signToken(user), user };
  },
};
