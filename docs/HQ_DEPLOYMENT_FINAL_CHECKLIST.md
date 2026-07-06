# 본사 서버 배포 — 최종 체크리스트 (Pilot Final v1.7.0-pre)

> **Pilot Must #1~13 완료** — PostgreSQL + Docker + Nginx :8080  
> Sprint #1 Nav · #2 결재+AI · #3 Command Palette+Activity Feed

---

## A. 릴리스 정보

| 항목 | 값 |
|------|-----|
| 버전 | **1.7.0-pre** (Pilot Final Polish) |
| 이전 | 1.6.3 (Sprint #3) |
| 스택 | Next.js 15 · PostgreSQL · Redis · Hybrid RAG AI |
| Firebase | **비활성** (`FIREBASE_ENABLED=false`) |
| 접속 | `http://<본사서버IP>:8080` |

---

## B. 배포 전 (개발 PC)

### 빌드·품질

- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 성공
- [ ] `npm run production:check -- http://localhost:8080`
- [ ] `npm run smoke -- http://localhost:8080`
- [ ] **`npm run test:e2e:docker`** — smoke + ui-upgrade + ui-phase4 + **sprint3-pilot**
- [ ] **`npm run test:pilot-full`** — 기안→문서함→AI Chat E2E
- [ ] (선택) `npm run test:e2e:docker:full`

### Pilot Must #1~13

| Must | 검증 |
|------|------|
| #1~3 | `pilot:check` — approval/documents/search nav |
| #4~6 | `db:seed-pilot-approval` — 결재 5건·문서함 |
| #7~10 | COMPLETED → 문서함 + AI ingest |
| #11~12 | AI 초안 · 추천 결재선 · Compliance |
| #13 | **Ctrl+K** Command Palette |

- [ ] `.env.production`: `PILOT_MODE=true`, `NEXT_PUBLIC_PILOT_MODE=true`, `RUN_PILOT_SEED=true`
- [ ] `npm run db:deploy` — Sprint #2 migration (amount, dealer scope)
- [ ] `npm run pilot:check`
- [ ] Dashboard: KPI + **최근 활동** + (ADMIN) Pilot KPI
- [ ] Breadcrumb: `/approval`, `/documents`, `/search`

### 문서

- [ ] [PILOT_FAQ.md](./PILOT_FAQ.md) 팀 공유
- [ ] [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md) 15분 온보딩
- [ ] PRD S-01~S-10 스크린샷

---

## C. `.env.production` (서버)

```env
POSTGRES_PASSWORD=<openssl rand -base64 24>
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://<본사IP>:8080
ALLOWED_ORIGINS=http://<본사IP>:8080
PILOT_MODE=true
NEXT_PUBLIC_PILOT_MODE=true
RUN_DEMO_SEED=true
RUN_PILOT_SEED=true
RUN_DEALER_DEMO_SEED=false
FIREBASE_ENABLED=false
OPENAI_API_KEY=<선택>
```

- [ ] dev placeholder 시크릿 **교체**
- [ ] `OPENAI_API_KEY` — AI Pilot 체감 시 필수

---

## D. 배포 실행

```powershell
cd intranet-part1
npm run docker:sync
# 또는
docker compose --env-file .env.production up -d --build
```

### 배포 직후

- [ ] `/api/health` → `features.commandPalette/activityFeed/quickSearch: true`
- [ ] `npm run pilot:check -- http://<서버>:8080`
- [ ] `npm run test:pilot-sprint3 -- http://<서버>:8080`
- [ ] `npm run test:pilot-full` (선택)

---

## E. Pilot 런칭 (비즈니스)

- [ ] Pilot 그룹·계정 배포
- [ ] 15분 온보딩 세션 (PILOT_ONBOARDING.md)
- [ ] HQ 승인자·DEALER 테스트 계정 분리
- [ ] 피드백 채널 (`/admin/pilot`)
- [ ] Part 2 범위 사전 공지 (Firebase, BPM, react-flow)

---

## F. Git 태그

```powershell
git tag -a v1.7.0-pre -m "Pilot Final — Must #1~13"
git push origin v1.7.0-pre
```

---

## G. 문서 맵

| 문서 | 용도 |
|------|------|
| [PILOT_FAQ.md](./PILOT_FAQ.md) | Pilot FAQ |
| [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md) | 15분 시작 |
| [CHANGELOG.md](../CHANGELOG.md) | v1.7.0-pre |
| [DEPLOY.md](../DEPLOY.md) | 상세 배포 |

**담당:** _________________ **Pilot 런칭일:** _________
