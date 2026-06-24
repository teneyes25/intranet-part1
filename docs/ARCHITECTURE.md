# 아키텍처 다이어그램

> intranet-part1 — Phase 4 상품화 기준 (2025-06)

## 시스템 개요

```mermaid
flowchart TB
  subgraph Client
    Browser[PWA Browser]
    Mobile[Mobile / Tablet]
  end

  subgraph Edge
    Nginx[Nginx :8080]
  end

  subgraph App["Next.js 15 App (standalone)"]
    Pages[App Router Pages]
    API[API Routes]
    MW[Middleware RBAC]
    AI[AI Layer]
  end

  subgraph Data
    PG[(PostgreSQL + pgvector)]
    Redis[(Redis)]
    Uploads[uploads volume]
  end

  Browser --> Nginx
  Mobile --> Nginx
  Nginx --> Pages
  Nginx --> API
  Pages --> MW
  API --> MW
  API --> AI
  AI --> PG
  API --> PG
  API --> Redis
  API --> Uploads
```

## AI / RAG 파이프라인

```mermaid
flowchart LR
  Q[User Question] --> Intent[Intent Detection]
  Intent --> Hybrid[Hybrid Search]
  Hybrid --> Vec[Vector pgvector]
  Hybrid --> FTS[Full-Text Search]
  Vec --> RRF[RRF Rerank]
  FTS --> RRF
  RRF --> LLM[OpenAI gpt-4o-mini]
  RRF --> Extract[Extractive Fallback]
  LLM --> Answer[Markdown Answer + Sources]
  Extract --> Answer
  Answer --> Memory[(ai_conversations)]
```

## 알림 흐름

```mermaid
sequenceDiagram
  participant U as User
  participant A as Approval Action
  participant N as Notification Service
  participant DB as notifications table
  participant T as Topbar Bell

  U->>A: 상신 submit
  A->>N: createNotification(APPROVAL_REQUEST)
  N->>DB: insert
  T->>DB: GET /api/notifications
  T->>U: In-app badge
```

## Phase 4 추가 컴포넌트

| 영역 | 신규/개선 |
|------|-----------|
| UI | Sonner toast, Recharts, PWA manifest+SW, a11y |
| AI | Hybrid search, conversation memory, markdown chat |
| 기능 | notifications, user preferences, activity log, i18n, help |
| 테스트 | Playwright E2E, load-test.mjs |
| 문서 | USER/ADMIN/API manual |

## 디렉터리 구조

```
src/
├── app/              # Routes + API
├── features/         # Domain modules
├── components/       # UI + layout
├── lib/              # infra (ai, security, redis…)
├── i18n/             # ko/en messages
└── config/           # navigation
prisma/
├── schema.prisma
└── migrations/
```

---

배포: `DEPLOY.md` · 사용자: `USER_MANUAL.md` · 관리: `ADMIN_MANUAL.md`
