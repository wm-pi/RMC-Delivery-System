// 비밀번호 해시 — node:crypto scrypt (외부 의존성 없음). 저장 형식: "salt:hash" (hex)

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

/** 타이밍 공격에 안전한 비교 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, KEY_LEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
