# Pilot FAQ — Ten Eyes Intranet Part 1

> **버전:** v1.7.0-pre · **Pilot Must #1~13**  
> Part 2(멀티테넌트·고급 워크플로)는 별도 로드맵 — 본 FAQ는 Part 1 Pilot 범위입니다.

---

## Pilot이란?

본사·대리점 일부 사용자가 **전자결재 · 문서함 · 통합검색 · AI** 를 실제 업무 흐름으로 검증하는 단계입니다.  
`PILOT_MODE=true` 시 사이드바에서 attendance는 숨기고 approval/documents/search가 노출됩니다.

---

## 로그인·계정

| 질문 | 답변 |
|------|------|
| 데모 계정은? | `admin@intranet.local`, `hq@intranet.local`, `dealer@intranet.local` / `password1234` |
| Pilot 시작 전 필수? | 관리자 **비밀번호 즉시 변경**, `NEXTAUTH_SECRET`·DB 비밀번호 강화 |
| 대리점은 무엇이 보이나? | DEALER role 기준 메뉴 + dealer scope 데이터 (타 대리점 문서·검색 결과 미노출) |

---

## 전자결재 (Must #11~12)

| 질문 | 답변 |
|------|------|
| AI 초안은 어디서? | 새 기안 → Step 2 「AI 초안 생성」 |
| 추천 결재선? | Step 2 「AI 추천 결재선」 — 100만원 초과 시 ADMIN 단계 추가 |
| 완료 후 문서함? | **COMPLETED** 시 자동 보관 + AI ingest (Pilot #2 파이프라인) |
| Compliance toast? | 제목·본문·결재선 누락 시 경고 |

---

## Command Palette (Must #13)

| 질문 | 답변 |
|------|------|
| 단축키? | **Ctrl+K** (Mac: **⌘K**) |
| 검색 범위? | 메뉴 · 게시물 · 문서함 · 사용자 (각 최대 5건, dealer scope) |
| 통합 검색과 차이? | Cmd+K = 빠른 이동 · `/search` = 필터·의미 검색 |

---

## AI 에이전트

| 질문 | 답변 |
|------|------|
| OpenAI 키 없으면? | 추출형 답변 + 기본 초안 골격 (fallback) |
| 방금 결재된 문서 검색? | COMPLETED 후 ingest 완료 → AI Chat에서 질의 가능 |
| 데이터 유출 방지? | RAG chunk에 dealer_id scope · HQ/ADMIN은 전체 |

---

## Dashboard

| 질문 | 답변 |
|------|------|
| 최근 활동 피드? | AuditLog + 알림 + 게시 통합 타임라인 |
| Pilot KPI? | ADMIN만 7일 KPI 스트립 (활성 대리점·AI·Page Builder 등) |

---

## Part 2 예고 (Pilot 범위 외)

- NestJS 마이크로서비스 분리 **없음** (현재 Next.js 모놀리식 유지)
- react-flow 결재선 시각화 · 고급 BPM
- Firebase 실시간 알림 (현재 `FIREBASE_ENABLED=false`)
- Liferay급 50k 모듈 생태계 → **우리는 shadcn + Prisma 경량 스택**

---

## 문제 발생 시

1. `/api/health` → `status: healthy`, `pilotModules` 확인  
2. `npm run pilot:check -- http://<서버>:8080`  
3. `/admin/activity` 감사 로그  
4. Pilot 피드백 → `/admin/pilot` 또는 배너 링크

**담당:** _________________ **Pilot 시작일:** _________
