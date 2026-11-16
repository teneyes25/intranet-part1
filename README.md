# intranet-part1

**v1.0.0 — Part 1 완전 상품화** · 본사·대리점 통합 인트라넷

## 기능 요약

| 영역 | 기능 |
|------|------|
| 워크스페이스 | 공지·게시판·뉴스·홍보실·상품자료실 |
| 업무 | 전자결재(AI 기안), 문서함, 근태(본사) |
| AI | RAG 에이전트, 뉴스 자동수집, 지식 동기화 |
| 관리 | 사용자/대리점, 커스터마이징, Rollout, 모니터링 |
| Part 2 | `/api/v2` 주문·결제·배송·재고·D2D 거래 (기반) |

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind, shadcn/ui
- **Backend:** Next.js API Routes, NextAuth (JWT)
- **DB:** PostgreSQL 16 + pgvector, Prisma ORM
- **Cache:** Redis 7 (rate limit)
- **Infra:** Docker Compose, Nginx reverse proxy
- **AI:** OpenAI API, HuggingFace embeddings, hybrid search

## 빠른 배포 (Docker)

```bash
cp .env.production.example .env.production   # 비밀번호·SECRET 변경
docker compose --env-file .env.production up -d --build
npm run final:check -- http://localhost:8080
```

접속: **http://localhost:8080** (HTTPS: `nginx/nginx.ssl.example.conf` 참고)

## 검증 (Phase 9)

```bash
npm run typecheck
npm run build
npm run final:check -- http://localhost:8080
npm run test:e2e
npm run load-test -- http://localhost:8080 200 45
```

## 프로젝트 구조

```
intranet-part1/
├── prisma/           # 스키마 · migrations · seed
├── src/app/          # 페이지 + API (v1 + /api/v2)
├── src/features/     # board, approval, dealers, monitoring…
├── nginx/            # 프록시 · SSL 예시
├── scripts/          # smoke, final-check, backup, load-test
├── e2e/              # Playwright phase1~9
├── DEPLOY.md         # 배포·Rollout·본사 이전
├── ADMIN_MANUAL.md   # 관리자 매뉴얼
└── USER_MANUAL.md    # 사용자 매뉴얼
```

## API

| Namespace | 설명 |
|-----------|------|
| `/api/*` | Part 1 — 게시판, AI, 검색, 알림 |
| `/api/v2/*` | Part 2 — orders, payments, shipments, inventory, trades |
| `/api/admin/monitoring` | 실시간 운영 메트릭 (ADMIN) |

## 시드 계정

| 이메일 | 비밀번호 | 권한 |
|--------|----------|------|
| admin@intranet.local | password1234 | ADMIN (최초 비밀번호 변경) |

일반 사용자는 **/signup** 으로 가입 신청 후 관리자 승인으로 로그인합니다.

## Rollout (100 대리점)

5그룹 × 20곳 — `docs/dealer-import-template.csv` · **DEPLOY.md §18**

## Part 2 확장 계획

- PG 결제, TMS 배송 연동, 재고 예약/차감, 모바일 딜러 앱
- 기존 `/api/v2` 모델·엔드포인트 확장

## 문서

- [DEPLOY.md](./DEPLOY.md) — 배포·HTTPS·백업·72h 모니터링
- [ADMIN_MANUAL.md](./ADMIN_MANUAL.md) — 관리자 운영
- [CHANGELOG.md](./CHANGELOG.md) — v1.0.0 릴리스 노트

## 라이선스

Private — 본사 내부 사용
