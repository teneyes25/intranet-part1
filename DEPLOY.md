# 온프레미스(본사 서버) Production 배포 가이드

> **v1.1.0 — Page Builder 상용화 · MVP 배포 준비 완료** (Phase 5)  
> 체크리스트: [docs/MVP_DEPLOYMENT_CHECKLIST.md](docs/MVP_DEPLOYMENT_CHECKLIST.md)

---

## 1. 사전 요구사항

| 항목 | 버전 |
|------|------|
| Docker Desktop / Docker Engine | 24+ |
| Docker Compose | v2+ |
| 디스크 | DB + uploads 여유 20GB+ |
| 포트 | **8080**(HTTP), 5432/6379는 내부 전용 권장 |

---

## 2. 배포 절차 (본사 서버)

### Step 1 — 소스 이전

```bash
# USB / Git / 사내 파일서버 등으로 intranet-part1 폴더 복사
cd intranet-part1
```

### Step 2 — 환경변수

```bash
cp .env.production.example .env.production
```

**반드시 변경:**

| 변수 | 예시 |
|------|------|
| `POSTGRES_PASSWORD` | 강력한 랜덤 비밀번호 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://192.168.1.100:8080` 또는 사내 도메인 |
| `ALLOWED_ORIGINS` | `NEXTAUTH_URL`과 동일 origin 포함 |

### Step 3 — Docker 빌드 & 기동

```powershell
# Windows PowerShell
Set-Location "C:\path\to\intranet-part1"
docker compose --env-file .env.production up -d --build
```

```bash
# Linux
docker compose --env-file .env.production up -d --build
```

### Step 4 — 헬스체크

```bash
curl http://localhost:8080/api/health
# {"status":"healthy","checks":{"database":"ok","redis":"ok",...}}

npm run smoke -- http://localhost:8080
```

### Step 5 — 초기 관리자 / 데이터

**방법 A — 시드 (최초 1회, 빈 DB)**

`.env.production` 에 `RUN_SEED=true` 설정 후:

```bash
docker compose --env-file .env.production up -d app
# 시드 완료 후 RUN_SEED=false 로 변경
```

**방법 B — 수동 시드**

```bash
docker compose exec app node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts
```

**기본 관리자 계정 (시드):**

| 이메일 | 비밀번호 | 권한 |
|--------|----------|------|
| admin@intranet.local | password1234 | ADMIN |

> ⚠️ **프로덕션 배포 직후 반드시 비밀번호 변경**

---

## 3. DB Migration (Production-safe)

### 신규 서버 (빈 DB) — 권장

entrypoint가 자동으로 실행:

1. `CREATE EXTENSION vector`
2. `prisma migrate deploy` (순서대로 적용)

| Migration | 내용 |
|-----------|------|
| `20250621120000_production_baseline` | 초기 스키마 |
| `20250621140000_phase4_productization` | 알림·AI 메모리 |
| `20250621150000_phase4_fix` | Phase 4 보정 |
| `20250621160000_admin_customize` | **커스터마이징 센터** (site_settings, AI ingest, 결재선, SNS 연동) |
| `20250622160000_phase6_pilot` | **Pilot** (그룹, 피드백, 사용량, 에러 로그) |

### 기존 DB (db push 로 이미 스키마 있음)

마이그레이션 baseline 등록 후 deploy:

```bash
docker compose exec app node /app/node_modules/prisma/build/index.js migrate resolve --applied 20250621120000_production_baseline

docker compose exec app node /app/node_modules/prisma/build/index.js migrate deploy
```

`audit_logs` 등 누락 테이블만 추가됩니다.

### 스키마 충돌 시 (최초 1회만)

`.env.production`:

```env
PRISMA_ACCEPT_DATA_LOSS=true
```

기동 후 **즉시 `false`로 되돌리세요.**

| 변수 | 기본 | 설명 |
|------|------|------|
| `PRISMA_MIGRATE_DEPLOY` | `true` | migrate deploy 우선 |
| `PRISMA_ACCEPT_DATA_LOSS` | `false` | true 시 db push data loss 허용 |

---

## 4. 아키텍처

```
[브라우저] → Nginx(:8080) → App(:3000) → PostgreSQL + pgvector
                              ↓
                           Redis (Rate limit / Cache)
                              ↓
                        uploads volume (게시판·브랜딩·문서)
```

> **브랜딩 파일**(로고/favicon/배너)은 `uploads/branding/` 에 저장되며 `intranet-uploads-data` 볼륨에 포함됩니다. 백업 시 `uploads-backup.sh` 로 함께 보호하세요.

| 서비스 | 컨테이너 | 포트 |
|--------|----------|------|
| Nginx | intranet-nginx | 8080 → 80 |
| App | intranet-app | 내부 3000 |
| PostgreSQL | intranet-db | 5432 |
| Redis | intranet-redis | 6379 |

---

## 5. 환경변수 전체 (.env.production)

| 변수 | 필수 | 설명 |
|------|------|------|
| `POSTGRES_*` | ✅ | DB 접속 |
| `REDIS_URL` | ✅ | `redis://redis:6379` |
| `NEXTAUTH_URL` | ✅ | 외부 URL |
| `NEXTAUTH_SECRET` | ✅ | JWT/세션 암호화 |
| `ALLOWED_ORIGINS` | ✅ | CORS 허용 origin (쉼표) |
| `ALLOWED_IP_PREFIXES` | | 사내망 IP prefix |
| `LOG_LEVEL` | | `info` / `debug` |
| `HTTP_PORT` | | Nginx (기본 8080) |
| `PRISMA_MIGRATE_DEPLOY` | | migrate deploy 사용 |
| `PRISMA_ACCEPT_DATA_LOSS` | | **운영 중 false** |
| `RUN_SEED` | | 최초 1회만 true |
| `PILOT_MODE` | | Pilot 배포 시 `true` |
| `RUN_DEMO_SEED` | | Pilot 데모 데이터 1회 시드 |
| `OPENAI_API_KEY` | | AI (선택) |
| `CRON_SECRET` | | 뉴스 cron API (선택) |
| `CLAMAV_HOST` | | 바이러스 스캔 (선택) |

---

## 6. Rollback (롤백)

### App만 이전 버전

```bash
# 이전 이미지/소스로 교체 후
docker compose --env-file .env.production up -d --build app
```

### DB 롤백 (백업 복원)

```bash
# 백업 파일이 있는 경우
docker compose stop app
docker exec -i intranet-db pg_restore -U intranet -d intranet -c < backups/intranet_YYYYMMDD.dump
docker compose start app
```

### 전체 초기화 (⚠️ 데이터 삭제)

```bash
docker compose down -v   # 볼륨 포함 삭제
docker compose --env-file .env.production up -d --build
# RUN_SEED=true 로 시드
```

---

## 7. 운영 명령어

```bash
docker compose ps
docker compose logs -f app --tail 100
docker compose --env-file .env.production up -d --build app   # 재배포
docker compose down                                          # 중지
```

---

## 8. 백업

```bash
# 개별 실행
sh scripts/backup/postgres-backup.sh ./backups/postgres
sh scripts/backup/uploads-backup.sh ./backups/uploads

# 통합 (DB + uploads) — cron 권장
sh scripts/backup/daily-backup.sh
```

**cron 등록 예 (본사 서버):**

```cron
0 2 * * * /path/to/intranet-part1/scripts/backup/daily-backup.sh >> /var/log/intranet-backup.log 2>&1
```

- DB 백업: 매일 02:00 (30일 보관)
- uploads: daily-backup.sh 에 포함
- Rollout 전·후 수동 백업 1회 권장

---

## 9. HTTPS (선택)

Nginx에 SSL 인증서 마운트 + `NEXTAUTH_URL=https://...`

---

## 10. Production Build (로컬 검증)

```bash
cp .env.production.example .env.production
npm ci
npx prisma generate
npm run build
npm run typecheck
docker compose --env-file .env.production up -d --build   # admin_customize 마이그레이션 포함
npm run smoke -- http://localhost:8080
npm run pilot:check -- http://localhost:8080
npm run test:e2e
```

> 접속 URL: **`http://localhost:8080`** (HTTPS 미지원 — Nginx SSL 설정 전까지 HTTP 사용)

---

## 11. 관리자 커스터마이징 센터 (Day 31)

| 경로 | 권한 | 기능 |
|------|------|------|
| `/admin/customize` | ADMIN | 화면 디자인·AI 학습·전자결재·SNS 연동 |

배포 후 ADMIN 로그인 → **관리 → 포털 커스터마이징** 에서 설정. 상세는 **ADMIN_MANUAL.md §11** 참고.

모든 변경은 `audit_logs`에 `SITE_CUSTOMIZE`, `AI_INGEST_RUN`, `APPROVAL_CUSTOMIZE`, `INTEGRATION_UPDATE` 로 기록됩니다.

---

## 12. 보안 체크리스트

- [ ] `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET` 변경
- [ ] `ALLOWED_ORIGINS` 본사 URL만 허용
- [ ] DB/Redis 포트 외부 미개방
- [ ] `PRISMA_ACCEPT_DATA_LOSS=false`
- [ ] `RUN_SEED=false` (초기 시드 후)
- [ ] admin 기본 비밀번호 변경
- [ ] `/api/health` 200 확인
- [ ] `/admin/customize` 비로그인 시 `/login` 리다이렉트 확인
- [ ] `POST /api/ai/ingest` 비인증 401 확인 (`npm run smoke`)
- [ ] SNS API Key는 UI에 평문 노출 금지 (password 필드 + 변경 시에만 저장)

---

## 13. 문제 해결

| 증상 | 조치 |
|------|------|
| App Restarting | `docker compose logs app` — migrate 실패 시 baseline 등록 |
| 502 Bad Gateway | app healthcheck 대기, `docker compose ps` |
| CORS 오류 | `ALLOWED_ORIGINS`에 브라우저 origin 추가 |
| Rate limit 429 | Redis 연결 확인 `REDIS_URL` |
| **접속 안 됨** | Docker Desktop 실행 확인, **`http://`** 사용 (https 아님), `8080` 포트 |
| **커스터마이징 500** | `20250621160000_admin_customize` 미적용 → `docker compose up -d --build app` |
| **브랜딩 이미지 소실** | `uploads` 볼륨 마운트 확인, 백업 복원 |
| **Pilot 배너 미표시** | `PILOT_MODE=true` 또는 DB Pilot 활성 + 그룹 멤버 지정 |
| **Pilot 500** | `20250622160000_phase6_pilot` 미적용 → `docker compose up -d --build app` |
| **비밀번호 변경 루프** | admin `mustChangePassword` — `/settings/change-password`에서 변경 |
| **Phase 7 500** | `20250623160000_phase7_production` 미적용 → rebuild |
| **보안 헤더 중복** | `BEHIND_NGINX=true` + nginx `proxy_hide_header` 확인 |
| **데모 게시물 노출** | `PILOT_MODE=false` 시 일반 사용자 숨김 — ADMIN `/admin/system`에서 삭제 |
| **Load test 실패** | `npm run load-test -- http://localhost:8080 150 30` — app/nginx 메모리 확인 |
| **CSV import 오류** | 헤더 `email,name,role,dealerCode,password` · DEALER 는 dealerCode 필수 |

---

## 14. Pilot 배포 (Phase 6 / Day 32)

### Step 1 — Pilot 환경변수

```env
PILOT_MODE=true
RUN_DEMO_SEED=true   # 최초 1회만 — 공지·게시·결재 데모 데이터
```

```bash
docker compose --env-file .env.production up -d --build
# 완료 후 RUN_DEMO_SEED=false 로 변경
```

### Step 2 — Pilot 운영

- ADMIN → **Pilot 관리** (`/admin/pilot`)
- 그룹 멤버 지정, 배너 메시지, 모니터링
- 상세: **ADMIN_MANUAL.md §12**

### Step 3 — 검증 · Rollback

```bash
npm run pilot:check -- http://localhost:8080
npm run test:e2e
sh scripts/backup/postgres-backup.sh ./backups/postgres
```

Rollback: §6 App/DB 복원 · `PILOT_MODE=false`로 Pilot UI 비활성

---

## 15. 본사 정식 Rollout (Phase 7 / Day 33)

### Step 1 — 정식 배포 모드 전환

```env
PILOT_MODE=false
RUN_DEMO_SEED=false
RUN_SEED=false
BEHIND_NGINX=true
```

```bash
docker compose --env-file .env.production up -d --build
npm run production:check -- http://localhost:8080
```

- Pilot 배너 자동 숨김 (`PILOT_MODE=false` + DB Pilot 비활성)
- 데모 데이터: 일반 사용자에게 숨김 — ADMIN `/admin/system`에서 삭제 가능
- **admin 최초 로그인 → 비밀번호 변경 필수** (`/settings/change-password`)

### Step 2 — 본사 전체 온보딩 (2주)

| 주차 | 작업 | 담당 |
|------|------|------|
| 1주 | CSV 대량 계정 등록 (`/admin/users`) | IT/ADMIN |
| 1주 | 브랜딩 적용 (`/admin/customize` — 로고·색상·배너) | ADMIN |
| 1주 | 부서별 30분 교육 (`/help` + 매뉴얼 다운로드) | 각 팀장 |
| 2주 | 전자결재·AI 실습 | 전 직원 |
| 2주 | 피드백 수집 (Teams `#intranet-rollout`) | PM |

**CSV 템플릿:** `/admin/users` → 템플릿 다운로드  
**권한별 대시보드:** HEADQUARTER/DEALER 기본 위젯 자동 적용 + `/admin/customize`에서 추가 조정

### Step 3 — 운영 안정화

| 기능 | 경로 |
|------|------|
| 시스템 상태 | `/admin/system` — DB/Redis/AI 사용량 |
| 긴급 공지 | `/admin/system` — 전체 알림 + 배너 |
| 백업 | `scripts/backup/daily-backup.sh` cron |

### Step 4 — 최종 검증

```bash
npm run smoke -- http://localhost:8080
npm run production:check -- http://localhost:8080
npm run test:e2e
npm run load-test -- http://localhost:8080 150 30
```

- 보안 헤더: Nginx 단일 소스 (`proxy_hide_header` + `BEHIND_NGINX=true`)
- E2E: `e2e/phase7.spec.ts`

### Step 5 — 교육·피드백 채널

- **교육 자료:** `/help` · `USER_MANUAL.md` · `/api/help/manual` 다운로드
- **관리자:** `ADMIN_MANUAL.md` §13
- **피드백:** Teams `#intranet-rollout` · IT 헬프데스크
- **긴급 장애:** ADMIN → `/admin/system` 긴급 공지

### Rollback

1. §6 DB 백업 복원
2. `PILOT_MODE=true` (Pilot 재개 시)
3. 이전 Docker 이미지 tag로 app 롤백

---

## 16. 대리점 Rollout + Part 2 (Phase 8 / Day 34)

### Step 1 — 환경변수

```env
RUN_DEALER_DEMO_SEED=true   # 최초 1회 — SKU·재고·샘플 주문
```

### Step 2 — 대리점 Rollout

| 경로 | 기능 |
|------|------|
| `/admin/dealers` | 대리점 Bulk Import(100+), Rollout ON/OFF, 사용자 CSV |
| `/admin/rollout` | 그룹별 진행률, 접속·피드백 |
| `/help/dealer` | 대리점 Quick Start |

**CSV (대리점):** `code,name,region,rolloutGroupKey,rolloutActive`

### Step 3 — Part 2 API (`/api/v2`)

| 엔드포인트 | 설명 |
|-----------|------|
| `GET/POST /api/v2/orders` | 주문 목록·생성 |
| `GET /api/v2/orders/[id]` | 주문 상세 |
| `POST /api/v2/payments/confirm` | 결제 확인 |
| `GET/PATCH /api/v2/shipments/[orderId]` | 배송 조회·확인 |
| `GET /api/v2/inventory?dealerId=` | 재고 |
| `GET/POST /api/v2/trades` | D2D 거래 |

모든 v2 API: JWT 인증 + RBAC + Rollout 활성 대리점만

### Step 4 — 검증

```bash
npm run typecheck
npm run build
npm run smoke -- http://localhost:8080
npm run test:e2e
```

E2E: `e2e/phase8.spec.ts` · 상세: **ADMIN_MANUAL.md §14**

---

## 17. Phase 9 — 최종 상품화 (Day 35)

### 최종 검증

```bash
npm run typecheck
npm run build
npm run final:check -- http://localhost:8080
npm run test:e2e                    # phase1~9 포함
npm run load-test -- http://localhost:8080 200 45
```

### 실시간 모니터링

| 경로 | 기능 |
|------|------|
| `/admin/monitoring` | 접속자(15m), AI 토큰 추정, 에러율, DB/Redis |
| `/api/admin/monitoring` | 30초 폴링 JSON (ADMIN) |

### 백업 · 복구 테스트

```bash
sh scripts/backup/daily-backup.sh
sh scripts/backup/restore-test.sh ./backups/postgres/intranet_YYYYMMDD.dump
```

### HTTPS

- 예시: `nginx/nginx.ssl.example.conf`
- Let's Encrypt certbot 또는 사내 CA 인증서
- `NEXTAUTH_URL=https://...` · `ALLOWED_ORIGINS` 동기화

---

## 18. 100개 대리점 Rollout 계획 (Group 1~5)

| 그룹 | 대상 | 일정(예) | 활성화 |
|------|------|---------|--------|
| group-1 | 1~20 | 1주차 | `/admin/rollout` → 그룹 ON |
| group-2 | 21~40 | 2주차 | |
| group-3 | 41~60 | 3주차 | |
| group-4 | 61~80 | 4주차 | |
| group-5 | 81~100 | 5주차 | |

**CSV 템플릿:** `docs/dealer-import-template.csv`  
**교육:** `/help/dealer` · 30분 Quick Start · ADMIN_MANUAL §15

각 그룹 활성화 전: 백업 → `group-N` ON → smoke → 대리점 교육 → 48h 모니터링

---

## 19. 본사 서버 이전 체크리스트

### .env.production 최적화

```env
PILOT_MODE=false
RUN_SEED=false
RUN_DEMO_SEED=false
RUN_DEALER_DEMO_SEED=false
BEHIND_NGINX=true
PRISMA_ACCEPT_DATA_LOSS=false
LOG_LEVEL=info
# POSTGRES_PASSWORD, NEXTAUTH_SECRET — openssl rand -base64 32
# ALLOWED_ORIGINS=https://intranet.company.local
```

### 이전 시 주의사항

1. **DB/ uploads 볼륨** — Docker named volume 백업 후 이전
2. **마이그레이션** — 빈 DB: `migrate deploy` / 기존 DB: DEPLOY §3 baseline
3. **방화벽** — 외부 5432/6379 차단, 443(또는 8080)만 개방
4. **DNS** — `NEXTAUTH_URL` 과 실제 접속 URL 일치
5. **OpenAI Key** — 본사 전용 키, quota 알림 설정

### 첫 배포 후 72시간 모니터링

| 시간 | 작업 |
|------|------|
| 0~4h | `/admin/monitoring` · `docker compose logs -f` · smoke |
| 4~24h | 로그인 추이, AI 에러율, Rollout group-1 피드백 |
| 24~72h | 백업 cron 확인, load-test 재실행, 사용자 CS 채널 |

**CS 채널:** Teams `#intranet-ops` · 긴급: `/admin/system` 긴급 공지

### Git 릴리스

```bash
git tag -a v1.0.0-product-ready -m "Part 1 product ready"
git push origin v1.0.0-product-ready
```
