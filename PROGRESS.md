# PROGRESS

## 프로젝트 진행 현황
- 기준 문서: `AGENTS.md`
- 마지막 업데이트: `2026-02-15`
- 현재 완료 Phase: **Phase 1 ~ Phase 11**
- 다음 시작 Phase: **Phase 12 (통합 테스트 + 정리)**

## 완료된 Phase

### Phase 1: 의존성 + 기본 설정 ✅
- `package.json` 의존성 보강
- `tailwind.config.js`, `postcss.config.js` 생성
- `src/utils/constants.js` 생성 (ROLES / MENU_CONFIG)
- `src/assets/styles/global.css` 생성
- `src/main.js`에 Router/Pinia/Global CSS 연결
- AGENTS 기준 디렉터리 구조 생성

### Phase 2: 라우터 + auth store + 레이아웃 + 로그인 ✅
- `src/router/index.js` 기본 라우트/권한 가드 구축
- `src/stores/auth.js` 생성
- `src/views/auth/LoginView.vue` 생성
- `src/layouts/SalesRepLayout.vue`, `src/layouts/AdminLayout.vue`, `src/layouts/ClientLayout.vue`
- `src/components/common/AppSidebar.vue`, `src/components/common/AppHeader.vue`

### Phase 3: 공통 컴포넌트 추출 ✅
- `src/components/common/DataTable.vue`
- `src/components/common/SearchFilter.vue`
- `src/components/common/ModalBase.vue`
- `src/components/common/StatusBadge.vue`
- `src/components/common/PageHeader.vue`
- `src/components/common/CardBase.vue`
- `src/components/common/TabNav.vue`

### Phase 4: 대시보드 ✅
- `src/views/dashboard/SalesRepDashboard.vue`
- `src/components/dashboard/DashboardCalendar.vue`
- `src/components/dashboard/DashboardReference.vue`
- `src/views/dashboard/AdminDashboard.vue`
- `src/views/dashboard/ClientDashboard.vue`
- 라우터 대시보드 role 분기 연결

### Phase 5A: 거래처 관리 ✅
- `src/views/client-mgmt/ClientListView.vue`
- `src/views/client-mgmt/ClientDetailView.vue`
- `src/views/client-mgmt/AdminClientListView.vue`
- `src/views/client-mgmt/AdminClientDetailView.vue`
- `src/views/client-mgmt/ClientRegisterView.vue`
- `src/stores/client.js`

### Phase 5B: 사원/사용자 관리 ✅
- `src/views/employee-mgmt/EmployeeRegisterView.vue`
- `src/views/user/UserListView.vue`
- `src/views/user/UserDetailView.vue`
- `src/views/user/UserRegisterView.vue`
- `src/stores/employee.js`
- 라우터 사용자/거래처 상세 경로 실컴포넌트 연결

### Phase 6A: 상품 — 관리자 계열 ✅
- `src/stores/product.js`
- `src/views/product/AdminCatalogView.vue`
- `src/views/product/AdminProductDetailView.vue`
- `src/views/product/AdminCompareView.vue`
- `src/views/product/AdminFavoritesView.vue`
- `src/views/product/ProductRegisterView.vue`
- 라우터 관리자 상품 경로 실컴포넌트 연결

### Phase 6B: 상품 — 거래처 계열 + 유사도 + 피드백 ✅
- `src/views/product/ClientCatalogView.vue`
- `src/views/product/ClientProductDetailView.vue`
- `src/views/product/ClientCompareView.vue`
- `src/views/product/ClientFavoritesView.vue`
- `src/views/product/ProductFeedbackView.vue`
- `src/views/product/SimilarityAnalysisView.vue`
- `src/stores/product.js` 확장(유사도/피드백 상태 및 함수)
- 라우터 거래처/공통 상품 경로 실컴포넌트 연결

### Phase 7: 문서관리 ✅
- `src/views/document/QuotationRequestView.vue`
- `src/views/document/QuotationView.vue`
- `src/views/document/ContractView.vue`
- `src/views/document/OrderView.vue`
- `src/components/document/OrderModal.vue`
- `src/views/document/InvoiceView.vue`
- `src/views/document/InvoiceListView.vue`
- `src/stores/document.js` 생성

### Phase 8: 영업 히스토리 + 파이프라인 ✅
- `src/views/history/SalesHistoryView.vue`
- `src/views/history/PipelineDetailView.vue`
- `src/views/history/DocumentListView.vue`
- `src/components/history/HistoryTemplate.vue`
- `src/components/history/AdminHistoryTemplate.vue`
- `src/components/history/HistoryModal.vue`

### Phase 9: 노트 ✅
- `src/views/note/NoteView.vue`
- `src/views/note/AINotesView.vue`
- `src/views/note/ClientNoteView.vue`
- `src/views/note/ProductNoteView.vue`
- `src/stores/note.js`

### Phase 10: 유틸리티 기능 ✅
- `src/views/recommendation/CropRecommendView.vue`
- `src/views/pest-map/PestMapView.vue`
- `src/views/statistics/SalesRepStatsView.vue`
- `src/views/statistics/AdminStatsView.vue`
- `src/views/schedule/CalendarView.vue`
- 이미지 복사: `screen_definition/map/mapimg2.png` -> `src/assets/images/mapimg2.png`
- 차트 CDN 제거 및 `chart.js` 모듈 import 방식으로 변환
- 라우터 연결: `/recommendation`, `/pest-map`, `/statistics`, `/schedule`

## 남은 TODO

### Phase 11: 역할 전용 + 공통 기능 ✅
- `src/views/approval/ApprovalView.vue`
- `src/views/payment/PaymentView.vue`
- `src/views/notification/SalesRepNotificationView.vue`
- `src/views/notification/AdminNotificationView.vue`
- `src/views/notification/ClientNotificationView.vue`
- `src/views/settings/MyPageView.vue`
- `src/views/settings/ClientMyPageView.vue`
- `src/stores/notification.js`
- 라우터 연결: `/approval`, `/payment`, `/notifications`, `/settings`
- `npm run build` 성공 확인

### Phase 12: 통합 테스트 + 정리 ⬜
- 전체 라우팅 흐름 점검 (3개 역할)
- 권한 가드 동작 점검
- 콘솔 에러 제거 및 import 정리
- `npm run build` 최종 검증
- `README.md` 업데이트

## 메모
- 실행 환경 제한으로 `npm run dev`는 `EPERM (127.0.0.1:5173)`가 발생 가능.
- 빌드 검증: `npm run build` 성공 확인.
