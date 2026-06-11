// 로컬 SQLite 클라이언트 (node:sqlite) — Supabase 미연결 환경의 로컬 대체
// 표준 스택(Supabase PostgreSQL) 이탈 사유는 .agents/STACK.md Project Override 참고

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '../env/env';

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const path = resolve(process.cwd(), env.dbPath);
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

/** 현재 시각 ISO 문자열 — DB 저장 표준 포맷 */
export function nowIso(): string {
  return new Date().toISOString();
}
