# MonSoon 프론트엔드 개발 가이드

> 이 문서는 팀원이 프로젝트를 이해하고 담당 파트를 수정하기 위한 가이드입니다.

---

## 1. 초기 환경 세팅

### 1-1. 필수 설치
```bash
# Node.js 18+ 필요
node -v  # 확인

# 프론트엔드 의존성
cd final-front
npm install

# Mock 서버 의존성
cd mock-server
npm install
```

### 1-2. 실행 (동시 실행)
```bash
# 최초 1회 (루트 + mock-server 의존성 설치)
cd final-front
npm run setup

# 프론트(Vite) + Mock 서버(json-server) 동시 실행
npm run dev
```

### 1-2-1. 종료
- `npm run dev`를 실행한 터미널에서 `Ctrl + C`를 누르면 프론트와 mock-server가 함께 종료됨
- `q` 입력은 기본 종료 동작이 아님

### 1-3. 초기 실행 시 주의사항
- **동시 실행 권장** — `npm run dev` 사용 시 프론트와 Mock 서버가 함께 실행됨
- **db.json이 꼬였을 때** — 루트에서 `npm run mock:reset`으로 시드 데이터 복원
- **포트 충돌** — 3001(mock-server), 5173(vite) 포트가 이미 사용 중이면 `lsof -i :3001`로 확인 후 종료
- **환경 변수** — `.env.development`에 `VITE_API_BASE_URL=http://localhost:3001`가 설정되어 있어야 함. 없으면 생성

### 1-4. 빌드 확인
```bash
npm run build  # dist/ 폴더 생성 확인
```

---

## 2. 프로젝트 구조 & 담당 파일 가이드

### 2-1. 전체 구조 요약

| 폴더 | 역할 | 수정 시 주의 |
|------|------|------------|
| `src/api/` | API 함수 (axios → mock-server) | 엔드포인트 변경 시 mock-server의 routes.json도 수정 |
| `src/stores/` | Pinia 상태 관리 | api 모듈을 import해서 사용. 직접 Mock 데이터 넣지 말 것 |
| `src/router/index.js` | 라우팅 + 권한 가드 | 새 페이지 추가 시 반드시 `meta.roles` 설정 |
| `src/layouts/` | 역할별 레이아웃 | 사이드바+헤더+router-view 구조 |
| `src/components/common/` | 공통 컴포넌트 | 여러 페이지에서 재사용. 수정 시 영향 범위 확인 |
| `src/views/` | 각 페이지 | 도메인별 폴더로 분리 |
| `src/utils/constants.js` | ROLES, MENU_CONFIG | 메뉴 추가/수정 시 이 파일 변경 |
| `mock-server/` | JSON Server | db.json 구조 변경 시 프론트 api 모듈도 확인 |

### 2-2. 도메인별 담당 파일 맵

#### 거래처 관리 담당
```
수정 대상:
  src/views/client-mgmt/         ← 거래처 목록/상세/등록 View
  src/stores/client.js           ← 거래처 상태 관리
  src/api/client.js              ← 거래처 API 함수
  mock-server/db.json → clients  ← 거래처 Mock 데이터

참조할 프로토타입:
  screen_definition/history/client_management.html
  screen_definition/history/client_detail.html
  screen_definition/history/supervisor/su_client_management.html
  screen_definition/history/supervisor/su_client_detail.html
  screen_definition/client/client-register.html
```

#### 사원 관리 담당
```
수정 대상:
  src/views/employee-mgmt/       ← 사원 목록/상세/등록 View
  src/stores/employee.js
  src/api/employee.js
  mock-server/db.json → employees

참조할 프로토타입:
  screen_definition/employee/employee-register.html
  screen_definition/user/user-details.html (계정 활성화 참조)
```

#### 상품 담당
```
수정 대상:
  src/views/product/             ← 카탈로그/상세/비교/즐겨찾기/유사도/피드백
  src/stores/product.js
  src/api/product.js
  mock-server/db.json → products, favorites, compares

참조할 프로토타입:
  screen_definition/products/ (admin_*, client_*)
  screen_definition/product_similarity_analysis/
```

#### 문서관리 담당
```
수정 대상:
  src/views/document/            ← 문서작성 허브/각 문서 폼/히스토리/모든문서
  src/views/history/             ← 영업 히스토리/파이프라인
  src/components/document/
  src/components/history/
  src/stores/document.js
  src/api/document.js, history.js
  mock-server/db.json → documents, history

참조할 프로토타입:
  screen_definition/document/ (request, quotation, contract)
  screen_definition/order/
  screen_definition/invoice/
  screen_definition/history/ (sales_history, sales_pipeline_detail, sales_document_list)

⚠️ 중요: 문서-히스토리 연동 로직
  - 견적 요청서 작성 → 새 파이프라인 자동 생성
  - 후속 문서 → 기존 파이프라인에 추가
  - relatedDocumentId로 문서 체인 유지
```

#### 노트 담당
```
수정 대상:
  src/views/note/                ← 노트 작성/검색/AI 브리핑
  src/stores/note.js
  src/api/note.js
  mock-server/db.json → notes

참조할 프로토타입:
  screen_definition/note/notee.html

⚠️ robin_note 폴더는 무시 (사용하지 않음)
⚠️ 품종별 노트는 구현하지 않음
```

#### 유틸리티 (품종추천/병해충/통계/일정) 담당
```
수정 대상:
  src/views/recommendation/      ← 품종추천 (상품 카드 형태, 클릭 시 상세이동)
  src/views/pest-map/            ← 병해충지도 (실제 지도 라이브러리 사용)
  src/views/statistics/          ← 통계 (거래처별/품종별/사원별)
  src/views/schedule/            ← 일정 (캘린더 + 모달 등록)
  src/api/recommendation.js, pestMap.js, statistics.js, schedule.js

참조할 프로토타입:
  screen_definition/suggest/product_suggest.html
  screen_definition/map/newmap.html        ← map.html 아님!
  screen_definition/statistics/emp-stat.html, super-stat.html
  screen_definition/calendar/calendar.html

⚠️ 일정: 영업사원 뷰에서는 사원셀렉터 숨김, 관리자만 표시
⚠️ 통계: 순위 비교는 거래처별/품종별에서만 가능
```

#### 역할 전용 (승인/결제) + 공통 (알림/설정) 담당
```
수정 대상:
  src/views/approval/            ← 승인 (관리자 전용, 알림과 디자인 통일)
  src/views/payment/             ← 결제 (거래처 전용)
  src/views/notification/        ← 알림 (3역할 각각)
  src/views/settings/            ← 마이페이지 (역할별 다른 화면)
  src/api/approval.js, paymentStore.js, notification.js, user.js

참조할 프로토타입:
  screen_definition/approval/, payment/, notification/, mypage/

⚠️ 거래처 마이페이지는 screen_definition/mypage/client_detail.html 별도 참조
```

#### 대시보드 담당
```
수정 대상:
  src/views/dashboard/           ← 3역할 대시보드
  src/components/dashboard/
  src/api/dashboard.js
  mock-server/db.json → dashboardSalesRep, dashboardAdmin, dashboardClient

참조할 프로토타입:
  screen_definition/dashboard/{employee,supervisor,client}/
```

#### 공통 컴포넌트 / 레이아웃 담당
```
수정 대상:
  src/components/common/         ← AppSidebar, AppHeader, DataTable, ModalBase 등
  src/layouts/                   ← 3개 레이아웃
  src/router/index.js
  src/utils/constants.js

⚠️ 공통 컴포넌트 수정 시 모든 페이지에 영향
⚠️ AppSidebar: children 메뉴 active 판별은 exact match 사용
⚠️ AppHeader: 'MonSoon' 고정 표시, 사이드바 토글 버튼 포함
```

---

## 3. API 수정 가이드

### 3-1. 새 API 함수 추가 시
```
1. src/api/{도메인}.js에 함수 추가
2. mock-server/db.json에 해당 리소스/데이터 추가
3. mock-server/routes.json에 라우트 매핑 추가 (필요 시)
4. src/stores/{도메인}.js에 action 추가
5. View에서 store action 호출
```

### 3-2. API 함수 구조
```js
// src/api/client.js
import api from './index'

export function getClients(params) {
  return api.get('/clients', { params })
}

export function createClient(data) {
  return api.post('/clients', data)
}
```

### 3-3. Store에서 사용
```js
// src/stores/client.js
import { getClients } from '@/api/client'

async function fetchClients(params) {
  loading.value = true
  try {
    clients.value = await getClients(params)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
```

### 3-4. 주의사항
- `src/api/index.js`의 응답 인터셉터가 `response.data`를 반환하므로, Store에서 `{ data }` 디스트럭처링이 불필요할 수 있음 → 실제 반환값 확인
- POST/PUT 후 관련 목록 Store를 갱신해야 함 (예: 문서 작성 후 `documentStore.fetchDocuments()`)

---

## 4. Mock 서버 수정 가이드

### 4-1. db.json 구조
```json
{
  "users": [...],
  "clients": [...],
  "employees": [...],
  "products": [...],
  "favorites": [...],
  "compares": [...],
  "documents": [...],
  "history": [...],
  "notes": [...],
  "recommendations": [...],
  "pestMap": [...],
  "statistics": [...],
  "schedules": [...],
  "approvals": [...],
  "payments": [...],
  "notifications": [...],
  "dashboardSalesRep": {...},
  "dashboardAdmin": {...},
  "dashboardClient": {...}
}
```

### 4-2. 데이터 추가/수정 시
- db.json을 직접 수정하거나 API POST/PUT으로 추가 가능
- JSON Server는 CRUD를 자동 지원: GET/POST/PUT/DELETE
- **데이터가 꼬이면**: 루트에서 `npm run mock:reset` 실행 후 서버 재시작

### 4-3. 커스텀 라우트 (routes.json)
프론트의 API URL과 JSON Server 리소스명이 다를 때 매핑:
```json
{
  "/api/clients": "/clients",
  "/api/products/:id/similarity": "/products"
}
```

### 4-4. 주의사항
- JSON Server는 json 파일 기반이므로 서버 재시작 시에도 CRUD 변경사항이 유지됨
- 여러 사람이 동시에 db.json을 수정하면 충돌 → 각자 로컬에서만 작업
- db.seed.json은 절대 수정하지 않음 (복원 원본)

---

## 5. 기능별 수정 시 체크리스트

### 새 페이지 추가
```
[ ] src/views/{도메인}/XxxView.vue 생성
[ ] src/router/index.js에 라우트 추가 (meta.roles 설정)
[ ] constants.js MENU_CONFIG에 메뉴 추가 (필요 시)
[ ] src/api/{도메인}.js에 API 함수 추가
[ ] src/stores/{도메인}.js에 상태/action 추가
[ ] mock-server/db.json에 데이터 추가
```

### 기존 페이지 UI 수정
```
[ ] screen_definition/에서 원본 프로토타입 HTML 확인
[ ] 해당 View 컴포넌트 수정
[ ] 공통 컴포넌트를 사용하고 있다면 영향 범위 확인
[ ] 역할별로 다르게 보여야 하는 부분은 v-if="role === 'XXX'" 처리
[ ] npm run dev로 3개 역할 모두 확인
```

### Store/API 로직 수정
```
[ ] src/api/{도메인}.js 수정
[ ] src/stores/{도메인}.js 수정
[ ] mock-server/db.json 데이터 구조가 변경되었으면 db.seed.json도 업데이트
[ ] 해당 데이터를 사용하는 모든 View가 정상 동작하는지 확인
```

### 역할별 분기 추가
```
[ ] authStore.currentRole로 현재 역할 확인
[ ] template에서 v-if="currentRole === 'ADMIN'" 등으로 분기
[ ] router meta.roles에 해당 역할 포함 여부 확인
[ ] 3개 역할로 각각 로그인해서 테스트
```

---

## 6. 역할별 문서 작성 권한 (빈출 실수 방지)

| 문서 타입 | 영업사원 작성 | 관리자 작성 | 거래처 작성 |
|----------|:---:|:---:|:---:|
| 견적 요청서 | ❌ | ❌ | ✅ |
| 견적서 | ✅ | ❌ | ❌ |
| 계약서 | ✅ | ❌ | ❌ |
| 주문서 | ❌ | ❌ | ✅ |
| 명세서 | ✅ | ❌ | ❌ |
| 청구서 | ✅ | ❌ | ❌ |

> 6종 문서 모두 전 역할 조회 가능. 거래처는 수정 불가.

---

## 7. 자주 발생하는 에러 & 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| `Cannot read properties of undefined (reading 'length')` | 데이터 로딩 전 template 접근 | `v-if="data"` 감싸기 또는 `?.` 사용 |
| `Network Error` / CORS | Mock 서버 미실행 | 루트에서 `npm run mock` 또는 `npm run dev` |
| 사이드바 메뉴 중복 active | prefix 매칭 문제 | AppSidebar에서 exact match 사용 |
| `vite: not found` | node_modules 미설치 | `npm install` |
| db.json 데이터 꼬임 | CRUD로 데이터 변형 | 루트에서 `npm run mock:reset` |
| 새 패키지 추가 후 에러 | install 안 함 | `npm install` |

---

## 8. Git 작업 규칙

- **PR 전 확인**:
  - `npm run dev`로 에러 없는지
  - 담당 도메인 외 파일을 수정하지 않았는지
  - db.seed.json을 변경했다면 팀에 공유

---

## 9. AI 에이전트 활용 팁

- 수정 요청 시 `@AGENTS.md 를 읽어줘`로 시작하면 에이전트가 프로젝트 컨텍스트를 파악함
- 원본 프로토타입을 참조해야 하면 `screen_definition/xxx.html을 읽어줘`를 반드시 포함
- 한 번에 5~8개 파일 이내로 요청 (너무 많으면 품질 저하)
- 수정 후 반드시 `수정한 파일 목록 출력해줘`를 요청해서 변경 범위 확인
