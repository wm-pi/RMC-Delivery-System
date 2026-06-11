# AGENTS.md

Woomi 표준 웹 서비스 프로젝트에서 모든 AI 에이전트가 먼저 읽는 **공통 진입 규칙**이다.

이 문서는 길게 구현 방법을 설명하지 않는다. 작업 유형을 분류하고, 필요한 `.agents/*` 문서로 라우팅하며, 보안/배포/데이터 손실 같은 절대 금지 규칙만 직접 가진다.

- 표준 버전: `2.0-draft`
- 최종 수정일: 2026-05-28
- 기준 레퍼런스: CTPA Hono Worker layered architecture
- 1차 원칙: 실제 코드와 가장 가까운 프로젝트 문서가 우선한다. 단, 보안/배포/데이터 손실 금지 규칙은 완화할 수 없다.

---

## 0. Project Overview

프로젝트 시작 시 비개발자도 답할 수 있는 항목만 먼저 채운다.

```txt
Project name: RMC Delivery System (레미콘 운송 관리)
What it does: 건설현장과 레미콘업체가 유선 통화로 하던 주문·대수 조절·배차·도착/타설 확인·위치 추적을 하나의 웹으로 처리
Main users: 건설현장 담당자(site), 레미콘업체 배차 담당(plant)
Core workflows: 주문 등록 → 접수 → 차량 배차/출발 → 실시간 위치 추적 → 도착 → 타설 시작/완료 → 복귀 → 주문 완료
Important data: 주문(orders), 배차 회전(deliveries), 차량(vehicles), 공장/현장 기준정보, 주문 이벤트 타임라인
Admin roles: 없음 (프로토타입 — 시작 화면에서 역할 선택)
External services: 네이버 클라우드 플랫폼 Maps (지도 표시)
Launch target: 로컬 프로토타입 (배포 없음)
Do not touch: apps/web/.env의 네이버 지도 클라이언트 ID
```

기술 항목은 에이전트가 실제 코드와 설정을 확인한 뒤 관련 `.agents/*` 문서 또는 `Project Override`에 반영한다.

---

## 1. How To Read

작은 작업에서 모든 문서를 읽지 않는다.

기본 순서:

1. `AGENTS.md`
2. 아래 `Task Routing` 표에서 작업 유형 확인
3. 필요한 `.agents/*` 문서만 확인
4. 실제 코드와 설정 파일 확인
5. 해당 도구의 command/prompt/skill이 있으면 확인

`WORKFLOW.md`는 모든 작업의 상시 필독 문서가 아니다. 큰 기능, PR/push, 리뷰, 배포, DB/API 계약 변경처럼 절차가 중요한 작업에서 읽는다.

Windows PowerShell에서 한국어 문서를 확인할 때는 인코딩 깨짐을 피하기 위해 아래처럼 읽는다.

```powershell
Get-Content -Raw -Encoding UTF8 AGENTS.md
Get-Content -Raw -Encoding UTF8 .agents\WORKFLOW.md
```

---

## 2. Task Routing

| 작업 유형 | 먼저 읽을 문서 | 필요할 때 추가 확인 |
|---|---|---|
| 작은 수정/문구/스타일/명백한 버그 | `AGENTS.md`만 확인한 뒤 실제 파일 확인 | 작업 범위가 넓어지면 해당 영역 문서 |
| 새 화면/UI | `.agents/ui/DESIGN.md`, `.agents/ui/UX_RULES.md`, `.agents/ui/COMPONENTS.md` | `.agents/code/CODE_STYLE.md`, `.agents/ARCHITECTURE.md` |
| 프론트엔드 기능 | `.agents/ARCHITECTURE.md`, `.agents/code/PROJECT_STRUCTURE.md`, `.agents/code/CODE_STYLE.md` | `.agents/code/API.md`, `.agents/WORKFLOW.md` |
| API/백엔드 | `.agents/code/API.md`, `.agents/code/ERROR_HANDLING.md`, `.agents/ARCHITECTURE.md` | `.agents/data/API_CONTRACT.md`, 기존 route/service/repository |
| DB schema/RLS/index | `.agents/data/DB_SCHEMA.md`, `.agents/data/MIGRATION.md` | `.agents/data/DOMAIN_MODEL.md`, `.agents/code/API.md` |
| migration/backfill | `.agents/data/MIGRATION.md`, `.agents/data/DB_SCHEMA.md` | `.agents/DEPLOYMENT.md`, `.agents/WORKFLOW.md` |
| 배포/secret/binding | `.agents/DEPLOYMENT.md` | `wrangler.jsonc`, `.github/workflows/*`, `.agents/WORKFLOW.md` |
| MCP/외부 도구 연동 | `.agents/TOOLING.md` | `CLAUDE.md`, `CODEX.md`, `.github/*`, 도구별 설정 파일 |
| PR/push/commit | `.agents/WORKFLOW.md` | `CLAUDE.md`, `CODEX.md`, tool command/prompt |
| 리뷰 | `.agents/WORKFLOW.md`, 작업 영역별 문서 | diff, tests, 관련 code/data/ui 문서 |
| 스택 변경 | `.agents/STACK.md` | `.agents/ARCHITECTURE.md`, README |
| 에이전트 규칙 변경 | `AGENTS.md`, `.agents/WORKFLOW.md` | `CLAUDE.md`, `CODEX.md`, `.github/*` |

---

## 3. Standard Document Map

| 파일 | 역할 |
|---|---|
| `.agents/ARCHITECTURE.md` | 아키텍처, 레이어, 런타임 경계 |
| `.agents/STACK.md` | 표준 기술스택 |
| `.agents/WORKFLOW.md` | 작업 순서, PR/push, 리뷰, 검증 흐름 |
| `.agents/DEPLOYMENT.md` | Cloudflare/Wrangler/GitHub Actions 배포 기준 |
| `.agents/TOOLING.md` | MCP, 브라우저 자동화, 외부 도구 사용 기준 |
| `.agents/code/API.md` | route/service/repository/API client 기준 |
| `.agents/code/PROJECT_STRUCTURE.md` | 폴더 구조와 import boundary |
| `.agents/code/CODE_STYLE.md` | TypeScript, 네이밍, 주석, 코드 스타일 |
| `.agents/code/ERROR_HANDLING.md` | ErrorCode, response, logging 기준 |
| `.agents/code/TESTING.md` | 테스트 범위와 검증 명령 |
| `.agents/data/DOMAIN_MODEL.md` | 진행 중 작성하는 도메인 모델 |
| `.agents/data/DB_SCHEMA.md` | DB schema, RLS, index 가드레일 |
| `.agents/data/API_CONTRACT.md` | 진행 중 작성하는 API 계약 |
| `.agents/data/MIGRATION.md` | Supabase PostgreSQL migration 전략 |
| `.agents/ui/DESIGN.md` | 디자인 원칙 |
| `.agents/ui/UX_RULES.md` | loading/empty/error/permission, form, navigation, shortcut, feedback UX |
| `.agents/ui/COMPONENTS.md` | 진행 중 작성하는 공통 컴포넌트 목록 |
| `.agents/examples/GOOD_EXAMPLES.md` | 진행 중 축적하는 좋은 패턴 |
| `.agents/examples/BAD_EXAMPLES.md` | 진행 중 축적하는 금지 패턴 |

표준 제공 문서는 고정된 절대 규칙이 아니다. 새 프로젝트 또는 기존 프로젝트에 적용할 때는 실제 코드, 프레임워크, 배포 방식, API 계약, 디자인 시스템을 확인한 뒤 프로젝트 현실에 맞게 수정한다.

---

## 4. Directory Baseline

권장 루트 구조:

```txt
.
├── apps/                 # 실행/배포 단위
├── packages/             # 공유 코드
├── .agents/              # 에이전트 공통 규칙과 컨텍스트
├── .claude/              # Claude Code commands/skills/settings
├── .codex/               # Codex prompts/skills/hooks
├── .github/              # Copilot prompts/instructions, CI
├── .githooks/            # 로컬 git hook
├── docs/                 # 사람용 문서
├── scripts/              # 반복 자동화
├── supabase/             # migration, seed, local Supabase 설정
├── AGENTS.md
├── CLAUDE.md
├── CODEX.md
└── README.md
```

세부 구조와 import boundary는 `.agents/ARCHITECTURE.md`와 `.agents/code/PROJECT_STRUCTURE.md`를 따른다.

---

## 5. Tool-Specific Files

| 도구 | 보충 문서 | 반복 작업 | 복잡 작업 |
|---|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/commands/` | `.claude/skills/` |
| Codex | `CODEX.md` | `.codex/prompts/` | `.codex/skills/` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/prompts/` | `.github/instructions/` |

도구별 문서에는 공통 규칙을 숨기지 않는다. 공통 규칙은 `AGENTS.md` 또는 `.agents/*`에 반영한다.

---

## 6. Non-Negotiable Rules

절대 금지:

- API key, service role key, JWT secret 하드코딩
- 실제 값이 들어간 `.env` 커밋
- 프론트엔드에 서버 secret 노출
- 인증 없이 private storage URL 발급
- 사용자 승인 없는 `git commit`, `git push`, `git pull`
- 사용자 승인 없는 production 배포
- 사용자 승인 없는 운영 DB 변경
- 사용자 승인 없는 destructive migration
- `git reset --hard` 또는 사용자 변경사항 되돌리기
- 템플릿 규칙을 실제 프로젝트 코드보다 우선해 기계적으로 강제

필수:

- secret은 환경변수 또는 platform secret으로 관리한다.
- MCP와 외부 도구는 read-only 조회와 write/delete/deploy 작업을 구분해서 사용한다.
- 파일 업로드는 확장자, MIME, 크기, 권한을 검증한다.
- DB/API/배포 변경은 관련 `.agents/*` 문서를 함께 갱신한다.
- 반복되는 UX 패턴이나 공통 화면 정책이 생기면 `.agents/ui/UX_RULES.md` 또는 프로젝트별 UX 문서에 기록한다.
- 검증하지 못한 항목은 최종 보고에 명시한다.

---

## 7. Quality Gates

가능한 범위에서 아래를 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Cloudflare Worker 배포 전에는 프로젝트별 dry-run 명령을 우선한다.

```bash
pnpm --filter <worker-package> run deploy:dry
```

프로젝트에 없는 명령은 억지로 만들지 않는다. 실행하지 못한 검증은 이유를 보고한다.

---

## 8. Conflict Resolution Priority

문서 간 충돌이 발생하면 아래 순서를 따른다.

1. 실제 코드 및 설정 파일
2. 가장 가까운 하위 `AGENTS.md`
3. 프로젝트별 `Project Override`
4. 루트 `AGENTS.md`
5. 작업 유형별 `.agents/*` 문서
6. 도구별 `CLAUDE.md`, `CODEX.md`, `.github/*`
7. 예시 문서

보안, 배포, 데이터 손실 관련 공통 금지 규칙은 프로젝트 문서로 완화할 수 없다.

---

## 9. Output Requirements

작업 완료 보고에는 아래를 포함한다.

```txt
Changed:
Files:
Validation:
Skipped validation:
Risk:
```

리뷰 요청을 받으면 구현 설명보다 findings를 먼저 쓴다. 문제가 없으면 "발견한 문제 없음"이라고 명확히 말한다.

---

## 10. Project Override

각 프로젝트는 이 아래에 프로젝트 전용 규칙을 추가한다.

프로젝트별 규칙은 공통 표준보다 구체적일 때 우선한다. 단, 보안, 배포, 데이터 손실 관련 금지 규칙은 프로젝트 규칙으로 완화할 수 없다.

### RMC Delivery System 전용 규칙 (2026-06-11)

이 프로젝트는 **로컬 전용 프로토타입**으로, 표준 스택에서 아래 항목을 의도적으로 이탈한다.
배포/실DB 연결 단계에서 표준으로 복귀한다.

| 표준 | 이 프로젝트 | 사유 |
|---|---|---|
| Supabase PostgreSQL | 로컬 SQLite (`node:sqlite`, Node 24 내장) | DB 미연결 환경. 네이티브 모듈 없이 동작 |
| Cloudflare Workers 배포 | `@hono/node-server` 로컬 실행 | 배포 없음. Hono 코드 구조는 표준 그대로 유지 |
| React Router v7 SSR | Framework Mode + `ssr: false` (SPA) | 로컬 정적 서빙. 네이버 지도는 클라이언트 전용 |
| 인증/RLS | 없음 — 시작 화면에서 역할(현장/업체) 선택 | 프로토타입 범위 |
| GPS 단말 연동 | 서버 위치 시뮬레이터 (`delivery.simulator.ts`) | 실차량 연동 전 데모용. `SIM_MULTIPLIER` 배속 |

추가 규칙:

- 상태값·전이 규칙·DTO·Zod 스키마의 단일 소스는 `packages/shared`다. 프론트/백엔드에 중복 정의하지 않는다.
- 도메인 간 데이터 접근은 다른 도메인의 public service 메서드를 통한다
  (예: delivery → `OrderService.addEvent/markInProgress/assertDispatchable`).
- 주문 진행 집계(stats)는 `order.repository.aggregateDeliveries`(read-only 집계 쿼리, DB view 대체)로만 deliveries를 읽는다.
- 실행: `pnpm dev` (worker 8787 + web 5173, `/api` 프록시). DB 초기화는 `apps/worker/data/` 삭제 후 재기동.
