# 본사 서버 배포 — 최종 체크리스트 (Phase 5)

> **Phase 5 완료 — Firebase 설정 제외 상용화 MVP**  
> PostgreSQL + Docker + Nginx 기준. Firebase는 `FIREBASE_ENABLED=false` 유지, 배포 후 필요 시 활성화.

---

## A. 릴리스 정보

| 항목 | 값 |
|------|-----|
| 버전 | **1.2.1** (상용화 MVP) |
| 스택 | Next.js 15 · PostgreSQL · Redis · Docker · Nginx :8080 |
| Firebase | **비활성** (`FIREBASE_ENABLED=false`) — 코드만 준비 |
| 접속 | `http://<본사서버IP>:8080` |

---

## B. 배포 전 (개발 PC)

### 빌드·품질

- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] `npm run production:check -- http://localhost:8080` 통과
- [ ] `npm run smoke -- http://localhost:8080` 통과
- [ ] `npm run test:ui-upgrade` 통과 (Docker 8080 기동 후)
- [ ] (선택) `npm run test:e2e` 전체

### 기능 수동 확인

- [ ] 로그인 (Credentials) — `admin@intranet.local`
- [ ] 사이드바 게시판: 공지 · 일정 · 업계 뉴스 · 홍보실 · 상품자료실 · 매장 찾기
- [ ] 대리점 포털 · 거래 모듈 허브
- [ ] Page Builder: ADMIN 저장 / HQ read-only / DEALER 자사 scope
- [ ] 업계 뉴스: 관리자 → 뉴스 키워드 설정 (자동 수집 cron 09:00 KST)
- [ ] `FIREBASE_ENABLED=false` → Google 로그인 버튼 **미표시**

### Backlog (Phase 5 완료 항목)

- [x] E2E: Page Builder admin/HQ read-only/dealer (`e2e/ui-upgrade.spec.ts`)
- [x] HEADQUARTER read-only 저장 차단
- [x] `pageBuilderConfig.grids` JSON strip (deprecated)
- [x] `docs/PAGE_BUILDER.md` · `docs/MVP_DEPLOYMENT_CHECKLIST.md`
- [x] Design System v4 UI/UX
- [x] French Maison 회사 테마 (company-theme 모듈)
- [x] Firebase 하이브리드 코드 (기본 off)

---

## C. 본사 서버 환경

### 하드웨어·OS

- [ ] Windows Server 또는 Linux (Docker 지원)
- [ ] RAM 8GB+ (권장 16GB)
- [ ] 디스크 20GB+ 여유 (DB + `uploads` 볼륨)
- [ ] Docker Desktop 24+ / Docker Engine + Compose v2

### 네트워크

- [ ] **8080** HTTP 포트 개방 (사내망/VPN만)
- [ ] 5432·6379는 **외부 차단** (컨테이너 내부만)
- [ ] (선택) HTTPS — Nginx SSL + 사내 CA

### `.env.production` (서버에 복사)

```env
POSTGRES_PASSWORD=<강력한_랜덤>
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://<본사IP또는도메인>:8080
ALLOWED_ORIGINS=http://<본사IP또는도메인>:8080
RUN_SEED=false
FIREBASE_ENABLED=false
PILOT_MODE=false
RUN_DEMO_SEED=false
RUN_DEALER_DEMO_SEED=false
```

- [ ] `OPENAI_API_KEY` — AI 에이전트 사용 시
- [ ] `NAVER_CLIENT_ID/SECRET` — 업계 뉴스 수집 시

---

## D. 배포 실행

```powershell
cd intranet-part1
docker compose --env-file .env.production up -d --build
```

또는 개발 PC에서:

```powershell
npm run docker:sync
```

### 배포 직후

- [ ] `curl http://<서버>:8080/api/health` → `"status":"healthy"`
- [ ] `npm run smoke -- http://<서버>:8080`
- [ ] `npm run pilot:check -- http://<서버>:8080` (Pilot 시)

---

## E. 운영 초기 설정

- [ ] 관리자 로그인 → **비밀번호 즉시 변경**
- [ ] `/admin/customize` — 앱명·로고·브랜딩
- [ ] `/admin/customize/page-builder` — 대시보드·배너 1회 저장
- [ ] `/admin/news-keywords` — 업계 뉴스 키워드 등록
- [ ] `npm run db:seed-company-theme` (프렌치메종 테마, 최초 1회)
- [ ] `npm run db:seed-boards-nav` (게시판 이름, 최초 1회)
- [ ] 대리점 1곳 Pilot — DEALER Page Builder 저장 테스트
- [ ] `/admin/activity` 감사 로그 확인
- [ ] DB·uploads 백업 스케줄 등록

---

## F. Firebase (이번 배포 제외)

배포 후 필요 시:

1. Firebase Console 프로젝트 생성
2. `.env.production`에 `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_SERVICE_ACCOUNT_JSON`
3. `FIREBASE_ENABLED=true` 설정 후 `docker compose up -d --build`
4. [docs/FIREBASE_HYBRID.md](./FIREBASE_HYBRID.md) 참고

---

## G. 롤백

- [ ] 배포 전 DB 스냅샷 (`pg_dump` 또는 volume 백업)
- [ ] 이전 Docker 이미지 태그 보관
- [ ] 장애 시: `docker compose down` → 이전 이미지 + DB 복원

---

## H. 문서 맵

| 문서 | 용도 |
|------|------|
| [DEPLOY.md](../DEPLOY.md) | 상세 배포 |
| [MVP_DEPLOYMENT_CHECKLIST.md](./MVP_DEPLOYMENT_CHECKLIST.md) | MVP 요약 |
| [PAGE_BUILDER.md](./PAGE_BUILDER.md) | Page Builder |
| [CHANGELOG.md](../CHANGELOG.md) | v1.2.1 변경 이력 |
| [ADMIN_MANUAL.md](../ADMIN_MANUAL.md) | 관리자 |
| [FIREBASE_HYBRID.md](./FIREBASE_HYBRID.md) | Firebase (추후) |

**담당:** _________________ **배포일:** _________
