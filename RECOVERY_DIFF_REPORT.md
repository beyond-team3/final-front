# 리팩토링 전후 차이점 및 복구 기준 (before-refactor 비교)

## 1) 목적
- `before-refactor` 버전과 현재 버전을 비교하여, 리팩토링 과정에서 **페이지/기능 접근 경로가 사라진 영역**을 식별한다.
- 복구 작업 시 기준을 명확히 한다.

## 2) 고정 원칙 (필수)
- **메뉴 구조는 무조건 현재 버전을 따른다.**
- **디자인(UI 스타일/레이아웃)은 무조건 현재 버전을 따른다.**
- 즉, 이전 버전의 사이드바 구조/스타일로 롤백하지 않는다.
- 복구는 "현재 정보구조(IA) 안에서 기능/페이지 진입 경로를 되살리는 방식"으로 진행한다.

## 3) 비교 결과 요약
- `src/views` 파일 자체는 before-refactor와 현재 버전이 동일하게 존재한다.
- `src/router/index.js` 라우트도 before-refactor와 현재 버전이 사실상 동일하다.
- 실제 차이의 핵심은 `src/utils/constants.js`의 `MENU_CONFIG` 재구성이다.
  - 이전: 도메인 중심 메뉴(대시보드/거래처/사원/상품/문서/노트/추천/병해충/통계/일정/승인/결제/알림/설정)
  - 현재: 상위 메뉴 단순화(`Dashboard`, `Sales`, `Products`, `Clients`, `Statistics`) + 헤더 메뉴(`일정`, `알림`, `설정`)

## 4) 사라진(또는 메뉴에서 비노출된) 영역
아래 항목은 "라우트/뷰는 존재하지만", 현재 `MENU_CONFIG` 기준으로 사이드바 진입 경로가 제거된 상태다.

### 4-1. 메뉴 노출에서 제거된 주요 라우트
- `/documents/create` (문서작성)
- `/documents/history` (문서 히스토리)
- `/documents/all` (모든 문서)
- `/products/favorites` (상품 즐겨찾기)
- `/products/compare` (상품 비교)
- `/products/register` (상품 등록, ADMIN)
- `/notes`, `/notes/search`, `/notes/briefing` (노트 기능 전체)
- `/pest-map` (병해충지도)
- `/approval` (승인, ADMIN)
- `/payment` (결제, CLIENT)

### 4-2. 구조 변경(이동)된 항목
- `/schedule`, `/notifications`, `/settings`
  - 사이드바에서 제거되고 `HEADER_MENU_CONFIG`로 이동됨.

## 5) 복구 방향 (현재 메뉴/디자인 유지 전제)
아래는 "이전 구조 롤백"이 아니라, **현재 구조 내에서 기능 접근성을 복원**하기 위한 기준이다.

### 5-1. Sales (영업 관리) 하위 복구 후보
- 문서작성(`/documents/create`)
- 문서 히스토리(`/documents/history`)
- 모든 문서(`/documents/all`)

### 5-2. Products (상품 관리) 하위 복구 후보
- 즐겨찾기(`/products/favorites`)
- 비교함(`/products/compare`)
- 상품 등록(`/products/register`, ADMIN)
- 병해충지도(`/pest-map`)는 Product 인접 기능으로 편입 검토

### 5-3. Clients (고객 관리) 하위 또는 역할별 전용 섹션 복구 후보
- 노트(`/notes`, `/notes/search`, `/notes/briefing`)는 영업사원 전용 기능으로 재노출
- 승인(`/approval`)은 ADMIN 전용 링크로 재노출
- 결제(`/payment`)는 CLIENT 전용 링크로 재노출

### 5-4. Header 유지 원칙
- 일정/알림/설정은 현재처럼 헤더 메뉴 유지.
- 사이드바로 재이관하지 않는다.

## 6) 구현 시 체크리스트
- `src/utils/constants.js`만으로 진입 경로를 우선 복구하고, 라우트/뷰는 기존 자산 재사용.
- 권한(`roles`)은 기존 규칙(SALES_REP/ADMIN/CLIENT) 그대로 적용.
- 화면 구현체는 현재 버전 컴포넌트 스타일을 유지하고 before-refactor 스타일로 되돌리지 않음.
- 복구 후 역할별 사이드바 노출/비노출 검증 필수.

## 7) 결론
- 현재 코드베이스에서 "삭제"의 본질은 **기능 코드 소실**이 아니라 **메뉴 진입 경로 축소**다.
- 따라서 복구 작업의 핵심은 현재 IA/디자인을 유지한 채, 필요한 페이지 링크를 권한별로 재노출하는 것이다.
