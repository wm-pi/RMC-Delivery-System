# 레미콘 운송 관리 시스템 (RMC Delivery System)

건설현장과 레미콘업체가 **유선 통화로 처리하던 업무를 하나의 웹으로 대체**하는 로컬 프로토타입.

- 현장: 레미콘 주문 등록, 수량(대수) 조절, 도착/타설 현황 집계, 실시간 위치 지도
- 업체: 주문 접수/거절, 차량 배차·출발 처리, 차량 관리, 운송 관제
- 공통: 주문별 메시지/이벤트 타임라인(통화 대체), 네이버 지도 실시간 차량 추적

Woomi 표준 바이브코딩 템플릿(`AGENTS.md`, `.agents/*`) 구조를 따른다.
표준 대비 이탈 사항(로컬 SQLite, Node 로컬 서버 등)은 [`AGENTS.md` → Project Override](./AGENTS.md#10-project-override) 참고.

---

## 실행 방법

요구사항: **Node.js ≥ 22.5** (내장 `node:sqlite` 사용, 권장 24+), **pnpm**

```bash
pnpm install
pnpm dev        # worker(8787) + web(5173) 동시 실행
```

브라우저에서 <http://localhost:5173> 접속 → 시작 화면에서 역할 선택:

- 🏗️ **건설현장으로 시작** — 주문/타설 관리 화면
- 🏭 **레미콘업체로 시작** — 접수/배차 화면

> 현장과 업체를 동시에 보려면 브라우저 창(또는 시크릿 창) 2개로 각각 역할을 선택하면 된다.

개별 실행 / 기타 명령:

```bash
pnpm dev:worker   # 백엔드만 (http://localhost:8787)
pnpm dev:web      # 프론트만 (http://localhost:5173, /api → 8787 프록시)
pnpm typecheck    # 전체 타입체크
pnpm build        # 전체 빌드
```

- 최초 기동 시 데모 데이터(공장 2, 현장 2, 차량 7대, 진행 중 주문 1건)가 시드된다.
- DB 초기화: 서버 중지 후 `apps/worker/data/` 폴더 삭제 → 재기동.
- 차량 위치는 서버 시뮬레이터가 생성한다 (`SIM_MULTIPLIER` 환경변수로 배속 조절, 기본 6배속).

## 데모 시나리오 (5분)

1. **업체 화면**: 신규 요청 주문 → 상세 → `주문 접수` → 차량 선택 후 `배차 추가` → `상차 시작` → `출발`
2. **실시간 지도**: 차량이 공장 → 현장으로 이동하는 것을 확인 (도착 시 자동 전이)
3. **현장 화면**: 주문 상세에서 도착 차량 `타설 시작` → `타설 완료` (차량은 자동 복귀)
4. **현장 화면**: `수량(대수) 조절`로 +1대 요청, 메시지 전송 → 업체 화면 타임라인에서 확인
5. 진행 요약에서 "도착 누적 / 타설 완료 / 이동 중 / 추가 배차 예상" 집계 확인

## 구조

```txt
apps/
  web/        # React Router v7(SPA) + TanStack Query + RHF/Zod + Tailwind + 네이버 지도
    app/routes      # URL 진입점 (현장/업체 화면)
    app/features    # 기능 단위 (주문 생성, 배차, 지도, 타임라인 ...)
    app/entities    # 도메인 모델 단위 API/쿼리 훅
    app/shared      # 공통 API client, UI, 역할 store
  worker/     # Hono + node:sqlite 로컬 백엔드
    src/domains     # plant / site / vehicle / order / delivery (route→service→repository)
    src/platform    # db, env, errors, response, middleware
packages/
  shared/     # 프론트/백엔드 공유 타입·Zod 스키마·상태 상수·geo 유틸
.agents/      # Woomi 표준 에이전트 규칙 + DB/API/도메인 문서
```

상세 문서: [`.agents/data/DOMAIN_MODEL.md`](./.agents/data/DOMAIN_MODEL.md) ·
[`.agents/data/DB_SCHEMA.md`](./.agents/data/DB_SCHEMA.md) ·
[`.agents/data/API_CONTRACT.md`](./.agents/data/API_CONTRACT.md)

## 알려진 한계 (프로토타입)

- 인증 없음 — 역할 선택으로 화면만 분리
- 차량 위치는 직선 보간 시뮬레이션 (실 GPS/경로 탐색 미연동)
- 단가/정산/납품서 미구현
- 네이버 지도는 `apps/web/.env`의 클라이언트 ID 도메인 설정(localhost)에 의존
