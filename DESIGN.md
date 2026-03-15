# SeedFlow+ 컬러 팔레트 가이드

> 이 문서는 SeedFlow+ UI 개발 시 일관된 색상 사용을 위한 공식 컬러 가이드입니다.
> 모든 UI 수정 및 신규 화면 개발 시 반드시 이 팔레트를 따르세요.

---

## 1. 설계 원칙

SeedFlow+의 컬러 시스템은 **"따뜻한 베이지 기반의 자연스러운 레이어 뎁스"** 를 핵심으로 합니다.

- 배경 → 카드 → 인풋 순으로 3단계 밝기 뎁스를 유지합니다.
- 모든 레이어는 베이지 계열 안에서 해결합니다. 흰색(`#FFFFFF`) 사용을 지양합니다.
- 포인트 컬러(올리브, 주황)는 강조 요소에만 제한적으로 사용합니다.
- 텍스트는 순수 검정 대신 따뜻한 다크브라운 계열을 사용합니다.

---

## 2. CSS 변수 정의

모든 색상은 아래 CSS 변수로 관리합니다. 하드코딩 금지.

```css
:root {
  /* ── Background Layers ── */
  --color-bg-base: #EDE8DF;        /* 앱 전체 배경 */
  --color-bg-sidebar: #E4DDD2;     /* 사이드바 배경 */
  --color-bg-card: #F7F3EC;        /* 카드 / 보드 */
  --color-bg-section: #EFEADF;     /* 카드 내 섹션 구분 */
  --color-bg-input: #FAF7F3;       /* 인풋 / 폼 필드 */

  /* ── Primary: Olive ── */
  --color-olive: #7A8C42;          /* 주 포인트 (버튼, 뱃지, 아이콘) */
  --color-olive-light: #C8D4A0;    /* 연한 올리브 (태그 배경, 강조 영역) */
  --color-olive-dark: #586830;     /* 진한 올리브 (hover, active 상태) */

  /* ── Secondary: Orange ── */
  --color-orange: #C8622A;         /* 보조 포인트 (알림, CTA) */
  --color-orange-light: #F0C9A8;   /* 연한 주황 (알림 박스 배경) */
  --color-orange-dark: #A34E20;    /* 진한 주황 (hover, active 상태) */

  /* ── Text ── */
  --color-text-strong: #3D3529;    /* 제목, 강조 텍스트 */
  --color-text-body: #6B5F50;      /* 본문 기본 텍스트 */
  --color-text-sub: #9A8C7E;       /* 보조 텍스트, 레이블 */
  --color-text-placeholder: #BFB3A5; /* 비활성, 플레이스홀더 */

  /* ── Border & Divider ── */
  --color-border-card: #DDD7CE;    /* 카드 테두리 */
  --color-border-divider: #E8E3D8; /* 섹션 구분선 */

  /* ── Status ── */
  --color-status-success: #7A8C42; /* 성공 = 올리브 재활용 */
  --color-status-warning: #C8622A; /* 경고 = 주황 재활용 */
  --color-status-info: #8A9BAE;    /* 정보 (차분한 블루그레이) */
  --color-status-error: #B85C5C;   /* 오류 (따뜻한 레드) */
}
```

---

## 3. 배경 레이어 뎁스

레이어 순서를 반드시 지켜 자연스러운 깊이감을 만드세요.

```
Level 0  앱 전체 배경   #EDE8DF  --color-bg-base
   ↓
Level 1  카드 / 보드    #F7F3EC  --color-bg-card       (배경보다 약간 밝음)
   ↓
Level 2  카드 내 섹션   #EFEADF  --color-bg-section    (중간 뎁스)
   ↓
Level 3  인풋 / 폼      #FAF7F3  --color-bg-input      (가장 밝은 레이어)
```

> ⚠️ **주의**: 카드에 `#FFFFFF` 흰색 사용 금지. 배경과 명도차가 커져 "카드가 붕 뜨는" 현상이 발생합니다.

---

## 4. 포인트 컬러 사용 규칙

### 올리브 (`--color-olive`)
- ✅ 주요 버튼 (Primary Button)
- ✅ 활성 메뉴 표시
- ✅ 문서 상태 뱃지 (계약, 완료)
- ✅ 캘린더 이벤트 태그
- ❌ 배경 전체에 넓게 사용 금지

### 주황 (`--color-orange`)
- ✅ 보조 버튼 (Secondary CTA), 로그아웃 버튼
- ✅ 수확 시즌 알림 등 중요 알림
- ✅ 견적 요청 등 액션 유도 태그
- ❌ 올리브와 동시에 근접 배치 자제 (색 충돌)

### 연한 컬러 (light variants)
- `--color-olive-light` : 태그 배경, 선택된 필터 칩
- `--color-orange-light` : 알림 박스 배경, 수확 시즌 알림 카드

---

## 5. 텍스트 사용 규칙

| 용도 | 변수 | 예시 |
|------|------|------|
| 페이지 제목, 카드 제목 | `--color-text-strong` | "캘린더", "영업 문서" |
| 본문, 리스트 항목 | `--color-text-body` | 거래처명, 상품명 |
| 레이블, 날짜, 메타정보 | `--color-text-sub` | "전체", "2026.02" |
| 비활성 항목, 플레이스홀더 | `--color-text-placeholder` | "검색어를 입력하세요" |

> 순수 `#000000` 또는 `#333333` 사용 금지. 항상 따뜻한 계열 변수를 사용하세요.

---

## 6. 보더 & 그림자

```css
/* 카드 기본 스타일 */
.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-card);
  border-radius: 12px;
  /* box-shadow는 최소화. 필요 시 아래만 허용 */
  box-shadow: 0 1px 3px rgba(61, 53, 41, 0.06);
}

/* 섹션 구분선 */
.divider {
  border-color: var(--color-border-divider);
}
```

> 진한 `box-shadow` 사용 시 카드가 어두워 보이는 원인이 됩니다. 그림자 대신 `border`로 구분하세요.

---

## 7. 상태(Status) 컬러

| 상태 | 변수 | 배경 적용 시 |
|------|------|------------|
| 성공 / 완료 | `--color-status-success` (`#7A8C42`) | `--color-olive-light` |
| 경고 / 주의 | `--color-status-warning` (`#C8622A`) | `--color-orange-light` |
| 정보 | `--color-status-info` (`#8A9BAE`) | `#D6DDE6` |
| 오류 | `--color-status-error` (`#B85C5C`) | `#F0D4D4` |

---

## 8. 컴포넌트별 빠른 참조

### 버튼
```css
/* Primary */
background: var(--color-olive);
color: #FFFFFF;

/* Primary Hover */
background: var(--color-olive-dark);

/* Secondary (CTA, 로그아웃 등) */
background: var(--color-orange);
color: #FFFFFF;

/* Ghost */
background: transparent;
border: 1px solid var(--color-border-card);
color: var(--color-text-body);
```

### 인풋 / 드롭다운
```css
background: var(--color-bg-input);
border: 1px solid var(--color-border-card);
color: var(--color-text-body);

/* Focus */
border-color: var(--color-olive);
```

### 캘린더 이벤트 태그
```css
/* 계약 계열 */
background: var(--color-olive-light);
color: var(--color-olive-dark);

/* 견적 계열 */
background: var(--color-orange-light);
color: var(--color-orange-dark);

/* 개인 일정 */
background: var(--color-bg-section);
color: var(--color-text-body);
```

### 사이드바
```css
background: var(--color-bg-sidebar);

/* 활성 메뉴 */
color: var(--color-olive);
font-weight: 600;

/* 비활성 메뉴 */
color: var(--color-text-sub);
```

---

## 9. 금지 사항 체크리스트

UI 수정 전 아래 항목을 반드시 확인하세요.

- [ ] 카드/보드 배경에 `#FFFFFF` 사용하지 않았는가?
- [ ] 텍스트에 `#000000` 또는 `#333333` 사용하지 않았는가?
- [ ] CSS 변수를 우회한 하드코딩 색상을 쓰지 않았는가?
- [ ] 올리브와 주황을 좁은 영역에 나란히 배치하지 않았는가?
- [ ] `box-shadow`가 과도하게 진하지 않은가? (`rgba` 투명도 0.1 이하 권장)
- [ ] 배경 레이어 뎁스 순서(base → card → section → input)를 지켰는가?

---

*마지막 수정: 2026.03 | SeedFlow+ Design System*
