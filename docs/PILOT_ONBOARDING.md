# Pilot Onboarding — 15분 시작 가이드

> Ten Eyes Intranet **Part 1** v1.7.0-pre  
> Part 2에서 멀티테넌트·고급 워크플로가 확장됩니다. Pilot은 Part 1 Must #1~13 검증에 집중하세요.

---

## 1. 접속 (2분)

1. 브라우저에서 `http://<서버>:8080` 접속  
2. `hq@intranet.local` 또는 본사 배정 계정으로 로그인  
3. **Dashboard** — KPI 타일 · **최근 활동** · (ADMIN) Pilot KPI 확인  

---

## 2. 빠른 탐색 — Command Palette (2분)

1. **Ctrl+K** (Mac ⌘K)  
2. `전자결재` 입력 → Enter  
3. Topbar 검색창 옆 **K** 힌트 클릭도 동일  

---

## 3. 전자결재 End-to-End (6분)

| 단계 | 동작 |
|------|------|
| 1 | **새 기안** → 제목·카테고리 입력 |
| 2 | Step 2 → **AI 초안 생성** → Compliance toast 확인 |
| 3 | **AI 추천 결재선** 적용 |
| 4 | **상신(제출)** |
| 5 | 승인자 계정으로 로그인 → **승인** |
| 6 | **문서함** `/documents` — 완료 문서 확인 |
| 7 | **AI 에이전트** — "방금 결재된 …" 질의 |

---

## 4. 통합 검색 (2분)

1. `/search` 또는 Cmd+K  
2. 키워드 검색 + (선택) **AI 의미 검색**  
3. DEALER 계정으로 scope 차이 확인 (선택)  

---

## 5. 피드백 (3분)

- Pilot 배너 → 피드백 제출  
- ADMIN → `/admin/pilot` 모니터링 탭  
- 이슈 시 스크린샷 + 재현 URL 기록  

---

## 역할별 체크리스트

### HQ (본사)
- [ ] 기안 · AI 초안 · 추천 결재선  
- [ ] Cmd+K로 approval/documents 이동  
- [ ] Activity Feed에서 본인 활동 확인  

### 승인자 (ADMIN/HQ)
- [ ] 수신함 결재 · 반려 사유 입력  
- [ ] COMPLETED 후 문서함·AI 검색  

### DEALER (대리점)
- [ ] Pilot 메뉴 3종 노출  
- [ ] 타 대리점 문서 검색 미노출 확인  
- [ ] 대리점 포털 · (해당 시) Page Builder  

---

## 다음 단계 (Part 2 Preview)

| Part 1 (Pilot) | Part 2 (예정) |
|----------------|---------------|
| Next.js 모놀리식 | API 분리 검토 |
| Hybrid RAG AI | Fine-tune · Agent tool 확장 |
| Command Palette | Global notification center |
| Activity Feed | RFV adoption analytics (Open Intranet 벤치마크) |

---

**온보딩 완료 서명:** _________________ **일자:** _________
