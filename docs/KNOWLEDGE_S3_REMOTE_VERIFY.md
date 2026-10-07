# S3 방식 원본 저장소 — 첫 원격 검증 전에 필요한 것

이 문서는 첫 원격 검증을 위한 계정·설정 목록이다. 이 개발 단계에서는 원격 계정을 연결하지 않았고, 버킷을 만들지 않았다. 자동 만료나 보관 정책은 넣지 않았다. 보관·삭제 정책은 미확정이다.

기본 드라이버는 `local`이다. `KNOWLEDGE_STORAGE_DRIVER`를 비우거나 `local`로 두면 원본은 `uploads/knowledge`에 저장된다.

## 사용 SDK

`@aws-sdk/client-s3` `3.1145.0`을 설치했다. npm 등록 시각은 2026-10-02 확인 기준 2026-10-01이다.

확인한 문서:

- [SDK 자격 증명 기본 공급 경로](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html) — 객체가 없을 때 `s3:ListBucket`이 있으면 404, 없으면 403
- [PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html)
- [@aws-sdk/client-s3 3.1145.0](https://www.npmjs.com/package/@aws-sdk/client-s3)

서버 경계는 `server-only` `0.0.1`이다. 팩토리는 서버 모듈에서만 불러온다.

## 구현 범위

`S3StorageAdapter`가 `put`, `get`, `delete`, `exists`를 구현한다. 앱은 `createServerKnowledgeStorage()`를 사용한다.

- 클라이언트 설정에 `credentials`를 넣지 않는다. AWS SDK 기본 공급 경로(역할, SSO, 컨테이너, 인스턴스 프로파일, 프로세스가 이미 가진 임시 자격)를 사용한다. 장기 access key는 필수 조건이 아니고, 코드·로그·브라우저에 넣지 않는다.
- 원격 endpoint는 HTTPS다. `http://`는 `KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT=true`이고 호스트가 `localhost`, `127.0.0.1`, `::1`일 때만 허용한다. `http://[::1]:9000`의 `URL.hostname`은 `[::1]`이므로 대괄호를 벗긴 뒤 `::1`과 비교한다. path-style도 그 로컬 호스트에서만 켠다.
- `PutObject` 입력은 Bucket, Key, Body뿐이다. 공개 ACL과 공개 다운로드 URL을 만들지 않는다.
- 다운로드는 `KnowledgeService`가 직원·ACL·승인 버전을 확인한 뒤 `get`으로 원본을 읽는다.
- 철회는 검색·다운로드만 막는다. 원본 객체는 지우지 않는다.
- `exists`는 `NotFound` 또는 `NoSuchKey`(상태 없음 또는 404)만 false다. 권한 거부, 네트워크 장애, 5xx, 다른 404는 그대로 던진다.
- `put`이 5xx·시간 초과·연결 오류이면 같은 키를 다시 읽어 SHA-256이 같을 때만 성공으로 본다. 확인 읽기까지 실패하면 일반 업로드는 그 키를 `uncertain`으로 기록하고, 후속 대조와 정리가 필요하다고 남긴다.
- 리허설은 고유 접두사 아래 새 키를 쓰기 시도 전에 정리 후보로 등록한다. 정리는 그 후보만 지우며, 이번 실행의 접두사 밖과 다른 실행의 객체는 지우지 않는다.
- 시나리오와 정리가 끝난 뒤 최종 보고를 한 번 출력한다. `scenarioPassed`, `cleanupPassed`, `unresolvedObjects`를 구분한다. 정리 실패의 종료 코드는 1이다. 보고에는 오류 이름과 HTTP 상태만 넣고 stack은 넣지 않는다.
- `remoteConnected`는 객체 요청이 실제로 성공한 뒤에만 true다. 자격 증명 오류나 접속 실패로 성공한 요청이 없으면 false다. 요청은 성공했는데 시나리오나 정리가 실패하면 그 두 필드로 구분한다.
- 업로드 중 DB 기록이 실패해 객체를 지우는 일이 실패하면 키, 오류 이름, HTTP 상태만 기록한다.

## 첫 원격 검증에 필요한 항목

계정을 이 작업에서 만들지 않는다. 운영 계정과 분리된 검증용 계정과 비공개 버킷이 필요하다.

- 리전: `KNOWLEDGE_STORAGE_REGION`
- 버킷: `KNOWLEDGE_STORAGE_BUCKET`. Block Public Access를 켜 두고, 버킷 정책에 전체 공개 principal을 두지 않는다.
- 객체는 접두사 아래에 둔다. 리허설은 실행마다 `knowledge-rehearsal/<uuid>/`를 붙이고, 그 실행이 만든 키만 지운다. 버킷 삭제와 기존 객체 변경은 하지 않는다.
- 최소 권한:
  - `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` — `arn:aws:s3:::버킷/접두사/*`
  - `s3:ListBucket` — `arn:aws:s3:::버킷`. HeadObject가 없는 키를 404로 돌려야 `exists`가 false가 된다. 접두사 조건 때문에 403이 나오면 없는 객체로 처리하지 말고, 그 버킷에서 없는 키가 404가 되는 범위만 허용한다.
- 설정 이름. 값은 서버 환경에만 둔다.
  - `KNOWLEDGE_STORAGE_DRIVER=s3`
  - `KNOWLEDGE_STORAGE_BUCKET`
  - `KNOWLEDGE_STORAGE_REGION`
  - `KNOWLEDGE_STORAGE_ENDPOINT` — AWS 기본 endpoint를 쓸 때는 비운다. 있으면 HTTPS.
  - `KNOWLEDGE_STORAGE_PREFIX` — 선택
  - `KNOWLEDGE_STORAGE_REMOTE_VERIFY=true` — 리허설을 실제로 보낼 때만
- 자격 증명은 SDK 기본 공급 경로에 둔다. `KNOWLEDGE_STORAGE_ACCESS_KEY_ID` 같은 별도 키 설정은 없다.

원격 리허설:

```bash
npx tsx scripts/knowledge-storage-scenario.ts --adapter s3
```

위 확인 값과 버킷·리전이 없으면 클라이언트는 만들지 않고, 결과는 `remoteVerification: "not-run"`, `remoteConnected: false`, `skippedRemote: true`이다. 종료 코드는 2다. 인메모리 클라이언트 테스트는 실제 S3 연결이 아니다.

로컬 리허설:

```bash
npx tsx scripts/knowledge-storage-scenario.ts
```

Lifecycle, 객체 만료, 보관 기간 설정은 추가하지 않았다.
