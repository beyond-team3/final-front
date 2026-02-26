# final-front

## 실행
- 개발 서버: `npm run dev`
- 프로덕션 빌드: `npm run build`
- 미리보기: `npm run preview`

## Commit Convention
[리니어ID] type(scope): subject

### type
- feat     : 새로운 기능 추가
- fix      : 버그 수정
- refactor : 기능 변화 없는 코드 구조 개선
- docs     : 문서 수정
- test     : 테스트 코드 추가/수정
- design   : CSS 등 UI/디자인 변경
- chore    : 빌드, 설정, 기타 작업

### scope
- 변경된 기능 및 분야
- 예: login, transaction, cashflow, readme

### subject
- 변경 내용을 간결하게 작성
- 예: controller 초안 작성

### example
> FRT-13 design(transaction): 캘린더 폰트 변경

## Phase 12 점검 요약
- 라우팅/권한 가드(`beforeEach`) 점검 완료
- 역할별 시나리오 경로 점검 완료
- `src/` 내 `console.log`, `debugger` 없음 확인
- `npm run build` 성공 확인

## 참고
- 현재 일부 제한된 실행 환경에서는 포트 바인딩 권한으로 인해 `npm run dev`가 `listen EPERM`으로 실패할 수 있음
