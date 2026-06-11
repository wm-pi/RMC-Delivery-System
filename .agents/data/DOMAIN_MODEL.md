# DOMAIN_MODEL.md

이 문서는 프로젝트의 핵심 업무 개념과 도메인 관계를 진행 중에 정리하는 문서다.

프로젝트 시작 시 억지로 완성하지 않는다. 실제 기능, 화면, DB, API가 생기면서 확인된 내용만 추가한다.

---

## 작성 시점

- 핵심 도메인 이름이 정해졌을 때
- 업무 엔티티 간 관계가 코드나 DB에 반영될 때
- 상태값, 권한, 생명주기 규칙이 생길 때
- 도메인 용어가 팀 내에서 반복해서 쓰이기 시작할 때

---

## 작성할 내용

```txt
Domain:
Purpose:
Main users:
Core entities:
Entity relationships:
Status lifecycle:
Role/permission rules:
Important invariants:
Related screens:
Related APIs:
Related tables:
Open questions:
```

---

## Domain Notes

### Domain: 레미콘 운송 (RMC Delivery)

```txt
Domain: 레미콘 주문/배차/운송 관제
Purpose: 건설현장과 레미콘업체가 유선 통화로 하던 주문, 대수 조절, 배차, 도착/타설 확인을 웹 화면으로 대체
Main users:
  - site(건설현장 담당자): 주문 등록, 수량(대수) 조절, 타설 시작/완료 처리, 현황/지도 확인
  - plant(레미콘업체 배차 담당): 주문 접수/거절, 차량 배정, 상차/출발 처리, 차량 관리

Core entities:
  - Plant(공장): 레미콘 생산 공장. 위치 좌표 보유
  - Site(현장): 건설현장. 위치 좌표 보유
  - Vehicle(차량): 믹서트럭. 공장 소속, 적재량, 기사, 가용 상태
  - Order(주문): 현장 → 공장 주문. 규격, 총 수량(m³), 배차 간격, 납품 희망 일시
  - Delivery(배차/회전): 주문 1건에 N개. 차량 1대의 1회 운송(회전). 수량, 상태, 위치(lat/lng/progress)
  - OrderEvent(이벤트): 주문별 타임라인. 통화를 대체하는 메시지 + 상태/배차/조절 기록

Entity relationships:
  Site 1—N Order N—1 Plant
  Order 1—N Delivery N—1 Vehicle
  Plant 1—N Vehicle
  Order 1—N OrderEvent

Status lifecycle:
  Order: requested → accepted → in_progress → completed
         requested → rejected / cancelled, accepted·in_progress ↔ paused
  Delivery: assigned → loading → in_transit → arrived → pouring → returning → returned
            assigned/loading → cancelled
  Vehicle: available ↔ on_delivery (배차/복귀 시 자동), available ↔ maintenance (수동)

Role/permission rules (프로토타입 — 화면 분리로만 구분, 서버 인증 없음):
  - site: 주문 생성/조절/취소/일시중단/재개/완료, 타설 시작/완료
  - plant: 접수/거절, 배차 추가/취소, 상차/출발, 차량 CRUD
  - system(시뮬레이터): 도착/복귀 자동 전이

Important invariants:
  - 배차 합계 수량은 주문 총 수량을 초과할 수 없다
  - 주문 총 수량은 이미 배차된 수량 아래로 줄일 수 없다
  - 차량은 available 상태에서만 배차되고, 동일 공장 소속이어야 한다
  - paused 주문에는 신규 배차를 만들 수 없다
  - 진행 중 배차(assigned~pouring)가 있으면 주문 취소/완료 불가
  - 상태 전이는 shared의 DELIVERY_TRANSITIONS 표를 따른다

Related screens: 시작(역할 선택), 현장 대시보드/주문 상세/신규 주문/지도, 업체 대시보드/주문 상세/차량 관리/지도
Related APIs: .agents/data/API_CONTRACT.md 참고
Related tables: plants, sites, vehicles, orders, deliveries, order_events
Open questions:
  - 실제 GPS 연동 방식 (현재는 서버 시뮬레이터가 위치 생성)
  - 인증/조직 모델 (현재는 역할 선택 프로토타입)
  - 단가/정산, 송장(납품서) 도메인은 미구현
```
