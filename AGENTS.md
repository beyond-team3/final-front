# AGENTS.md — final-front (승인 · 알림 페이지 디자인 수정)

> 이 worktree는 **승인(approval)** 과 **알림(notification)** 페이지의 UI/디자인 개선 전용입니다.
> 백엔드 연결·비즈니스 로직 변경은 이 worktree의 범위가 아닙니다.
> 세션 시작 시 반드시 `AGENTS.md → DESIGN.md` 순으로 읽은 뒤 작업하세요.

---

## ✅ 이 worktree의 작업 범위

- `src/views/approval/` 하위 Vue 파일 디자인 수정
- `src/views/notification/` 하위 Vue 파일 디자인 수정
- 위 페이지에서 사용하는 `src/components/` 공통 컴포넌트의 **스타일 한정** 수정
- DESIGN.md의 컬러 팔레트 · 타이포그래피 적용 및 통일

## ❌ 이 worktree에서 금지되는 작업

- API 호출 로직 변경 (`src/api/` 파일 수정 금지)
- Pinia store 비즈니스 로직 변경
- 라우터 구조 변경
- 승인·알림 외 다른 도메인 파일 변경
- `mock-server/db.json` 데이터 변경

---

## 🖥️ 포트 설정 (이 worktree 전용)

| 서버 | 포트 |
|------|------|
| Vite Dev Server | **5173** |
| Mock Server (json-server) | **3001** |

### vite.config.js 설정 확인
```js
// vite.config.js — 이 worktree에서 반드시 아래 port가 고정되어 있어야 함
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,   // 포트 충돌 시 자동 변경 방지
  }
})
```

### .env.development 설정 확인
```
VITE_API_BASE_URL=http://localhost:3001
```

### Mock 서버 실행
```bash
# 포트 명시 실행 (package.json 스크립트와 무관하게 항상 3001 고정)
npx json-server --watch mock-server/db.json --routes mock-server/routes.json --middlewares mock-server/middleware.js --port 3001
```

---

## 📁 프로젝트 구조 (관련 부분만)

```
final-front/
├── DESIGN.md                        ← 필수 참조: 컬러 팔레트, 컴포넌트 스타일 가이드├── src/
│   ├── views/
│   │   ├── approval/                ← ✏️ 작업 대상
│   │   └── notification/            ← ✏️ 작업 대상
│   ├── components/
│   │   └── common/                  ← 스타일 한정 수정만 허용
│   └── assets/                      ← 이미지·아이콘 추가 허용
└── screen_definition/
    ├── approval/                    ← 프로토타입 HTML (읽기 전용, 디자인 참조용)
    └── notification/                ← 프로토타입 HTML (읽기 전용, 디자인 참조용)
```

---

## 🎨 디자인 작업 체크리스트

세션 시작 전 반드시 확인:
- [ ] `DESIGN.md` 읽기 — 컬러 토큰, 폰트, 버튼/뱃지/테이블 스타일 확인
- [ ] `screen_definition/approval/` 프로토타입 확인
- [ ] `screen_definition/notification/` 프로토타입 확인
- [ ] 현재 구현된 파일과 프로토타입 간 UI 차이 파악

디자인 수정 시 준수 사항:
- Tailwind 유틸리티 클래스 사용, 인라인 style 최소화
- DESIGN.md 에 정의된 컬러 변수(`--color-*`) 또는 Tailwind 커스텀 클래스 사용
- 반응형 고려: `lg:` 브레이크포인트 기준으로 사이드바 레이아웃 대응
- 공통 컴포넌트(ModalBase, DataTable 등) 교체가 아닌 **slot/props 활용** 우선

---

## 📐 역할별 UI 분기 (이 도메인)

| 기능 | 영업사원 | 관리자 | 거래처 |
|------|:---:|:---:|:---:|
| 승인 페이지 | ❌ (미노출) | ✅ | ❌ (미노출) |
| 알림 페이지 | ✅ | ✅ | ✅ |

> `useRole` composable로 역할 분기 처리. 디자인 수정 시 분기 로직 건드리지 말 것.

---

## 📋 코딩 컨벤션

- `<script setup>` 필수
- script 순서: `imports → props/emits → store → ref/reactive → computed → functions → lifecycle`
- DOM 직접 조작 금지 → Vue 반응성 사용
- `console.log` 잔류 금지

---

## 🔚 세션 종료 체크리스트

- [ ] 수정된 파일 목록 출력
- [ ] `npm run dev` (포트 5173) 실행 후 에러 없음 확인
- [ ] 승인·알림 외 파일이 변경되지 않았는지 확인
- [ ] DESIGN.md 컬러 시스템 준수 여부 최종 확인
