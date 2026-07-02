# MVP 배포 체크리스트 — v1.2.1 (Phase 5 상용화 MVP)

> **Phase 5 완료 — Firebase 설정 제외 상용화 MVP 완성**  
> PostgreSQL 중심. Firebase는 `FIREBASE_ENABLED=false` (배포 후 선택 활성화).  
> 본사 서버 상세: [HQ_DEPLOYMENT_FINAL_CHECKLIST.md](./HQ_DEPLOYMENT_FINAL_CHECKLIST.md)

---

## 1. 릴리스 정보

| 항목 | 값 |
|------|-----|
| 버전 | **1.2.1** |
| 빌드 확인 | `GET /api/health` → `buildId` |
| 주요 기능 | Page Builder · 대리점 Self-Service · Design v4 · 회사 테마 · 게시판 재구성 |
| Firebase | 비활성 (코드 준비만) |

---

## 2. 배포 전 (개발·스테이징)

- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run test:ui-upgrade` 통과
- [ ] `npm run production:check -- http://localhost:8080` 통과
- [ ] `npm run smoke -- http://localhost:8080` 통과
- [ ] Page Builder: ADMIN 저장 / HQ read-only / DEALER scope
- [ ] `FIREBASE_ENABLED=false` 확인

---

## 3. 본사 서버 환경

- [ ] Docker 24+ / Compose v2+
- [ ] 디스크 20GB+ · 포트 **8080** 개방
- [ ] `.env.production`: `NEXTAUTH_SECRET`, `POSTGRES_PASSWORD`, `NEXTAUTH_URL`, `ALLOWED_ORIGINS`
- [ ] `FIREBASE_ENABLED=false`
- [ ] `RUN_SEED=false` (운영)

---

## 4. 배포 실행

```powershell
docker compose --env-file .env.production up -d --build
```

- [ ] `/api/health` healthy
- [ ] `npm run smoke -- http://<서버>:8080`

---

## 5. 배포 후

- [ ] 관리자 비밀번호 변경
- [ ] Page Builder · 뉴스 키워드 · 브랜딩 설정
- [ ] 백업·감사 로그 확인

---

## 6. 문서

| 문서 | 용도 |
|------|------|
| [HQ_DEPLOYMENT_FINAL_CHECKLIST.md](./HQ_DEPLOYMENT_FINAL_CHECKLIST.md) | **본사 배포 최종** |
| [DEPLOY.md](../DEPLOY.md) | 상세 가이드 |
| [CHANGELOG.md](../CHANGELOG.md) | v1.2.1 |

**서명:** _________________ **일자:** _________
