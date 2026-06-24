# 관리자 매뉴얼 (ADMIN_MANUAL)

> intranet-part1 — 운영·관리 가이드 (Day 35 / Phase 9 Product Ready)

## 1. 관리자 메뉴

| 메뉴 | 경로 | 기능 |
|------|------|------|
| 사용자 관리 | `/admin/users` | 승인/거절, **CSV 대량 등록** |
| 뉴스 키워드 | `/admin/news-keywords` | 최대 50개, AI/경제/미래 |
| 문서함 카테고리 | `/admin/document-categories` | 분류 관리 |
| 활동 로그 | `/admin/activity` | AuditLog 100건 |
| **포털 커스터마이징** | **`/admin/customize`** | **화면·AI·결재·SNS 설정** |
| **Pilot 관리** | **`/admin/pilot`** | **Pilot 그룹·모니터링·체크리스트 (Day 32)** |
| **시스템 상태** | **`/admin/system`** | **DB/Redis/AI·긴급 공지·데모 데이터 (Day 33)** |
| **대리점 관리** | **`/admin/dealers`** | **Bulk Import·Rollout·브랜딩 (Day 34)** |
| **Rollout** | **`/admin/rollout`** | **그룹별 진행률·피드백 (Day 34)** |
| **실시간 모니터링** | **`/admin/monitoring`** | **접속·AI·에러·인프라 (Day 35)** |
| 권한/보안 | `/admin/security` | RBAC 개요 |

## 2. 사용자 승인

1. `/admin/users` — `PENDING` 사용자 확인
2. **승인** / **거절** — 알림·AuditLog 기록

## 3. 뉴스 자동수집

- 키워드 등록 → 매일 09:00 KST cron
- **지금 수집 테스트** 버튼 (관리 페이지)
- API: `POST /api/ai/news/collect` + `x-cron-secret`

## 4. AI 지식 동기화

- `/ai-agent` — ADMIN **지식 동기화** 버튼
- API: `POST /api/ai/ingest` — ADMIN 전용, Rate limit 적용

## 5. 활동 로그 (Audit)

기록 항목: `LOGIN_*`, `APPROVAL_*`, `AI_*`, `FILE_UPLOAD`, `USER_*`,  
**`SITE_CUSTOMIZE`**, **`AI_INGEST_RUN`**, **`APPROVAL_CUSTOMIZE`**, **`INTEGRATION_UPDATE`**

```sql
SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 20;
```

## 6. 알림 시스템

- 결재 상신/승인/반려 시 자동 생성
- DB: `notifications` 테이블

## 7. 배포 · DB

- **DEPLOY.md** — Docker, migration, rollback
- Migration 목록:
  - `20250621120000_production_baseline`
  - `20250621140000_phase4_productization`
  - `20250621150000_phase4_fix`
  - **`20250621160000_admin_customize`** (커스터마이징 센터)

## 8. 백업

```bash
sh scripts/backup/postgres-backup.sh ./backups/postgres
sh scripts/backup/uploads-backup.sh ./backups/uploads
```

> `uploads/branding/` (로고·favicon·배너)도 uploads 볼륨에 포함됩니다.

## 9. 보안 체크리스트

- [ ] `NEXTAUTH_SECRET`, `POSTGRES_PASSWORD` 변경
- [ ] `ALLOWED_ORIGINS` 본사 URL만
- [ ] `PRISMA_ACCEPT_DATA_LOSS=false`
- [ ] admin 기본 비밀번호 변경
- [ ] Redis/DB 외부 포트 차단
- [ ] SNS API Key/Token — UI 평문 미노출, 변경 시에만 입력
- [ ] `/api/ai/ingest` ADMIN 외 401 확인

## 10. 테스트

```bash
npm run smoke -- http://localhost:8080
npm run load-test -- http://localhost:8080 50 30
npm run test:e2e
```

---

## 11. 관리자 커스터마이징 센터 (`/admin/customize`)

**ADMIN 전용.** 사이드바 **관리 → 포털 커스터마이징** 또는 URL 직접 접근.

모든 저장·삭제·재학습 작업은 **Audit Log**에 자동 기록됩니다.

### 11.1 화면 디자인

| 항목 | 설명 |
|------|------|
| 앱 이름 | 사이드바 상단 표시명 |
| 로고 / favicon / 배너 | PNG·JPEG·WebP·SVG·ICO·MP4·WebM (최대 15MB) |
| Primary / Sidebar 색 | HSL 값 (예: `222.2 47.4% 11.2%`) |
| 대시보드 위젯 | stats, recentPosts, activityChart, shortcuts, aiSummary, account on/off |
| 배너 표시 | 대시보드 상단 배너 on/off |

저장 후 포털 전체에 즉시 반영 (브랜딩 CSS 변수, 사이드바 로고, 대시보드 레이아웃).

### 11.2 AI Agent 학습 관리

| 기능 | 설명 |
|------|------|
| **전체 재학습** | 모든 게시판 → pgvector 재임베딩 |
| **게시판 선택 학습** | 특정 게시판만 재임베딩 |
| **학습 이력** | jobId, scope, 상태, 처리 건수 확인 |

API: `POST /api/ai/ingest` `{ "scope": "all" | "boards", "boardKeys": [...] }` (ADMIN + 세션)

### 11.3 전자결재 커스터마이징

| 기능 | 설명 |
|------|------|
| 결재 서식 (Template) | Rich Editor로 HTML 양식 CRUD |
| 결재선 기본 템플릿 | 부서·직급별 기본 결재라인, 순서·결재자 지정 |
| 기본 템플릿 | `isDefault` 체크 시 해당 조건에 우선 적용 |

### 11.4 SNS 연동 준비 (Phase 2 예정)

| Provider | 용도 |
|----------|------|
| Instagram | API Key / Secret / Token 저장 |
| 회사 홈페이지 | Webhook URL 등 저장 |

- **공지 자동 게시** 기능은 Phase 2에서 활성화 예정 (현재 플레이스홀더)
- API Key는 password 필드로 저장, **변경 시에만** 새 값 입력 (기존 값 유지)
- Audit: `INTEGRATION_UPDATE`

---

**시드 계정**: `admin@intranet.local` / `password1234` (배포 후 즉시 변경)

**접속 URL (Docker)**: `http://localhost:8080/login` (HTTP — HTTPS는 Nginx SSL 설정 후)

---

## 12. Pilot 운영 가이드 (Day 32 / Phase 6)

### 12.1 Pilot 시작 절차

1. `.env.production`에 `PILOT_MODE=true` 설정
2. `RUN_DEMO_SEED=true`로 1회 기동 → 데모 데이터 생성 후 `false`로 변경
3. `/admin/pilot` → **Pilot 설정** 탭에서 배너·피드백 활성화 확인
4. **그룹 관리** 탭에서 Pilot 사용자 지정 (본사 영업팀, 관리팀 등)
5. `npm run pilot:check -- http://localhost:8080` 자동 검증

### 12.2 Pilot 테스트 계정 (데모 시드)

| 이메일 | 비밀번호 | 권한 | Pilot 그룹 |
|--------|----------|------|------------|
| admin@intranet.local | password1234 | ADMIN | 관리팀 |
| hq@intranet.local | password1234 | HEADQUARTER | 영업팀 |
| pilot-sales@intranet.local | password1234 | HEADQUARTER | 영업팀 |
| pilot-mgmt@intranet.local | password1234 | HEADQUARTER | 관리팀 |
| dealer@intranet.local | password1234 | DEALER | (비Pilot) |

### 12.3 Pilot 사용자 경험

- Pilot 그룹 멤버에게 **상단 배너** + `/feedback` 피드백 폼
- `/help` — Pilot Quick Start + 교육 동영상 플레이스홀더
- 페이지 이동 시 **사용량 메트릭** 자동 수집

### 12.4 모니터링 (`/admin/pilot` → 모니터링)

| 항목 | 설명 |
|------|------|
| 7일 활성 사용자 | Pilot 기간 unique userId |
| 이벤트별 사용량 | page_view 등 |
| 피드백 목록 | 카테고리·만족도·내용 |
| 시스템 에러 | ADMIN 자동 알림 (Notification) |

### 12.5 피드백 API

- `POST /api/pilot/feedback` — Pilot 멤버 + JSON body
- Audit: `PILOT_FEEDBACK`

### 12.6 Rollback · 백업

- **DEPLOY.md §6** Rollback 절차 숙지
- Pilot 전·후 DB/uploads 백업 필수
- `PILOT_MODE=false` → Pilot 배너·추적 비활성 (데이터 유지)

### 12.7 성능 모니터링

```bash
docker compose logs -f app --tail 100
docker compose ps
npm run load-test -- http://localhost:8080 50 30
```

---

## 13. 본사 정식 배포 (Phase 7 / Day 33)

### 13.1 정식 모드 전환

1. `.env.production`: `PILOT_MODE=false`, `RUN_DEMO_SEED=false`
2. `docker compose up -d --build`
3. admin 최초 로그인 → `/settings/change-password` (필수)
4. `npm run production:check -- http://localhost:8080`

### 13.2 사용자 대량 등록

1. `/admin/users` → **템플릿 다운로드**
2. Excel에서 CSV UTF-8 저장
3. 붙여넣기 후 **가져오기** — 신규 계정은 `mustChangePassword=true`

### 13.3 브랜딩 (`/admin/customize`)

| 탭 | 설정 |
|----|------|
| 화면 디자인 | 앱 이름, 로고, favicon, 배너(이미지/동영상), primary/sidebar 색상 |
| 대시보드 | 위젯 표시/순서 — 역할별 기본값과 병합됨 |

저장 즉시 전체 사용자 화면에 반영. Audit: `SITE_CUSTOMIZE`

### 13.4 시스템 상태 (`/admin/system`)

- DB 용량, Redis, AI 이벤트(24h/7d), 에러 로그
- **긴급 공지:** 전체 Notification + 상단 빨간 배너
- **데모 데이터 삭제:** Pilot 잔여 콘텐츠 (ADMIN 전용)

### 13.5 백업

```bash
sh scripts/backup/daily-backup.sh
# cron: DEPLOY.md §8
```

### 13.6 Rollout 검증

```bash
npm run smoke -- http://localhost:8080
npm run test:e2e
npm run load-test -- http://localhost:8080 150 30
```

상세 Rollout 일정: **DEPLOY.md §15**

---

## 14. 대리점 Rollout + Part 2 (Phase 8 / Day 34)

### 14.1 대리점 관리 (`/admin/dealers`)

- **Bulk Import:** 100+ 대리점 CSV 등록
- **Rollout ON/OFF:** 대리점별 단계적 활성화
- **브랜딩:** `appNameOverride`, `primaryColor` 등 (본사 기본 + 오버라이드)
- **사용자 CSV:** 동일 페이지에서 대리점 직원 대량 등록

### 14.2 Rollout 대시보드 (`/admin/rollout`)

- 전체 진행률 (% Rollout 활성 대리점)
- **그룹 ON/OFF:** `group-1` ~ `group-5` (20곳씩) 일괄 활성화
- Rollout 피드백 목록

### 14.3 대리점 뷰 vs 본사 뷰

| 기능 | 본사 | 대리점 |
|------|------|--------|
| 홍보실 (`/boards/pr`) | ✅ | ❌ |
| 근태관리 | ✅ | ❌ |
| 상품자료실 | ✅ | ✅ |
| Part 2 API | 전체 | 소속 대리점만 |

Rollout 미활성 대리점 사용자 → `/help/dealer?pending=1` 리다이렉트

### 14.4 Part 2 API

- 네임스페이스: `/api/v2/*`
- 모델: Order, Payment, Shipment, Inventory, DealerTrade, ProductSku
- 전자결재 연계: `approvalDocumentId` (주문 생성 시)
- 상품자료실 연계: `ProductSku.productPostId`

### 14.5 대리점 데모 시드

```env
RUN_DEALER_DEMO_SEED=true  # 1회
```

SKU 3종, 대리점별 재고 100, 샘플 주문 1건

### 14.6 검증

```bash
npm run typecheck && npm run build
npm run test:e2e   # phase8.spec.ts
```

상세: **DEPLOY.md §16**

---

## 15. 최종 상품화 · 본사 배포 (Phase 9 / Day 35)

### 15.1 실시간 모니터링 (`/admin/monitoring`)

| 지표 | 설명 |
|------|------|
| 접속자 (15m) | 최근 LOGIN_SUCCESS unique user |
| AI tokens (추정) | AI_CHAT × 2000 tokens |
| 에러율 | system_error / audit 24h |
| DB/Redis | 용량, ping latency |

30초 자동 새로고침 · API: `GET /api/admin/monitoring`

### 15.2 100개 대리점 Rollout (5그룹)

| group | 대상 | CSV 키 |
|-------|------|--------|
| group-1 | 1~20 | `docs/dealer-import-template.csv` |
| group-2 | 21~40 | |
| group-3 | 41~60 | |
| group-4 | 61~80 | |
| group-5 | 81~100 | |

주차별: 백업 → 그룹 ON → 교육 → 48h 모니터링

### 15.3 대리점 교육

- `/help/dealer` Quick Start (30분)
- 전자결재·상품자료실·Part 2 API 실습
- Rollout 피드백 수집

### 15.4 백업 · HTTPS · 복구

```bash
sh scripts/backup/daily-backup.sh
sh scripts/backup/restore-test.sh [dump파일]
```

HTTPS: `nginx/nginx.ssl.example.conf` · DEPLOY.md §17

### 15.5 최종 검증 · 릴리스

```bash
npm run verify:all
npm run test:e2e
npm run load-test -- http://localhost:8080 200 45
git tag v1.0.0-product-ready
```

72h 모니터링: DEPLOY.md §19
