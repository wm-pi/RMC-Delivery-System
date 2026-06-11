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

> 공통: base `/api`, 인증 없음(로컬 프로토타입). 성공 응답은 body 그대로,
> 에러 응답은 `{ message, code, detail? }` (VALIDATION_ERROR 400 / NOT_FOUND 404 / CONFLICT·INVALID_STATE 409 / INTERNAL_ERROR 500).
> 요청/응답 타입과 Zod 스키마의 단일 소스는 `packages/shared`다.

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

### 배차 (Delivery)

| Method | Endpoint | Purpose | 비고 |
|---|---|---|---|
| GET | /deliveries/active | 활성 배차 + 위치/ETA (지도용) | ActiveDeliveryDto[], 2초 폴링 |
| GET | /deliveries/:id | 배차 단건 | - |
| POST | /deliveries/:id/load | 상차 시작 (업체) | assigned→loading |
| POST | /deliveries/:id/dispatch | 출발 (업체) | loading→in_transit, 주문 in_progress 전환 |
| POST | /deliveries/:id/pouring-start | 타설 시작 (현장) | arrived→pouring |
| POST | /deliveries/:id/pouring-end | 타설 완료 (현장) | pouring→returning |
| POST | /deliveries/:id/cancel | 배차 취소 (업체) | assigned/loading만 |

도착(arrived)·복귀(returned) 전이는 서버 시뮬레이터(`delivery.simulator.ts`)가 자동 수행한다.
프론트엔드 사용처: `apps/web/app/entities/*/api.ts` + TanStack Query 훅(`queries.ts`).
