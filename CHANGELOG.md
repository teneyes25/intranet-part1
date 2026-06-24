# Changelog

All notable changes to **intranet-part1** (Part 1) are documented here.

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
