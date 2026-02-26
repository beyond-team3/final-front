GENTS.md — MonSoon 프론트엔드 프로젝트 컨텍스트

> AI 코딩 에이전트(Codex, Copilot 등)가 이 파일을 읽고 프로젝트를 이해한 뒤 작업한다.
> 수정 요청 시 `@AGENTS.md 를 읽어줘`로 시작할 것.

---

## 프로젝트 개요
- **MonSoon** — 종자회사 B2B 영업관리 시스템 프론트엔드
- **스택**: Vue 3 + Vite + Vue Router 4 + Pinia + Tailwind CSS
- **역할**: 영업사원(SALES_REP), 관리자(ADMIN), 거래처(CLIENT)
- **Mock 서버**: JSON Server (`mock-server/`, 포트 3001)
- **API 레이어**: `src/api/` → axios → mock-server (백엔드 연결 시 URL만 교체)

---

## 1. 프로젝트 구조

```
final-front/
├── AGENTS.md
├── package.json
├── vite.config.js
├── .env.development          ← VITE_API_BASE_URL=http://localhost:3001
├── .env.production           ← VITE_API_BASE_URL=/api
├── mock-server/
│   ├── db.json
│   ├── db.seed.json          ← 시드 데이터 원본 (복원용)
│   ├── routes.json
│   ├── middleware.js
│   └── server.js
├── screen_definition/        ← 원본 HTML 프로토타입 (읽기 전용)
└── src/
    ├── api/                  ← axios 기반 API 모듈 (도메인별)
    │   ├── index.js          ← axios 인스턴스 + 인터셉터
    │   ├── auth.js, client.js, employee.js, product.js
    │   ├── document.js, history.js, note.js, dashboard.js
    │   ├── recommendation.js, pestMap.js, statistics.js
    │   ├── schedule.js, approval.js, payment.js
    │   ├── notification.js, user.js
    ├── router/index.js
    ├── stores/               ← Pinia (api 모듈 호출, 상태 관리)
    ├── layouts/              ← SalesRepLayout, AdminLayout, ClientLayout
    ├── components/
    │   ├── common/           ← AppSidebar, AppHeader, DataTable, ModalBase 등
    │   ├── dashboard/, history/, document/, product/
    ├── views/                ← 도메인별 페이지
    ├── utils/constants.js    ← ROLES, MENU_CONFIG
    ├── composables/          ← useAuth, useRole
    └── assets/
```

---

## 2. 역할별 권한

| 기능 | 영업사원 | 관리자 | 거래처 |
|------|:---:|:---:|:---:|
| 대시보드 | ✅ | ✅ | ✅ |
| 거래처 관리 | ✅ 조회 | ✅ 조회+등록+활성화 | ❌ |
| 사원 관리 | ❌ | ✅ 조회+등록+활성화 | ❌ |
| 상품 카탈로그 | ✅ | ✅ | ✅ |
| 상품 등록/수정 | ❌ | ✅ | ❌ |
| 피드백 커뮤니티 | ✅ | ✅ | ❌ |
| 문서 작성 | 견적서/계약서/청구서 | ❌ | 견적요청서/주문서 |
| 문서 조회 | ✅ 6종 | ✅ 6종 | ✅ 6종 (수정 불가) |
| 노트 | ✅ | ❌ | ❌ |
| 품종추천/병해충/통계/일정 | ✅ | ✅ (+사원별통계, 사원셀렉터) | ❌ |
| 승인 | ❌ | ✅ | ❌ |
| 결제 | ❌ | ❌ | ✅ |
| 알림/설정 | ✅ | ✅ | ✅ |

---

## 3. 데이터 흐름

```
View → Pinia Store → src/api/{도메인}.js → axios → mock-server(3001)
```
- View에서 직접 axios 호출 금지
- Store에 하드코딩 Mock 금지
- 데이터 로딩 전 접근 방지: `v-if="data"` 또는 `?.` 사용

---

## 4. 문서-히스토리 연동 로직

- 견적 요청서 작성 → 새 파이프라인 생성
- 후속 문서 작성 → 기존 파이프라인에 추가 (relatedDocumentId로 연결)
- 문서 작성 시 히스토리 + 모든문서에 즉시 반영

---

## 5. 코딩 컨벤션

- `<script setup>` 필수
- View: PascalCase+View / 컴포넌트: PascalCase / Store: camelCase
- script 순서: imports → props/emits → store → ref/reactive → computed → functions → lifecycle
- DOM 직접 조작 금지 → Vue 반응성 사용

---

## 6. 수정 시 규칙

- 세션 시작: AGENTS.md 읽기 → 대상 파일 확인 → 관련 프로토타입 HTML 확인
- 세션 종료: 수정 파일 목록 출력 → `npm run dev` 에러 확인
- 금지: 범위 외 파일 변경, 프로토타입에 없는 기능 추가, console.log 잔류

---

## 7. 프로토타입 참조

| 도메인 | 프로토타입 위치 |
|--------|---------------|
| 로그인/사용자 | `screen_definition/user/` |
| 대시보드 | `screen_definition/dashboard/{employee,supervisor,client}/` |
| 거래처 | `screen_definition/history/`, `screen_definition/client/` |
| 사원 | `screen_definition/employee/` |
| 상품 | `screen_definition/products/`, `screen_definition/product_similarity_analysis/` |
| 문서 | `screen_definition/document/`, `order/`, `invoice/` |
| 노트 | `screen_definition/note/` |
| 병해충지도 | `screen_definition/map/newmap.html` |
| 통계 | `screen_definition/statistics/` |
| 일정 | `screen_definition/calendar/` |
| 승인/결제/알림/마이페이지 | `screen_definition/{approval,payment,notification,mypage}/` |

---

## 8. MENU_CONFIG 참조

```js
export const ROLES = { SALES_REP: 'SALES_REP', ADMIN: 'ADMIN', CLIENT: 'CLIENT' }

export const MENU_CONFIG = [
  { key: 'dashboard', label: '대시보드', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/dashboard' },
  { key: 'client-mgmt', label: '거래처 관리', roles: ['SALES_REP','ADMIN'], route: '/clients' },
  { key: 'employee-mgmt', label: '사원 관리', roles: ['ADMIN'], route: '/employees' },
  { key: 'product', label: '상품', roles: ['SALES_REP','ADMIN','CLIENT'], children: [
      { key: 'catalog', label: '카탈로그', route: '/products/catalog' },
      { key: 'favorites', label: '즐겨찾기', route: '/products/favorites' },
      { key: 'compare', label: '비교함', route: '/products/compare' },
      { key: 'register', label: '상품 등록', route: '/products/register', roles: ['ADMIN'] },
  ]},
  { key: 'document', label: '문서관리', roles: ['SALES_REP','ADMIN','CLIENT'], children: [
      { key: 'doc-create', label: '문서작성', route: '/documents/create', roles: ['SALES_REP','CLIENT'] },
      { key: 'doc-history', label: '히스토리', route: '/documents/history' },
      { key: 'doc-all', label: '모든 문서', route: '/documents/all' },
  ]},
  { key: 'note', label: '노트', roles: ['SALES_REP'], children: [
      { key: 'note-main', label: '노트 작성', route: '/notes' },
      { key: 'note-search', label: '노트 검색', route: '/notes/search' },
      { key: 'ai-briefing', label: 'AI 영업 브리핑', route: '/notes/ai-briefing' },
  ]},
  { key: 'recommendation', label: '재배적기 품종추천', roles: ['SALES_REP','ADMIN'], route: '/recommendation' },
  { key: 'pest-map', label: '병해충지도', roles: ['SALES_REP','ADMIN'], route: '/pest-map' },
  { key: 'statistics', label: '통계', roles: ['SALES_REP','ADMIN'], route: '/statistics' },
  { key: 'schedule', label: '일정', roles: ['SALES_REP','ADMIN'], route: '/schedule' },
  { key: 'approval', label: '승인', roles: ['ADMIN'], route: '/approval' },
  { key: 'payment', label: '결제', roles: ['CLIENT'], route: '/payment' },
  { key: 'notification', label: '알림', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/notifications' },
  { key: 'settings', label: '설정', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/settings' },
]
```
