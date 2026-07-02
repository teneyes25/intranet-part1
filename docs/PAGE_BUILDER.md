# Page Builder (GrapesJS) — 상용화 운영 가이드 (Phase 5 최종)

## 개요

GrapesJS 기반 Visual Page Builder는 **현재 페이지를 수정·커스터마이징**하는 방식으로 동작합니다.  
저장 시 **GrapesJS `projectData` + HTML + CSS**가 함께 기록되며, 재편집 시 projectData를 우선 로드합니다.

## 렌더링 우선순위

1. **GrapesJS 레이아웃** (`page_layouts`) — 대리점 오버라이드 → 없으면 **본사 (`global`)**
2. **게시글 상세**: `post-detail:{postId}` → `post-detail:{boardKey}` → 기본 UI
3. 기본 UI (위젯·게시판 기본 헤더 등)

> 레거시 그리드 UI·렌더 fallback은 **제거**되었습니다.  
> 남은 레거시 JSON은 `/admin/customize` → 「레거시 그리드 마이그레이션」으로 GrapesJS로 이전하세요.  
> 마이그레이션 후 `pageBuilderConfig.grids`는 DB에서 **자동 strip** 됩니다.

## Slug 규칙

| Slug | 페이지 |
|------|--------|
| `dashboard` | 대시보드 상단 |
| `banner` | 메인 배너 오버레이 |
| `board:{key}` | 게시판 목록 상단 |
| `post-detail:products` / `post-detail:pr` | 게시판 단위 상세 상단 |
| `post-detail:{postId}` | **개별 게시글** 상세 상단 |

- `dealerId = "global"` → 본사
- `dealerId = {대리점ID}` → 대리점 전용

## 권한

| 역할 | Page Builder | 저장·적용 |
|------|--------------|-----------|
| **ADMIN** | `/admin/customize/page-builder` | 본사 global + 모든 대리점 ✅ |
| **DEALER** (dealerId 필수) | 동일 경로 | **자사 대리점만** ✅ (scope 자동 잠금) |
| **HEADQUARTER** | 동일 경로 | **미리보기 전용** ❌ (조회·템플릿 미리보기만) |
| 기타 | 접근 불가 | — |

- 네비: DEALER → **도구 → 페이지 편집**, HEADQUARTER → **도구 → 페이지 미리보기**

## 템플릿 갤러리

- HTML **썸네일 미리보기** (scaled HTML)
- built-in 템플릿에 **projectData 시드** 포함 (`template-project-data.ts`)
- `미리보기` / `적용 후 저장` — projectData 우선, 실패 시 HTML fallback

## 에디터 기능

- **Undo / Redo** — 최대 64단계
- **버전 관리** — 저장 시 자동 백업, **최대 3버전**
- **기기 미리보기** — 데스크톱 / 태블릿 / 모바일
- **게시글별 상세** — 검색 + products·pr 최근 게시글 버튼
- **한국어 UI**

## 커스텀 블록

### 레이아웃·인트라넷
히어로, 배너, 카드 그리드, 카드, 추천사, AI 위젯, 공지 목록, 버튼, 갤러리

### 상거래·거래 (Part 2 — **플레이스홀더만**)

| 블록 | `data-commerce-module` | Part 2 |
|------|------------------------|--------|
| 발주서 | `order` | Order 모듈 |
| 세금계산서 | `tax-invoice` | TaxInvoice 모듈 |
| 카드결제 | `payment` | Payment 모듈 |
| 표준계약서 | `contract` | Contract 모듈 |

> **Part 1에는 거래 기능(페이지·API)을 포함하지 않습니다.**  
> 블록은 dashed 플레이스홀더로만 제공되며, Part 2에서 `parseCommerceModulesFromHtml` + API 연동 예정.

## site-settings · 레거시 JSON

| 필드 | 상태 |
|------|------|
| `pageBuilderConfig.banner` / `prHeader` / `dashboard` | ✅ 유지 (텍스트·위젯 설정) |
| `pageBuilderConfig.grids` | ⚠️ **deprecated** — parse 시 strip, 마이그레이션 전용 |

## 관리자·대리점 경로

- Visual Editor: `/admin/customize/page-builder`
- 커스터마이징 센터: `/admin/customize` (ADMIN)
- 레거시 마이그레이션: `/admin/customize` → Page Builder 탭

## 보안

- HTML 렌더링 전 `sanitize-html` 적용
- `assertDealerScopeAllowed` + `assertCanMutatePageLayout` (read-only 차단)
- 감사 로그: `page_layout:{slug}:{dealerId}`

## Phase 5 완료 체크리스트

- [x] Backlog 7항목 (E2E, read-only, JSON strip, docs, projectData, 검색, 썸네일)
- [x] 거래 기능 Part 2 분리 (플레이스홀더 블록만)
- [x] 전체 E2E + production-check
- [x] CHANGELOG v1.2.1 (Phase 5 상용화 MVP)
- [x] MVP·본사 배포 체크리스트 (`HQ_DEPLOYMENT_FINAL_CHECKLIST.md`)
- [x] Firebase 하이브리드 (기본 `FIREBASE_ENABLED=false`)
- [x] 게시판·네비 상용화 (프렌치메종 테마)
