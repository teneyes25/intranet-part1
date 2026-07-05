# Changelog

All notable changes to **intranet-part1** (Part 1) are documented here.

## [1.5.1] — 2026-07-05 — 아나바다장터 CRUD · 일정 캘린더

### 아나바다장터
- 게시판명 **아나바다장터** · 물품 등록(글쓰기)·수정·삭제·이미지 첨부 업로드
- `AnabadaFileUpload` 미리보기 · 카드별 수정/삭제 버튼

### 일정 게시판
- 월간 **캘린더** UI (`ScheduleCalendar`)
- `Post.eventStart` / `eventEnd` · 작성 폼 일정 날짜 필드

## [1.5.0] — 2026-07-05 — 게시판 기능 강화 2차

### 게시판 UX/UI
- 리스트/카드 뷰 토글 (`BoardViewToolbar`) · 카드 그리드 `PostListBulk`
- 상세: `PostImageGallery` · `RelatedPosts` · 아나바다 `AnabadaDetailPanel` + 문의 버튼
- 모바일 터치 타겟 (`touch-target-sm`) · `board-card` 스타일

### 상품자료실
- `ProductDetailMeta` — SKU·가격·재고 배지 (Page Builder 상단 레이아웃 유지)
- 통합검색 상품 카드 미리보기 (`ProductPreviewCard`)

### 알림
- 댓글 등록 시 `COMMENT` 알림 + 딥링크 `#comments`
- 30초 폴링 + 탭 포커스 갱신 · `/notifications` 전체 읽음

### 통합검색
- 탭 UI (전체/게시물/상품/사용자/문서·결재) · 사용자 검색
- `cachedUnifiedSearch` 60초 캐시 · DB 검색 인덱스 마이그레이션

### 관리자
- `/admin/board-analytics` — 게시판별 통계·인기 키워드·대리점 활동

## [1.4.0] — 2026-07-05 — 게시판 기능 강화 1차

### 일괄 선택·관리
- 모든 게시판 목록 `PostListBulk` — Gmail 스타일 「선택된 N개」·보기/수정/삭제/카테고리/게시판 이동/라벨/메일함 폴더
- `bulk-actions.ts` — 삭제·카테고리·게시판 간 이동(ADMIN/HEADQUARTER)

### 상품자료실 카테고리
- `/admin/product-categories` — 생성·수정·삭제·Drag & Drop 순서 변경
- 게시물 일괄 이동·글쓰기 폼에 ProductCategory 연동

### 검색 강화 (게시판·통합검색)
- 기간 프리셋(오늘/이번 주/이번 달)·작성자·고급(날짜 범위·첨부·최소 조회수)
- 검색어 하이라이트 · URL 필터 유지

### 아나바다 (`board:anabada`)
- 중고/나눔 게시판 — 가격·판매상태·이미지 그리드 UI · Page Builder 연동
- 글쓰기/수정 폼 price·saleStatus 필드

### 매장 찾기
- 네이버 지도 API `StoreLocator` — 마커·정보창·목록 연동
- ADMIN 대리점 매장 정보(주소·연락처·영업시간·좌표) CRUD

### Schema
- `Post.price`, `Post.saleStatus` · `Dealer` 지도 필드(address, phone, businessHours, lat/lng)

## [1.3.4] — 2026-07-05 — Pilot 운영 · E2E Docker · PRD S-10

### Pilot KPI 실측
- `db:seed-pilot-kpi` — UsageMetric · AuditLog · 공지 viewCount 데모
- KPI 집계: rolloutActive 대리점 기준 (Pilot 그룹 사용자 필터 수정)
- `seed-demo` 완료 후 KPI seed 자동 실행

### E2E Docker
- `scripts/e2e-docker.mjs` — health → smoke → ui-upgrade → ui-phase4
- `npm run test:e2e:docker` · `test:e2e:docker:full` (--full)

### Docs
- PRD Final r2/r3 — Phase 2~4 · S-10 Pilot KPI 캡처 지시
- `HQ_DEPLOYMENT_FINAL_CHECKLIST.md` v1.3.4 갱신

## [1.3.3] — 2026-07-05 — Frontend UX/UI Upgrade Phase 4

### 접근성 (Sheet)
- `SheetContent`: `hideClose` · `autoFocusSelector` · `restoreFocusRef` (열기/닫기 포커스)
- 모바일 메뉴 Sheet: 첫 nav 링크 포커스 · 닫을 때 메뉴 버튼 복원
- Page Builder 미리보기 Sheet: 커스텀 닫기 + 초기 포커스

### Pilot KPI
- PRD v1.2.1 KPI 6종 실측 (`kpi-queries.ts`) — 활성 대리점·공지·PB·AI·에러
- ADMIN 대시보드 `PilotKpiStrip` 위젯 · `/admin/pilot` 모니터링 탭 연동
- Page Builder 저장 시 `page_builder_save` usage 이벤트

### E2E
- `e2e/ui-phase4.spec.ts` — Pilot KPI·Sheet 포커스·metrics API

## [1.3.2] — 2026-07-05 — Frontend UX/UI Upgrade Phase 3

### Page Builder
- localStorage 초안 30초 autosave · 복원 배너 · 저장 시 초안 삭제
- 템플릿 적용·테마/버전 복원 시 `confirmIfDirty` 확인

### 전자결재
- 3단계 FormSteps (양식·제목 → 본문·AI → 결재·제출)
- 단계 이동 시 제목 미입력 toast 안내

### 게시판
- 게시글 상세 모바일 읽기 모드 토글 (`.post-read-mode`)

### E2E
- Page Builder 미리보기·저장 disabled, 메일함 모바일 폴더 이동, 결재 단계 위저드

## [1.3.1] — 2026-07-05 — Frontend UX/UI Upgrade Phase 2

### 접근성 (a11y)
- Skip to content 링크, `#main-content` 포커스 타겟
- 사이드바 `aria-label` · `aria-current="page"`
- 메일함 DnD `aria-live` 스크린리더 안내

### 메일함 UX
- 드래그 핸들 분리(데스크톱) — 링크 클릭과 DnD 충돌 해소
- TouchSensor(280ms) · KeyboardSensor, 드롭 타겟 glow 애니메이션
- 모바일 `MobileFolderMove` 폴더 이동 메뉴

### Page Builder UX
- 저장 전 미리보기 Sheet(데스크톱/태블릿/모바일)
- 미저장 변경 감지 · 페이지/범위 이동 confirm · beforeunload
- 「저장되지 않음」 배지, 변경 없을 때 저장 비활성

### Dark Mode v5
- muted·sidebar-accent·shadow-glow 다크 토큰 정교화
- 채팅·알림·캔버스 그리드 다크 대응

## [1.3.0] — 2026-07-04 — Frontend UX/UI Upgrade Phase 1 (Design System v5)

### Design System v5
- Navy / Blue / Slate 토큰 정리, Pretendard 타이포, focus-visible, safe-area
- `app-topbar` · `app-main` · `board-list-row` · `chat-*` · `notif-item` 공통 유틸
- Mobile-first spacing (`clamp`, KPI 2열, touch-target)

### Page Builder UX
- 편집 흐름 힌트 (페이지 선택 → 템플릿 → 미리보기 → 저장)
- 템플릿 갤러리 CTA·권장 흐름 안내, 툴바 Undo/Redo·기기 미리보기 라벨
- GrapesJS chrome v5, 저장 버튼·툴바 스트립 강조

### 주요 화면
- Dashboard KPI·바로가기, 게시판 목록/메일함 진입, AI Agent 채팅(마크다운·출처·첨부)
- 전자결재 기안 헤더·카드, 대리점 포털 기존 구조 유지 + 공통 토큰 적용

### 공통 컴포넌트
- Sidebar (v1.2.1 · Design v5), Topbar, Notification Bell 패널 폴리싱

## [1.2.1] — 2026-06-30 — Phase 5 상용화 MVP 마무리 (Firebase 제외)

### Phase 5 완료
- **Backlog 정리**: E2E(read-only/dealer scope), `grids` JSON strip, PAGE_BUILDER·배포 문서 완성
- **게시판·네비 재구성**: 공지 · 일정 · 업계 뉴스 · 홍보실 · 상품자료실 · 매장 찾기
- **모듈 숨김 토글** (`nav-modules.ts`): 문서함·근태·전자결재·통합검색 — 라우트 유지, 메뉴만 off
- **French Maison 회사 테마** (`company-theme`) — `pageBuilderConfig` JSON, DB 스키마 변경 없음
- **Firebase 하이브리드 통합** (Auth·Storage·Firestore·FCM) — **`FIREBASE_ENABLED=false` 기본**, PostgreSQL 중심 운영
- **본사 배포 문서**: `docs/HQ_DEPLOYMENT_FINAL_CHECKLIST.md`, `MVP_DEPLOYMENT_CHECKLIST.md` v1.2.1

### 안정화
- `npm run typecheck` · `lint` · `production-check` · `smoke` 기준 정리
- Firebase 미설정 시 기존 Credentials 로그인·로컬 업로드·알림 폴링 100% 유지

### Docs
- `docs/HQ_DEPLOYMENT_FINAL_CHECKLIST.md` — 본사 서버 배포 최종 체크리스트
- `docs/FIREBASE_HYBRID.md` — 배포 후 Firebase 활성화 가이드

## [1.2.0] — 2026-06-30 — UI/UX 대대적 개선 (Design System v4)

### Design System v4 — Premium B2B SaaS
- 컬러 팔레트 완성: Navy `#0F172A`, Blue `#2563EB`, Slate Gray 계열 CSS 변수 통일
- Typography / Spacing / Shadow / Border 토큰 체계 (`--shadow-xs` ~ `--shadow-glow`, `--radius-*`)
- `PageHero` 컴포넌트 — Navy 그라데이션 히어로 + Plain 변형
- `app-canvas-bg` 미세 그리드 배경, `page-shell` / `b2b-*` 유틸 클래스

### shadcn/ui 전면 리파인
- Button, Card, Input, Badge, Sheet 스타일 업그레이드
- Table 컴포넌트 신규 추가
- StatCard KPI 카드 프리미엄 리디자인

### 우선 화면 개선
- **Dashboard**: PageHero, KPI strip, 카드 헤더·바로가기 polish
- **Dealer Portal**: 히어로, 빠른 작업 그리드, 주문 Table
- **Page Builder**: 히어로 + chrome 래퍼, GrapesJS Navy 패널·블록 UI
- **상품 상세**: products 보드 전용 wide layout, 프리미엄 헤더

## [1.1.1] — 2026-06-29 — B2B 상용화 업그레이드

### Page Builder (GrapesJS Best Practices)
- 컴포넌트 타입 + Traits 기반 블록 (`grapes-component-types.ts`) — 히어로, 상품 헤더, 거래 위젯, 라이브 공지
- 캔버스 디자인 토큰 앱 셸과 동기화 (`canvas-design-tokens.ts`)
- 에디터 1회 초기화 + slug/scope 변경 시 증분 로드 (성능)
- 블록 패널 UI·카테고리 상용 스타일

### B2B Commerce & Self-Service
- 거래 모듈 React 하이드레이션 (`layout-content-hydrator.tsx`, `commerce-module-card.tsx`)
- `/commerce` 허브 + 발주서·세금계산서·결제·계약 Preview 페이지
- 대리점 포털 실데이터 연동 (주문·재고·공지 KPI)
- 네비: 대리점 포털, 거래 모듈, 페이지 편집

### UI/UX
- Modern B2B 유틸 클래스 (`b2b-kpi-strip`, `b2b-section-eyebrow`)
- 상품 상세 전용 블록 (헤더, 갤러리, 스펙, CTA)

## [1.1.0] — 2026-06-28 — Page Builder 상용화 (MVP)

### Added — Visual Page Builder (GrapesJS)
- **GrapesJS Visual Page Builder** — `/admin/customize/page-builder`
- **Slug 기반 레이아웃**: `dashboard`, `banner`, `board:{key}`, `post-detail:{boardKey}`, `post-detail:{postId}`
- **대리점 Self-Service**: DEALER 자사 scope 자동 잠금, ADMIN 전체 관리
- **HEADQUARTER read-only**: 미리보기·템플릿 프리뷰만, 저장/적용/복원 차단
- **템플릿 갤러리**: 9+ built-in, HTML 썸네일, projectData+HTML 동시 저장
- **버전 관리**: 저장 시 자동 백업, 최대 3버전
- **Undo/Redo**, 기기 미리보기(데스크톱/태블릿/모바일), 한국어 UI
- **게시글별 상세 레이아웃** + 에디터 내 게시글 검색
- **대리점 테마** 동기화 (`dealer-themes.ts`)

### Changed
- 레거시 그리드 Page Builder UI·렌더 fallback **완전 제거**
- `pageBuilderConfig.grids` **deprecated** — parse 시 strip, 마이그레이션 후 DB 정리
- 커스터마이징 센터 Page Builder 탭 → GrapesJS Visual Editor 링크

### Part 2 (미포함 — 플레이스홀더만)
- 발주서·세금계산서·카드결제·표준계약서 **블록** (`data-commerce-module`) — Part 2 Order/Payment/Contract 모듈 연동 예정
- `src/features/commerce/parse-layout-modules.ts` — Part 2 연동 준비 코드만 유지

### Docs & QA
- `docs/PAGE_BUILDER.md` Phase 5 최종판
- `docs/MVP_DEPLOYMENT_CHECKLIST.md` — 본사 서버 MVP 배포 체크리스트
- E2E: Page Builder admin/HQ read-only/dealer scope (ui-upgrade.spec.ts)

[1.1.0]: https://github.com/company/intranet-part1/releases/tag/v1.1.0-page-builder

---

## [1.0.0] — 2026-06-23 — Product Ready

### Added
- **Core:** 게시판(다중 보드), 전자결재, AI 에이전트(RAG), 통합 검색, 문서함, 근태
- **Admin:** 사용자/대리점 관리, 커스터마이징, Pilot, 시스템 상태, **실시간 모니터링**
- **Production:** 비밀번호 강제 변경, 긴급 공지, 백업 자동화, Nginx 보안 헤더
- **Rollout:** 100개 대리점 5그룹 단계 배포, `/admin/rollout`, `/help/dealer`
- **Part 2 foundation:** `/api/v2` — Order, Payment, Shipment, Inventory, DealerTrade
- **Docs:** DEPLOY.md, ADMIN_MANUAL.md, USER_MANUAL.md, E2E phase1~9

### Security
- Redis rate limiting, CORS, CSP (Nginx 중심), Audit log, 업로드 정책

### Infrastructure
- Docker Compose (PostgreSQL+pgvector, Redis, App, Nginx)
- Prisma migrations (production-safe baseline → phase9)
- Load test 200 concurrent, smoke/final-check scripts

### Part 2 Roadmap
- 결제 PG 연동, 배송 추적 API, 재고 자동 차감, 모바일 앱

[1.0.0]: https://github.com/company/intranet-part1/releases/tag/v1.0.0-product-ready
