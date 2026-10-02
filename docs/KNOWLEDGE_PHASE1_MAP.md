# Knowledge v1 Phase 1 — 기존 코드 지도와 변경점

기준 커밋: `d988484` + 계약 프로토타입 `4cd3c01`. 운영 PC 코드와 같다고 가정하지 않는다.

## 재사용 (이번 PR에서 동작 변경 없음)

| 파일 | 역할 | Phase 1 결정 |
|---|---|---|
| `src/lib/uploads.ts` | 로컬 저장, 이미지는 압축 | 기존 경로 유지. 지식 원본은 `StorageAdapter`로 별도 보존 |
| `src/lib/ai/ingest.ts` | 게시글 HTML 색인 | 임베딩 모델/기존 색인 호출자 변경 없음 |
| `src/lib/ai/vector-store.ts` | sourceType 벡터 검색 | 외부 공개 금지. Knowledge 검색은 별도 리터럴+ACL |
| `src/lib/ai/hybrid-search.ts` | 게시판 키워드+벡터 | 변경 없음 |
| `src/lib/ai/chat.ts` | 메종이 답변 | 변경 없음. ctx를 바디로 받지 않음 |
| `src/lib/auth/session.ts` | NextAuth 쿠키 | 직원 세션은 인트라넷 전용. 외부 에이전트 인증으로 쓰지 않음 |
| `src/features/approval/actions.ts` | 결재 완료 | 플래그 OFF면 no-op 훅만 추가 |
| `prisma` Attachment | 게시 첨부 | 파괴적 변경 없음. `attachmentId` 문자열 매핑만 |

## 신규

| 경로 | 역할 |
|---|---|
| `src/lib/knowledge/*` | 계약 서비스, SQL 저장소, 로컬 원본 어댑터, 플래그 |
| `prisma/migrations/20261002120000_knowledge_v1` | additive 테이블 |
| `src/app/api/dev/knowledge/*` | ADMIN 상태 / 플래그 ON 검색 (세션 문맥만) |
| `src/app/(dashboard)/admin/knowledge-dev/page.tsx` | 개발 안내 화면 |

## 롤백

1. 기능 플래그를 켜지 않으면 기존 업무 경로와 동일하다.
2. 테이블만 제거하려면 개발 DB에서 `knowledge_*` 5개 테이블 DROP. 운영 DB에는 이번 작업으로 migrate/push 하지 않았다.
