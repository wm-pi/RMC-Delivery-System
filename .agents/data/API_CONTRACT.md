# API_CONTRACT.md

이 문서는 프로젝트의 API 요청/응답 계약을 진행 중에 정리하는 문서다.

API가 실제로 생기기 전까지는 비워둘 수 있다. endpoint, request, response, error, permission이 바뀌면 같은 작업에서 갱신한다.

---

## 작성 시점

- 새 API endpoint가 추가될 때
- request/response 구조가 바뀔 때
- error code 또는 사용자 메시지가 바뀔 때
- 인증/권한 조건이 바뀔 때
- 프론트엔드 API client, TanStack Query hook, form schema에 영향이 있을 때

---

## 작성할 내용

```txt
Endpoint:
Method:
Purpose:
Auth required:
Allowed roles:
Request params:
Request body:
Response:
Error codes:
Related service:
Related repository:
Related DB tables/RPC:
Related frontend usage:
Notes:
```

---

## API Notes

> 공통: base `/api`. **`/api/auth/login`을 제외한 모든 엔드포인트는 `Authorization: Bearer <JWT>` 필수.**
> 토큰 없음/만료 → 401, 역할·소유권 위반 → 403. 성공 응답은 body 그대로,
> 에러 응답은 `{ message, code, detail? }` (VALIDATION_ERROR 400 / UNAUTHORIZED 401 / FORBIDDEN 403 / NOT_FOUND 404 / CONFLICT·INVALID_STATE 409 / INTERNAL_ERROR 500).
> 요청/응답 타입과 Zod 스키마의 단일 소스는 `packages/shared`다.

### 인증 (Auth)

| Method | Endpoint | Purpose | 비고 |
|---|---|---|---|
| POST | /auth/login | 로그인 → `{ token, user }` | 공개. loginSchema(username/password) |
| GET | /auth/me | 현재 사용자 (토큰 검증/복원) | Bearer 필요 |

테넌트 격리: 현장(site) 계정은 자기 현장 주문만, 업체(plant) 계정은 자기 공장 주문/차량만 조회·조작 가능(서버 강제).
주문 생성 시 siteId, 차량 등록 시 plantId는 토큰에서 강제되며 클라이언트 값은 무시한다. 데모 계정: site1 / plant1 / plant2 (비밀번호 1234).

### 기준정보

| Method | Endpoint | Purpose | Body/Query |
|---|---|---|---|
| GET | /plants | 공장 목록 | - |
| POST | /plants | 공장 등록 | createPlantSchema |
| GET | /sites | 현장 목록 | - |
| POST | /sites | 현장 등록 | createSiteSchema |
| GET | /vehicles | 차량 목록 | ?plantId= |
| POST | /vehicles | 차량 등록 | createVehicleSchema |
| PUT | /vehicles/:id | 차량 수정/정비 전환 | updateVehicleSchema |
| DELETE | /vehicles/:id | 차량 삭제 (운행 중이면 409) | - |

### 주문 (Order)

| Method | Endpoint | Purpose | 비고 |
|---|---|---|---|
| GET | /orders | 주문 목록 + 진행 집계(stats) | ?siteId=&plantId=&status=&date= |
| GET | /orders/:id | 주문 상세 (deliveries + events + stats) | OrderDetailDto |
| POST | /orders | 주문 등록 (현장) | createOrderSchema |
| POST | /orders/:id/accept | 접수 (업체) | requested에서만 |
| POST | /orders/:id/reject | 거절 (업체) | { reason? } |
| POST | /orders/:id/cancel | 취소 (현장) | 진행 중 배차 있으면 409 |
| POST | /orders/:id/pause | 배차 일시 중단 (현장) | accepted/in_progress |
| POST | /orders/:id/resume | 배차 재개 (현장) | paused |
| POST | /orders/:id/complete | 타설 완료 처리 (현장) | 활성 배차 있으면 409 |
| POST | /orders/:id/adjust | 수량(대수) 조절 (현장) | adjustOrderSchema, 배차된 수량 미만 불가 |
| POST | /orders/:id/messages | 메시지 (통화 대체) | orderMessageSchema |
| POST | /orders/:id/deliveries | 차량 배정 = 회전 생성 (업체) | assignDeliverySchema, 잔여/적재량 검증 |
| POST | /orders/:id/deliveries/auto | 일괄 배차 — 잔여 수량을 가용 차량으로 자동 채움 (업체) | autoAssignSchema(trackingMode), 적재량 큰 차량부터, DeliveryDto[] 반환 |

### 배차 (Delivery)

| Method | Endpoint | Purpose | 비고 |
|---|---|---|---|
| GET | /deliveries/active | 활성 배차 + 위치/ETA (지도용) | ActiveDeliveryDto[](trackingMode·etaSource·stale 포함), 2초 폴링 |
| GET | /deliveries/:id/track-link | 기사 추적 링크 발급 (업체, gps 모드만) | `{ token, path }` |
| POST | /deliveries/:id/depart | 출발 = 상차+출발 통합 (업체) | assigned/loading→in_transit, dispatched_at 기록, 주문 in_progress 전환 |
| POST | /deliveries/:id/pour-complete | 타설 완료 = 타설 시작+완료 통합 (현장) | arrived/pouring→returning, pouring_started_at(없으면 도착시각)·pouring_ended_at 기록 |
| POST | /deliveries/:id/cancel | 배차 취소 (업체) | assigned/loading만 |

> UX 클릭 최소화: 상차→출발 2단계는 `depart` 1콜로, 타설 시작→완료 2단계는 `pour-complete` 1콜로 통합했다(상태 모델·타임스탬프는 서버에서 보존). 기존 load/dispatch/pouring-start/pouring-end 엔드포인트는 제거됨.

배차 생성(`/orders/:id/deliveries`)은 `trackingMode`(gps|estimated, 기본 estimated)를 받는다.
- **estimated**: 서버 시뮬레이터(`delivery.simulator.ts`)가 지도거리 기반으로 이동·도착·복귀를 자동 수행.
- **gps**: 기사 폰 위치 핑이 위치를 결정, 지오펜스(`GEOFENCE_M`) 진입 시 도착/복귀 자동 전이. 시뮬레이터 대상에서 제외.

ETA 산출은 네이버 Directions API 우선(환경변수 `NAVER_DIRECTIONS_KEY_ID/KEY` 설정 시), 미설정/실패 시 직선거리(haversine) 폴백 — 응답의 `etaSource`로 구분.

### 기사 추적 (Track, 공개)

| Method | Endpoint | Purpose | 인증 |
|---|---|---|---|
| GET | /track/:id?t=<토큰> | 기사 페이지 부트스트랩(배차/목적지) | 서명 기사 토큰(쿼리 `t`) |
| POST | /track/:id/location?t=<토큰> | 기사 폰 위치 핑 `{lat,lng}` | 서명 기사 토큰 |

기사 토큰은 계정 없이 특정 배차에만 종속(JWT `purpose:'driver'`, `sub:deliveryId`, 기본 24h). 종료 상태·비 gps 배차에는 거부.
프론트엔드: 공개 라우트 `/track/:deliveryId`(기사 모바일), 그 외 `apps/web/app/entities/*/api.ts` + TanStack Query 훅.
