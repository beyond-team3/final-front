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
