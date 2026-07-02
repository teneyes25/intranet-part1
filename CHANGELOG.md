# Changelog

All notable changes to **intranet-part1** (Part 1) are documented here.

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
