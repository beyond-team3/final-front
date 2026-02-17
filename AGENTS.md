# AGENTS.md — HTML 프로토타입 → Vue 3 프로젝트 변환 가이드

## 목적
- `screen_definition/` 폴더의 HTML 프로토타입을 `src/` 아래 **Vue 3 컴포넌트로 체계적으로 변환**한다.

## 프로젝트 컨텍스트
- Vite + Vue 3 기반
- `screen_definition/` = 변환 입력(원본), `src/` = 변환 결과물

## 변환 대상 폴더
`screen_definition/` 하위 주요 폴더:
- approval, calendar, client, dashboard, document, employee, history, invoice, map, mypage,
  note, notification, order, payment, products, product_similarity_analysis,
  statistics, suggest, user

---

## 1) 프로토타입 → Vue 파일 매핑

### 인증/사용자
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/user/login.html` | `src/views/auth/LoginView.vue` | 공통 |
| `screen_definition/user/user-list.html` | `src/views/user/UserListView.vue` | 관리자 |
| `screen_definition/user/user-details.html` | `src/views/user/UserDetailView.vue` | 관리자 |
| `screen_definition/user/user-register.html` | `src/views/user/UserRegisterView.vue` | 관리자 |

### 대시보드
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/dashboard/employee/dashboard-employee.html` | `src/views/dashboard/SalesRepDashboard.vue` | 영업사원 |
| `screen_definition/dashboard/employee/calender.html` | `src/components/dashboard/DashboardCalendar.vue` | 영업사원 |
| `screen_definition/dashboard/employee/reference.html` | `src/components/dashboard/DashboardReference.vue` | 영업사원 |
| `screen_definition/dashboard/supervisor/dashboard-supervisor.html` | `src/views/dashboard/AdminDashboard.vue` | 관리자 |
| `screen_definition/dashboard/client/dashboard-client.html` | `src/views/dashboard/ClientDashboard.vue` | 거래처 |

### 거래처 관리 / 히스토리
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/history/client_management.html` | `src/views/client-mgmt/ClientListView.vue` | 영업사원 |
| `screen_definition/history/client_detail.html` | `src/views/client-mgmt/ClientDetailView.vue` | 영업사원 |
| `screen_definition/history/supervisor/su_client_management.html` | `src/views/client-mgmt/AdminClientListView.vue` | 관리자 |
| `screen_definition/history/supervisor/su_client_detail.html` | `src/views/client-mgmt/AdminClientDetailView.vue` | 관리자 |
| `screen_definition/client/client-register.html` | `src/views/client-mgmt/ClientRegisterView.vue` | 관리자 |
| `screen_definition/history/main-template.html` | `src/components/history/HistoryTemplate.vue` | 영업사원 |
| `screen_definition/history/supervisor/main-template.html` | `src/components/history/AdminHistoryTemplate.vue` | 관리자 |
| `screen_definition/history/sales_history.html` | `src/views/history/SalesHistoryView.vue` | 영업사원 |
| `screen_definition/history/sales_pipeline_detail.html` | `src/views/history/PipelineDetailView.vue` | 영업사원 |
| `screen_definition/history/sales_document_list.html` | `src/views/history/DocumentListView.vue` | 영업사원 |
| `screen_definition/history/Modal.html` | `src/components/history/HistoryModal.vue` | 공통 |

### 사원 관리
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/employee/employee-register.html` | `src/views/employee-mgmt/EmployeeRegisterView.vue` | 관리자 |

### 상품
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/products/admin_list.html` | `src/views/product/AdminCatalogView.vue` | 관리자 |
| `screen_definition/products/admin_detail.html` | `src/views/product/AdminProductDetailView.vue` | 관리자 |
| `screen_definition/products/admin_compare.html` | `src/views/product/AdminCompareView.vue` | 관리자 |
| `screen_definition/products/admin_favorites.html` | `src/views/product/AdminFavoritesView.vue` | 관리자 |
| `screen_definition/products/admin_form.html` | `src/views/product/ProductRegisterView.vue` | 관리자 |
| `screen_definition/products/client_list.html` | `src/views/product/ClientCatalogView.vue` | 거래처 |
| `screen_definition/products/client_detail.html` | `src/views/product/ClientProductDetailView.vue` | 거래처 |
| `screen_definition/products/client_compare.html` | `src/views/product/ClientCompareView.vue` | 거래처 |
| `screen_definition/products/client_favorites.html` | `src/views/product/ClientFavoritesView.vue` | 거래처 |
| `screen_definition/products/product_feedback.html` | `src/views/product/ProductFeedbackView.vue` | 공통 |
| `screen_definition/product_similarity_analysis/product_similarity_analysis.html` | `src/views/product/SimilarityAnalysisView.vue` | 공통 |

### 문서 관리
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/document/request.html` | `src/views/document/QuotationRequestView.vue` | 영업사원 |
| `screen_definition/document/quotation.html` | `src/views/document/QuotationView.vue` | 영업사원 |
| `screen_definition/document/contract.html` | `src/views/document/ContractView.vue` | 영업사원 |
| `screen_definition/order/order.html` | `src/views/document/OrderView.vue` | 공통 |
| `screen_definition/order/order_modal.html` | `src/components/document/OrderModal.vue` | 공통 |
| `screen_definition/invoice/invoice.html` | `src/views/document/InvoiceView.vue` | 공통 |
| `screen_definition/invoice/invoice_list_page.html` | `src/views/document/InvoiceListView.vue` | 공통 |

### 노트
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/note/notee.html` | `src/views/note/NoteView.vue` | 영업사원 |

### 기타 기능
| 프로토타입 | Vue 파일 | 역할 |
|---|---|---|
| `screen_definition/suggest/product_suggest.html` | `src/views/recommendation/CropRecommendView.vue` | 영업사원, 관리자 |
| `screen_definition/map/newmap.html` | `src/views/pest-map/PestMapView.vue` | 영업사원, 관리자 |
| `screen_definition/statistics/emp-stat.html` | `src/views/statistics/SalesRepStatsView.vue` | 영업사원 |
| `screen_definition/statistics/super-stat.html` | `src/views/statistics/AdminStatsView.vue` | 관리자 |
| `screen_definition/calendar/calendar.html` | `src/views/schedule/CalendarView.vue` | 영업사원, 관리자 |
| `screen_definition/approval/approval-request-list.html` | `src/views/approval/ApprovalView.vue` | 관리자 |
| `screen_definition/payment/payment.html` | `src/views/payment/PaymentView.vue` | 거래처 |
| `screen_definition/notification/emp_notification.html` | `src/views/notification/SalesRepNotificationView.vue` | 영업사원 |
| `screen_definition/notification/super_notification.html` | `src/views/notification/AdminNotificationView.vue` | 관리자 |
| `screen_definition/notification/client_notification.html` | `src/views/notification/ClientNotificationView.vue` | 거래처 |
| `screen_definition/mypage/user-details.html` | `src/views/settings/MyPageView.vue` | 공통 |
| `screen_definition/mypage/client_detail.html` | `src/views/settings/ClientMyPageView.vue` | 거래처 |

---

## 2) 목표 src/ 구조

```
src/
├── App.vue
├── main.js
├── router/
│   └── index.js
├── stores/
│   ├── auth.js
│   ├── client.js
│   ├── employee.js
│   ├── product.js
│   ├── document.js
│   ├── note.js
│   └── notification.js
├── composables/
│   ├── useAuth.js
│   └── useRole.js
├── layouts/
│   ├── SalesRepLayout.vue
│   ├── AdminLayout.vue
│   └── ClientLayout.vue
├── components/
│   ├── common/
│   │   ├── AppSidebar.vue
│   │   ├── AppHeader.vue
│   │   ├── DataTable.vue
│   │   ├── ModalBase.vue
│   │   ├── StatusBadge.vue
│   │   ├── PageHeader.vue
│   │   ├── SearchFilter.vue
│   │   └── TabNav.vue
│   ├── dashboard/
│   ├── history/
│   ├── document/
│   ├── product/
│   └── note/
├── views/
│   ├── auth/
│   ├── dashboard/
│   ├── client-mgmt/
│   ├── employee-mgmt/
│   ├── product/
│   ├── document/
│   ├── history/
│   ├── note/
│   ├── recommendation/
│   ├── pest-map/
│   ├── statistics/
│   ├── schedule/
│   ├── approval/
│   ├── payment/
│   ├── notification/
│   ├── settings/
│   └── user/
├── utils/
│   ├── constants.js
│   └── helpers.js
└── assets/
    ├── styles/
    │   └── global.css
    └── images/
        └── mapimg2.png
```

---

## 3) 작업 규칙(핵심)
- **1 Phase = 1 세션**, 세션당 **최대 5~8개 파일 생성/수정**
- 세션 시작: `AGENTS.md 읽기 → src 구조 확인 → 해당 Phase만 작업`
- 세션 종료: **수정/생성 파일 목록 출력**, `npm run build`로 에러 확인, **다음 Phase 할 일 명시**

---

## 4) Phase 계획 + 파일 매핑

### Phase 1: 의존성 + 기본 설정 (1세션)
> Vite + Vue 3 프로젝트가 이미 존재하므로 부족한 부분만 추가.
```
- package.json에 vue-router@4, pinia, @vueuse/core, tailwindcss, chart.js, vue-chartjs 추가
- tailwind.config.js, postcss.config.js 생성
- src/utils/constants.js 생성 (ROLES, MENU_CONFIG — 섹션 6 참조)
- src/assets/styles/global.css 생성
- src/main.js에 Router, Pinia, 글로벌 CSS 등록
- 섹션 2의 폴더 구조대로 빈 폴더 생성
```

### Phase 2: 라우터 + auth store + 레이아웃 + 로그인 (1세션)
```
screen_definition/user/login.html → src/views/auth/LoginView.vue
+ src/router/index.js (전체 라우트 + beforeEach 가드)
+ src/stores/auth.js
+ src/layouts/SalesRepLayout.vue, AdminLayout.vue, ClientLayout.vue
+ src/components/common/AppSidebar.vue, AppHeader.vue
```

### Phase 3: 공통 컴포넌트 추출 (1세션)
```
참조: history/main-template.html, history/Modal.html, products/admin_list.html 등
→ src/components/common/ 하위:
  DataTable, SearchFilter, ModalBase, StatusBadge, PageHeader, CardBase, TabNav
```

### Phase 4: 대시보드 (1세션)
```
screen_definition/dashboard/employee/dashboard-employee.html → src/views/dashboard/SalesRepDashboard.vue
screen_definition/dashboard/employee/calender.html           → src/components/dashboard/DashboardCalendar.vue
screen_definition/dashboard/employee/reference.html          → src/components/dashboard/DashboardReference.vue
screen_definition/dashboard/supervisor/dashboard-supervisor.html → src/views/dashboard/AdminDashboard.vue
screen_definition/dashboard/client/dashboard-client.html     → src/views/dashboard/ClientDashboard.vue
```

### Phase 5: 거래처 관리 + 사원/사용자 관리 (1~2세션)
```
screen_definition/history/client_management.html             → src/views/client-mgmt/ClientListView.vue
screen_definition/history/client_detail.html                 → src/views/client-mgmt/ClientDetailView.vue
screen_definition/history/supervisor/su_client_management.html → src/views/client-mgmt/AdminClientListView.vue
screen_definition/history/supervisor/su_client_detail.html   → src/views/client-mgmt/AdminClientDetailView.vue
screen_definition/client/client-register.html               → src/views/client-mgmt/ClientRegisterView.vue
screen_definition/employee/employee-register.html            → src/views/employee-mgmt/EmployeeRegisterView.vue
screen_definition/user/user-list.html                        → src/views/user/UserListView.vue
screen_definition/user/user-details.html                     → src/views/user/UserDetailView.vue
screen_definition/user/user-register.html                    → src/views/user/UserRegisterView.vue
+ src/stores/client.js, src/stores/employee.js
```
> ⚠️ 9개 파일 → 필요 시 Phase 5A(거래처 5개) / 5B(사원+사용자 4개)로 분할

### Phase 6A: 상품 — 관리자 계열 (1세션)
```
screen_definition/products/admin_list.html       → src/views/product/AdminCatalogView.vue
screen_definition/products/admin_detail.html     → src/views/product/AdminProductDetailView.vue
screen_definition/products/admin_compare.html    → src/views/product/AdminCompareView.vue
screen_definition/products/admin_favorites.html  → src/views/product/AdminFavoritesView.vue
screen_definition/products/admin_form.html       → src/views/product/ProductRegisterView.vue
+ src/stores/product.js
```

### Phase 6B: 상품 — 거래처 계열 + 유사도 + 피드백 (1세션)
```
screen_definition/products/client_list.html      → src/views/product/ClientCatalogView.vue
screen_definition/products/client_detail.html    → src/views/product/ClientProductDetailView.vue
screen_definition/products/client_compare.html   → src/views/product/ClientCompareView.vue
screen_definition/products/client_favorites.html → src/views/product/ClientFavoritesView.vue
screen_definition/products/product_feedback.html → src/views/product/ProductFeedbackView.vue
screen_definition/product_similarity_analysis/product_similarity_analysis.html → src/views/product/SimilarityAnalysisView.vue
```

### Phase 7: 문서관리 (1세션)
```
screen_definition/document/request.html          → src/views/document/QuotationRequestView.vue
screen_definition/document/quotation.html        → src/views/document/QuotationView.vue
screen_definition/document/contract.html         → src/views/document/ContractView.vue
screen_definition/order/order.html               → src/views/document/OrderView.vue
screen_definition/order/order_modal.html         → src/components/document/OrderModal.vue
screen_definition/invoice/invoice.html           → src/views/document/InvoiceView.vue
screen_definition/invoice/invoice_list_page.html → src/views/document/InvoiceListView.vue
+ src/stores/document.js
```

### Phase 8: 영업 히스토리 + 파이프라인 (1세션)
```
screen_definition/history/sales_history.html         → src/views/history/SalesHistoryView.vue
screen_definition/history/sales_pipeline_detail.html → src/views/history/PipelineDetailView.vue
screen_definition/history/sales_document_list.html   → src/views/history/DocumentListView.vue
screen_definition/history/main-template.html         → src/components/history/HistoryTemplate.vue
screen_definition/history/supervisor/main-template.html → src/components/history/AdminHistoryTemplate.vue
screen_definition/history/Modal.html                 → src/components/history/HistoryModal.vue
```

### Phase 9: 노트 (1세션)
```
screen_definition/note/notee.html              → src/views/note/NoteView.vue
+ src/stores/note.js
```

### Phase 10: 유틸리티 기능 (1세션)
```
screen_definition/suggest/product_suggest.html  → src/views/recommendation/CropRecommendView.vue
screen_definition/map/newmap.html               → src/views/pest-map/PestMapView.vue
screen_definition/statistics/emp-stat.html      → src/views/statistics/SalesRepStatsView.vue
screen_definition/statistics/super-stat.html    → src/views/statistics/AdminStatsView.vue
screen_definition/calendar/calendar.html        → src/views/schedule/CalendarView.vue
+ map/mapimg2.png → src/assets/images/mapimg2.png 복사
```

### Phase 11: 역할 전용 + 공통 기능 (1세션)
```
screen_definition/approval/approval-request-list.html    → src/views/approval/ApprovalView.vue
screen_definition/payment/payment.html                   → src/views/payment/PaymentView.vue
screen_definition/notification/emp_notification.html     → src/views/notification/SalesRepNotificationView.vue
screen_definition/notification/super_notification.html   → src/views/notification/AdminNotificationView.vue
screen_definition/notification/client_notification.html  → src/views/notification/ClientNotificationView.vue
screen_definition/mypage/user-details.html               → src/views/settings/MyPageView.vue
screen_definition/mypage/client_detail.html              → src/views/settings/ClientMyPageView.vue
+ src/stores/notification.js
```

### Phase 12: 통합 테스트 + 정리 (1세션)
```
1. 전체 라우팅 흐름 점검 (3개 역할)
2. 권한 가드 동작 확인
3. 콘솔 에러 제거, 불필요한 import 정리
4. npm run build 성공 확인
5. README.md 업데이트
```

---

## 5) HTML → Vue 변환 규칙(필수)
- onclick → `@click`
- 반복 → `v-for`, 조건 → `v-if/v-show`
- DOM 조작(`document.getElementById`) 금지 → ref/reactive로 대체
- Mock 데이터는 `ref([...])` + `// TODO: API 연결`
- `<script setup>` 사용
- 스타일: Tailwind 또는 `<style scoped>`
- CDN 라이브러리 → npm 패키지로 교체

---

## 6) 역할/메뉴/권한

### constants.js (ROLES / MENU_CONFIG)
```js
export const ROLES = {
  SALES_REP: 'SALES_REP',   // 영업사원 (employee)
  ADMIN: 'ADMIN',           // 관리자 (supervisor)
  CLIENT: 'CLIENT',         // 거래처
}

export const MENU_CONFIG = [
  { key: 'dashboard', label: '대시보드', icon: 'dashboard', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/dashboard' },
  { key: 'client-mgmt', label: '거래처 관리', icon: 'business', roles: ['SALES_REP','ADMIN'], route: '/clients' },
  { key: 'employee-mgmt', label: '사원 관리', icon: 'people', roles: ['ADMIN'], route: '/employees' },
  {
    key: 'product', label: '상품', icon: 'inventory', roles: ['SALES_REP','ADMIN','CLIENT'],
    children: [
      { key: 'catalog', label: '카탈로그', route: '/products/catalog' },
      { key: 'favorites', label: '즐겨찾기', route: '/products/favorites' },
      { key: 'compare', label: '비교함', route: '/products/compare' },
      { key: 'register', label: '상품 등록', route: '/products/register', roles: ['ADMIN'] },
    ],
  },
  {
    key: 'document', label: '문서관리', icon: 'description', roles: ['SALES_REP','ADMIN','CLIENT'],
    children: [
      { key: 'doc-create', label: '문서작성', route: '/documents/create', roles: ['SALES_REP'] },
      { key: 'doc-history', label: '히스토리', route: '/documents/history' },
      { key: 'doc-all', label: '모든 문서', route: '/documents/all' },
    ],
  },
  { key: 'note', label: '노트', icon: 'note', roles: ['SALES_REP'], route: '/notes' },
  { key: 'recommendation', label: '재배적기 품종추천', icon: 'eco', roles: ['SALES_REP','ADMIN'], route: '/recommendation' },
  { key: 'pest-map', label: '병해충지도', icon: 'map', roles: ['SALES_REP','ADMIN'], route: '/pest-map' },
  { key: 'statistics', label: '통계', icon: 'bar_chart', roles: ['SALES_REP','ADMIN'], route: '/statistics' },
  { key: 'schedule', label: '일정', icon: 'calendar_today', roles: ['SALES_REP','ADMIN'], route: '/schedule' },
  { key: 'approval', label: '승인', icon: 'check_circle', roles: ['ADMIN'], route: '/approval' },
  { key: 'payment', label: '결제', icon: 'payment', roles: ['CLIENT'], route: '/payment' },
  { key: 'notification', label: '알림', icon: 'notifications', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/notifications' },
  { key: 'settings', label: '설정', icon: 'settings', roles: ['SALES_REP','ADMIN','CLIENT'], route: '/settings' },
]
```

### 라우팅 권한
- 각 라우트에 `meta: { roles: [...] }` 부여
- `beforeEach` 가드: 역할 미선택 → `/login`, 권한 없음 → `/dashboard`

---

## 7) 주의사항(필수)
- 프로토타입에 없는 기능 임의 추가 금지
- Phase 범위 벗어나지 않기
- 이미지 복사: `screen_definition/map/mapimg2.png` → `src/assets/images/mapimg2.png```
