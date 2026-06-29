# MVP 배포 체크리스트 — v1.1.0 (Page Builder 상용화)

> **Phase 5 완료 — MVP 배포 준비 완료**  
> 본사 온프레미스 서버 배포 전 최종 확인용. 상세 절차는 [DEPLOY.md](../DEPLOY.md) 참고.

---

## 1. 릴리스 정보

| 항목 | 값 |
|------|-----|
| 버전 | **1.1.0** |
| 빌드 확인 | `GET /api/health` → `buildId` |
| 주요 기능 | GrapesJS Page Builder, 대리점 Self-Service, HQ read-only |

---

## 2. 배포 전 (개발·스테이징)

- [ ] `npm run typecheck` 통과
- [ ] `npm run test:e2e` 전체 통과 (phase1~9 + ui-upgrade)
- [ ] `npm run production:check -- http://localhost:8080` 통과
- [ ] `npm run smoke -- http://localhost:8080` 통과
- [ ] Page Builder 수동 확인
  - [ ] ADMIN: global + 대리점 scope 저장
  - [ ] DEALER: 자사 scope만 저장
  - [ ] HEADQUARTER: 미리보기 전용 (저장 비활성)
- [ ] 레거시 그리드 마이그레이션 완료 (필요 시 `/admin/customize`)

---

## 3. 본사 서버 환경

- [ ] Docker 24+ / Compose v2+
- [ ] 디스크 20GB+ 여유 (DB + uploads)
- [ ] 포트 8080 개방 (내부망/VPN)
- [ ] `.env.production` 설정
  - [ ] `POSTGRES_PASSWORD` — 강력한 랜덤
  - [ ] `NEXTAUTH_SECRET` — `openssl rand -base64 32`
  - [ ] `NEXTAUTH_URL` — 실제 접속 URL (예: `http://192.168.x.x:8080`)
  - [ ] `ALLOWED_ORIGINS` — NEXTAUTH_URL과 동일 origin
  - [ ] `RUN_SEED=false` (운영, 최초 1회만 true)

---

## 4. 배포 실행

```powershell
cd intranet-part1
docker compose --env-file .env.production up -d --build
```

또는 개발 PC에서 동기화 후 이미지 이전:

```powershell
npm run docker:sync
```

- [ ] `curl http://<서버>:8080/api/health` → `"status":"healthy"`
- [ ] `npm run smoke -- http://<서버>:8080`

---

## 5. 배포 후 (운영)

- [ ] 관리자 로그인 (`admin@intranet.local` → **즉시 비밀번호 변경**)
- [ ] Page Builder → 대시보드/배너 레이아웃 1회 저장 테스트
- [ ] 대리점 1곳 Pilot → DEALER 계정 Page Builder 접근·저장
- [ ] Nginx HTTPS 적용 (선택, 사내 CA)
- [ ] DB 백업 cron / `docker compose` volume 백업 확인
- [ ] 감사 로그 `/admin/activity` 동작 확인

---

## 6. Part 2 (이번 MVP 범위 외)

다음은 **v1.1.0에 포함되지 않음** — Part 2에서 개발:

- [ ] 발주서·세금계산서·카드결제·계약서 **실기능**
- [ ] Page Builder 거래 블록 → API 연동 (`data-commerce-module`)
- [ ] PG 결제, 전자세금계산서, 전자계약

---

## 7. 롤백

- [ ] 이전 Docker 이미지 태그 보관
- [ ] DB 스냅샷 (배포 직전)
- [ ] 문제 시: `docker compose down` → 이전 이미지 + DB 복원

---

## 8. 연락·문서

| 문서 | 용도 |
|------|------|
| [DEPLOY.md](../DEPLOY.md) | 상세 배포 가이드 |
| [PAGE_BUILDER.md](./PAGE_BUILDER.md) | Page Builder 운영 |
| [CHANGELOG.md](../CHANGELOG.md) | v1.1.0 변경 이력 |
| [ADMIN_MANUAL.md](../ADMIN_MANUAL.md) | 관리자 매뉴얼 |

**서명:** _________________ **일자:** _________
