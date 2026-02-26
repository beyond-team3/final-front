# API Specification (Frontend Contract)

이 문서는 현재 프론트엔드에서 사용하는 API 계약을 정리한 문서입니다.
백엔드 연동 전까지는 각 `src/api/*.js`에서 Mock(`Promise.resolve`)으로 동작하며,
백엔드 연동 시 해당 파일 내부만 `api.get/post/put/delete`로 교체합니다.

## 공통

- Base URL: `VITE_API_BASE_URL` (기본값: `/api`)
- 공통 클라이언트: `src/api/index.js`
- 요청 인터셉터: `Authorization: Bearer <token>` 주입(예정)
- 응답 인터셉터: `401`, `403` 공통 처리 훅(예정)

---

## auth.js (인증)

- `login(credentials)`
  - `POST /auth/login`
- `logout()`
  - `POST /auth/logout`
- `getMyInfo()`
  - `GET /auth/me`

## dashboard.js (대시보드)

- `getSalesRepDashboard()`
  - `GET /dashboard/sales-rep`
- `getAdminDashboard()`
  - `GET /dashboard/admin`
- `getClientDashboard()`
  - `GET /dashboard/client`

## client.js (거래처 관리)

- `getClients(params)`
  - `GET /clients`
- `getClientDetail(id)`
  - `GET /clients/:id`
- `createClient(data)`
  - `POST /clients`
- `updateClient(id, data)`
  - `PUT /clients/:id`
- `addClientVariety(id, data)`
  - `POST /clients/:id/varieties`

## employee.js (사원 관리)

- `getEmployees(params)`
  - `GET /employees`
- `getEmployeeDetail(id)`
  - `GET /employees/:id`
- `createEmployee(data)`
  - `POST /employees`
- `updateEmployee(id, data)`
  - `PUT /employees/:id`

## product.js (상품)

- `getProducts(params)`
  - `GET /products`
- `getProductDetail(id)`
  - `GET /products/:id`
- `createProduct(data)`
  - `POST /products`
- `updateProduct(id, data)`
  - `PUT /products/:id`
- `getSimilarProducts(id)`
  - `GET /products/:id/similarity`
- `getFavorites()`
  - `GET /products/favorites`
- `addFavorite(productId)`
  - `POST /products/favorites`
- `removeFavorite(productId)`
  - `DELETE /products/favorites/:id`
- `getCompareList()`
  - `GET /products/compare`
- `addToCompare(productId)`
  - `POST /products/compare`
- `removeFromCompare(productId)`
  - `DELETE /products/compare/:id`
- `submitFeedback(data)`
  - `POST /products/:id/feedback`

## document.js (문서 관리)

- `createQuotationRequest(data)`
  - `POST /documents/quotation-request`
- `createQuotation(data)`
  - `POST /documents/quotation`
- `createContract(data)`
  - `POST /documents/contract`
- `createOrder(data)`
  - `POST /documents/order`
- `createStatement(data)`
  - `POST /documents/statement`
- `createInvoice(data)`
  - `POST /documents/invoice`
- `getDocuments(params)`
  - `GET /documents`
- `getDocumentDetail(id)`
  - `GET /documents/:id`

역할별 작성 권한:
- 영업사원: 견적서, 계약서, 명세서, 청구서
- 거래처: 견적 요청서, 주문서
- 관리자: 작성 없음(조회 전용)

## history.js (영업 히스토리)

- `getSalesHistory(params)`
  - `GET /history/sales`
- `getPipelineDetail(id)`
  - `GET /history/pipeline/:id`
- `getSalesDocuments(contractId)`
  - `GET /history/:contractId/documents`

## note.js (노트)

- `getNotes(params)`
  - `GET /notes`
- `createNote(data)`
  - `POST /notes`
- `searchNotes(params)`
  - `GET /notes/search`
- `getAIBriefing(clientId)`
  - `GET /notes/ai-briefing/:clientId`
- `getClientNote(clientId)`
  - `GET /notes/client/:clientId`

## recommendation.js (재배적기 품종추천)

- `getRecommendations(params)`
  - `GET /recommendations`

## pestMap.js (병해충지도)

- `getPestMapData(params)`
  - `GET /pest-map`

## statistics.js (통계)

- `getSalesRepStats(params)`
  - `GET /statistics/sales-rep`
- `getAdminStats(params)`
  - `GET /statistics/admin`
- `getStatsByEmployee(params)`
  - `GET /statistics/by-employee`
- `getRanking(params)`
  - `GET /statistics/ranking`

## schedule.js (일정)

- `getSchedules(params)`
  - `GET /schedules`
- `getSchedulesByDate(date)`
  - `GET /schedules?date=`
- `createSchedule(data)`
  - `POST /schedules`
- `updateSchedule(id, data)`
  - `PUT /schedules/:id`
- `deleteSchedule(id)`
  - `DELETE /schedules/:id`

## approval.js (승인)

- `getApprovalList(params)`
  - `GET /approvals`
- `approveRequest(id)`
  - `PUT /approvals/:id/approve`
- `rejectRequest(id, reason)`
  - `PUT /approvals/:id/reject`

## payment.js (결제)

- `getPayments(params)`
  - `GET /payments`
- `processPayment(data)`
  - `POST /payments`

## notification.js (알림)

- `getNotifications(params)`
  - `GET /notifications`
- `markAsRead(id)`
  - `PUT /notifications/:id/read`
- `markAllAsRead()`
  - `PUT /notifications/read-all`

## user.js (사용자/마이페이지)

- `getUsers(params)`
  - `GET /users`
- `getUserDetail(id)`
  - `GET /users/:id`
- `createUser(data)`
  - `POST /users`
- `updateMyPage(data)`
  - `PUT /users/me`

---

## 구현 현황 (2026-02-16)

- 구현 완료 파일
  - `src/api/index.js`
  - `src/api/client.js`
  - `src/api/employee.js`
- 나머지 도메인 파일은 동일 패턴으로 순차 추가 예정

