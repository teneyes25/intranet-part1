# API 문서 (API_DOCUMENTATION)

> intranet-part1 REST API — Markdown 형식

**Base URL**: `http://localhost:8080` (Nginx) 또는 `http://localhost:3000` (App 직접)

**인증**: NextAuth 세션 쿠키 (대부분 API) · `x-cron-secret` (cron 전용)

---

## Health

### `GET /api/health`

공개. DB·Redis 상태 확인.

**Response 200**
```json
{
  "status": "healthy",
  "checks": { "app": "ok", "database": "ok", "redis": "ok" }
}
```

---

## Auth

### `POST /api/auth/register`

회원가입 (Zod 검증, Rate limit: auth tier)

### `GET|POST /api/auth/[...nextauth]`

NextAuth 세션

---

## Notifications

### `GET /api/notifications`

인증 필요. 알림 목록 + unread count.

### `PATCH /api/notifications`

```json
{ "id": "..." }       // 단건 읽음
{ "all": true }        // 전체 읽음
```

---

## AI

### `POST /api/ai/chat`

Rate limit: **ai** tier

```json
{
  "question": "최신 뉴스 요약해줘",
  "conversationId": "optional-cuid",
  "history": [{ "role": "user", "content": "..." }]
}
```

**Response**
```json
{
  "answer": "...",
  "sources": [{ "title", "url", "score", "snippet" }],
  "mode": "generative|extractive",
  "intent": "news_summary|related_cases|general",
  "conversationId": "..."
}
```

### `POST /api/ai/draft`

전자결재 AI 기안 (Hybrid RAG + OpenAI)

```json
{ "title": "...", "purpose": "...", "templateName": "..." }
```

### `POST /api/ai/draft/hint`

규칙 기반 실시간 힌트

### `POST /api/ai/ingest`

ADMIN — 전체 게시글 벡터 색인

### `POST /api/ai/news/collect`

ADMIN 또는 `x-cron-secret` — 뉴스 수집

---

## Board · Files

### `GET|POST /api/boards/[key]/posts`

게시글 API

### `GET /api/files/[id]`

첨부 다운로드 (RBAC)

---

## Search

### `GET /api/search?q=...`

통합 검색 (FTS + Rate limit: api tier)

---

## Security

| 기능 | 구현 |
|------|------|
| Rate Limit | Redis — auth 10/min, ai 30/min, api 120/min |
| CORS | `ALLOWED_ORIGINS` |
| CSP | `next.config.ts` + security headers |
| RBAC | middleware + `canSeeNavItem` |

---

## Error Codes

| HTTP | 의미 |
|------|------|
| 401 | 미인증 |
| 403 | CORS/RBAC 거부 |
| 429 | Rate limit |
| 503 | Health degraded |

---

상세 Part2 설계: `docs/PART2_API_DESIGN.md`
