# Knowledge phase 2 — 로컬 저장소 리허설

이 문서는 `StorageAdapter`로 문서 한 건을 별도 저장소에 보관하는 흐름을, 현재 로컬 어댑터로 한 번 실행한 결과다. 클라우드 공급자는 선정하지 않았다. 원격 저장소에는 연결하지 않았고, 이 단계를 클라우드 연동 완료로 보지 않는다.

기준 커밋은 phase 1 `0ef1e7dee66655b96e1ab327aead75ad6d2bf502`이다. 기능 플래그 `KNOWLEDGE_V1_ENABLED`는 켜지 않았다. 스크립트는 인트라넷 라우트를 타지 않고 `KnowledgeService`를 직접 호출한다. 운영 서버와 운영 DB는 변경하지 않았다.

## 실행

저장소 루트에서:

```bash
npx tsx scripts/knowledge-phase2-local-scenario.ts
```

같은 명령은 `npm run knowledge:phase2-local`이다.

구성:

- 카탈로그: 이 프로세스의 메모리 PGlite. 로컬 Postgres `knowledge_phase1_dev`와 운영 DB에는 접속하지 않는다.
- 원본 바이트: `LocalFsStorageAdapter`가 이번 실행의 임시 디렉터리에만 쓴다. 키는 `originals/{tenantId}/{versionId}`이다.
- 직원 그룹: `assignStaffGroups`로 `knowledge_staff_groups`에 기록하고, `listStaffGroups`로 읽어 `userContextFromSession`에 넣는다. 역할에서 sales/design을 만들지 않는다. 세션 헬퍼의 기본 테넌트는 `french-maison`이므로 이 시나리오는 테넌트를 `fm`으로 지정한다.
- 종료 시 이 실행이 만든 임시 디렉터리만 삭제하고 PGlite를 닫는다.

## 이번 실행 결과

명령은 종료 코드 0이었다. 여섯 단계가 모두 `ok: true`였다.

| 단계 | 확인 |
| --- | --- |
| 원본 업로드 및 SHA-256 | 저장 객체의 SHA-256이 업로드 해시와 같고 바이트가 원문과 같다. |
| 미승인 검색 제외 | 승인 전 `sales` 검색 결과는 0건이다. |
| 지정 버전 승인·작업 처리 | `APPROVE` sequence 1, 대상 versionId는 업로드가 반환한 값. `processJobs` 결과 1건, 상태 `DONE`. |
| 허용 직원 | `sales` 검색 1건. versionId와 hash가 업로드와 같고, 다운로드 SHA-256이 같다. |
| 미허용 직원 | `design` 검색 0건. 다운로드는 `forbidden`. |
| 철회 | sequence 2 `REVOKE` 이후 `sales` 검색 0건, 다운로드 `forbidden`. |

이번 실행의 원문 SHA-256은 `e70772d670a6a35504c1a47aae84acf05cf8b226970821e1c6893d6099d02227`이다. versionId는 실행마다 새로 만들어지며, 이번 값은 `2a1b69a6-97a1-4114-8ae2-9b9cbcc8afae`였다. 객체 루트는 `/tmp/knowledge-phase2-local-M5D0hV/objects`였고, 스크립트 종료 시 그 디렉터리는 삭제된다.

철회는 검색과 다운로드를 막는다. 이번 서비스는 철회 때 원본 객체를 지우지 않는다. 실행 중에는 객체가 남아 있었고 해시도 그대로였다. 보관 기간은 아직 정하지 않았다.

이 스크립트는 이후 `scripts/knowledge-storage-scenario.ts`의 로컬 경로를 호출한다. 옵션을 주지 않으면 로컬 어댑터만 사용한다.

원격 어댑터, 자격 증명, 첫 연결에 필요한 설정은 `docs/KNOWLEDGE_S3_REMOTE_VERIFY.md`에 있다. 장기 access key는 필수 조건이 아니다. 이 문서를 클라우드 연동 완료로 읽지 않는다.
