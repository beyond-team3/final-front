# Progress Log

## 2026-03-15

### FRT-87 api-v2 테스트 분기 추가
- 상태: 진행 기록 완료
- 목적:
  - 기존 `v1` 화면과 `/api/v1` 기본 동작은 유지
  - 대상 API만 flag 기반으로 `/api/v2` 절대 경로를 선택적으로 테스트
- 적용 범위:
  - deal 목록/상세/documents/notifications/schedules/kpis
  - quotation 생성/재작성/취소
  - contract 생성/재작성/취소
  - billing revenue 통계 3종
- 비적용 범위:
  - RFQ, ORD, STMT, INV, PAY
  - 일반 매출 추이/랭킹 통계
  - 전역 axios `baseURL`
- 안전장치:
  - `.env.development`, `.env.production` 에서 아래 flag 기본값을 모두 `false`로 유지
  - `VITE_ENABLE_PIPELINE_V2`
  - `VITE_USE_DEAL_V2`
  - `VITE_USE_QUOTATION_V2`
  - `VITE_USE_CONTRACT_V2`
  - `VITE_USE_BILLING_STATS_V2`
- 롤백 기준:
  - 기능 롤백이 필요하면 이번 작업의 `FRT-87` 기능 커밋만 우선 revert
  - 진행 로그까지 함께 되돌려야 하면 문서 커밋도 추가로 revert
- 검증:
  - `npm run build` 성공

### 롤백 메모
- 기능 커밋 해시: `92af90a`
- 문서 커밋 해시:
  - `66dc8f8` (`FRT-87 docs(progress): 롤백 해시 기록 보정`)
  - `d475855` (`FRT-87 docs(progress): api v2 테스트 롤백 메모 추가`)
- 권장 순서:
  - `git revert 66dc8f8`
  - `git revert d475855`
  - `git revert 92af90a`

### FRT-87 문서 상세/승인 조회 경로 정리
- 상태: 진행 기록 완료
- 목적:
  - 존재하지 않는 공통 문서 상세 경로 `/api/v1/documents/{id}` 호출 제거
  - 문서 타입별 상세 API만 사용
  - 승인 알림 진입 시 `approvalId`와 `documentId` 혼용으로 발생하던 AP002 경로 제거
- 적용 범위:
  - 문서 상세 store/type dispatcher
  - 히스토리 상세 모달
  - 승인 화면 알림 진입
  - 알림 store / 알림 라우팅
- 안전장치:
  - 타입 미확정 시 공통 문서 상세 API로 fallback 하지 않음
  - approvalId가 확인되지 않으면 승인 상세 자동 조회를 중단하고 안내 메시지 표시
- 롤백 기준:
  - 이 작업만 되돌릴 경우 문서 상세/승인 조회 관련 기능 커밋만 우선 revert
  - 진행 로그까지 함께 되돌릴 경우 본 문서 커밋도 추가로 revert
- 검증:
  - `npm run build` 성공

### FRT-87 청구서 역할 분리
- 상태: 진행 기록 완료
- 목적:
  - 관리자는 수동 청구서 초안 생성과 조회만 가능하게 제한
  - 영업사원은 담당 범위의 DRAFT 청구서를 조회하고 발행 가능하게 정리
- 적용 범위:
  - 청구서 목록 페이지
  - 청구서 상세 페이지
  - 문서 store의 영업사원 문서 필터 완화
- 안전장치:
  - 관리자 화면에서 publish 버튼/호출 제거
  - 영업사원 화면에서 `status === DRAFT`일 때만 publish 액션 노출
  - 생성/발행 후 청구서 목록 재조회
- 롤백 기준:
  - 역할 분리만 되돌릴 경우 청구서 관련 기능 커밋만 우선 revert
  - 진행 로그까지 함께 되돌릴 경우 본 문서 커밋도 추가로 revert
- 검증:
  - `npm run build` 성공
