# 실사용 테스트 체크리스트 (UI/편집기 업그레이드)

> **버전:** v1.1-ui-upgrade · **환경:** Docker (`http://localhost:8080`)  
> **배포:** `npm run docker:sync` (BUILD_ID 캐시 버스트 포함)

---

## 0. 사전 준비

| # | 항목 | 확인 |
|---|------|------|
| 0.1 | `npm run docker:sync` 완료 | ☐ |
| 0.2 | `curl http://localhost:8080/api/health` → `healthy` + `buildId` | ☐ |
| 0.3 | 브라우저 **Ctrl+Shift+R** (SW/캐시 초기화) | ☐ |
| 0.4 | `npm run typecheck` 통과 | ✅ |
| 0.5 | `npm run build` 통과 | ✅ |
| 0.6 | `npm run test:ui-upgrade` 통과 (8/8) | ✅ |
| 0.7 | `npm run test:real-usage` 통과 (9/9) | ✅ |

**데모 계정:** `password1234` — `admin@intranet.local` / `hq@intranet.local` / `dealer@intranet.local`

---

## 1. 디자인 시스템 v3 (Navy / Blue / Slate + Pretendard)

| # | 시나리오 | 수동 | 자동 |
|---|----------|:----:|:----:|
| 1.1 | 사이드바 Navy (#0F172A), 버튼 Blue (#2563EB) | ☐ | ☐ |
| 1.2 | 카드 `shadow-card`, 여백·타이포 Pretendard | ☐ | ☐ |
| 1.3 | 대시보드·로그인·게시판 전반 색상 일관성 | ☐ | ☐ |
| 1.4 | 모바일(375px) — 레이아웃 깨짐 없음 | ☐ | ☐ |

---

## 2. GrapesJS Page Builder (`/admin/customize/page-builder`)

| # | 시나리오 | 수동 | 자동 |
|---|----------|:----:|:----:|
| 2.1 | **ADMIN** — 에디터 로드 (캔vas·블록 팔레트·속성 패널) | ☐ | ✅ |
| 2.2 | **HQ** — 접근 시 `/dashboard` 리다이렉트 | ☐ | ✅ |
| 2.3 | 미로그인 — `/login` 리다이렉트 | ☐ | ✅ |
| 2.4 | 인트라넷 블록(Banner/Card/Button/Gallery/AI/Notice) 드래그 → Canvas | ☐ | — |
| 2.5 | 속성 패널에서 텍스트·색상·링크 수정 | ☐ | — |
| 2.6 | **저장** → toast 성공 | ☐ | — |
| 2.7 | **대시보드** — `dashboard` slug 레이아웃 렌더 | ☐ | — |
| 2.8 | **배너** — `banner` slug 오버레이 렌더 | ☐ | — |
| 2.9 | **홍보실** — `/boards/pr` 상단 `pr` slug 렌더 | ☐ | — |
| 2.10 | Device Manager — Tablet/Mobile 미리보기 | ☐ | — |
| 2.11 | `/admin/customize` → Page Builder 탭 → Visual Editor 링크 | ☐ | ✅ |

---

## 3. 레거시 그리드 Page Builder (`/admin/customize` 탭)

| # | 시나리오 | 수동 | 자동 |
|---|----------|:----:|:----:|
| 3.1 | react-grid-layout 블록 배치·저장 | ☐ | — |
| 3.2 | GrapesJS 저장 레이아웃이 있으면 GrapesJS 우선 렌더 | ☐ | — |

---

## 4. 게시판 메일함 (`/boards/[key]/mailbox`)

| # | 시나리오 | 수동 | 자동 |
|---|----------|:----:|:----:|
| 4.1 | 메일함 UI 로드 (폴더·라벨·검색) | ☐ | ✅ |
| 4.2 | @dnd-kit — 게시글 드래그 → 폴더 드롭 이동 | ☐ | — |
| 4.3 | 다중 선택 → 중요/휴지통/폴더 일괄 이동 | ☐ | — |
| 4.4 | 커스텀 폴더·라벨 생성/삭제 | ☐ | — |

---

## 5. 기존 기능 회귀 (충돌 없음)

| # | 시나리오 | 수동 | 자동 |
|---|----------|:----:|:----:|
| 5.1 | 전자결재 — 기안 작성 페이지 | ☐ | ✅ |
| 5.2 | AI Agent — 채팅 입력·파일 첨부 UI | ☐ | ✅ |
| 5.3 | 알림 API `/api/notifications` | ☐ | ✅ |
| 5.4 | Rollout / Users / Monitoring (admin) | ☐ | ✅ |
| 5.5 | Pilot 배너 (PILOT_MODE=true) | ☐ | ✅ |

---

## 6. 알려진 제한·이슈

| ID | 심각도 | 설명 | 상태 |
|----|--------|------|------|
| UI-001 | 중 | GrapesJS CSS가 전역 import — `.grapes-editor-shell`로 격리, 렌더 영역은 `.page-layout-content` | ✅ mitigated |
| UI-002 | 중 | 배포 후 구 캐시 → SW/BUILD_ID 무효화 적용 | ✅ fixed |
| UI-003 | 낮 | GrapesJS HTML sanitize 미적용 — ADMIN 전용 | ☐ backlog |
| UI-004 | 낮 | 메일함 DnD E2E 자동화 미구현 (수동 DnD 확인 필요) | ☐ backlog |
| UI-005 | 낮 | `boards/[key]` 일반 게시판에는 PageLayout 미적용 (pr 전용) | ☐ by design |

---

## 7. 자동 검증 명령

```bash
npm run typecheck
npm run build
npm run docker:sync

# UI 업그레이드 E2E
npx playwright test e2e/ui-upgrade.spec.ts

# 기존 실사용 E2E
npm run test:real-usage
```

---

## 8. 완료 서명

| 항목 | 값 |
|------|-----|
| 테스트 일자 | 2026-06-27 |
| 범위 | 디자인 v3 · GrapesJS Page Builder · 메일함 @dnd-kit |
| 자동 E2E | ui-upgrade 8/8 · real-usage 9/9 |
| **판정** | ✅ **UI/편집기 업그레이드 1차 완료** |

---

## 9. 다음 집중 영역 (Phase 2)

1. GrapesJS 저장 HTML **sanitize** + XSS 방어
2. Page Builder **E2E** — 드래그·저장·렌더 end-to-end
3. 메일함 **@dnd-kit E2E** + 키보드 접근성
4. `boards/[key]` **범용** PageLayout slug 매핑
5. GrapesJS **한국어 UI** + 커스텀 블록(실데이터 위젯 연동)
