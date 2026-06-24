# 본사 서버 이전 체크리스트

## 배포 전

- [ ] `.env.production` 모든 비밀번호/SECRET 교체
- [ ] `NEXTAUTH_URL` 실제 URL로 설정
- [ ] `ALLOWED_ORIGINS` 본사 도메인 등록
- [ ] `ALLOWED_IP_PREFIXES` 사내망 대역 확인
- [ ] 방화벽: 8080(또는 443)만 외부 개방, DB/Redis 내부 전용
- [ ] SSL 인증서 (Nginx HTTPS) 설정

## Docker 기동

```bash
docker compose up -d --build
node scripts/smoke-test.mjs http://<서버IP>:8080
docker compose logs -f app
```

## 데이터

- [ ] `npm run db:seed` 또는 기존 DB 마이그레이션
- [ ] uploads 볼륨 데이터 이전 (있을 경우)
- [ ] 백업 스크립트 cron 등록

## 백업 cron 예시 (Linux)

```cron
0 2 * * * /path/to/scripts/backup/postgres-backup.sh /var/backups/intranet/pg
0 3 * * * /path/to/scripts/backup/uploads-backup.sh /var/backups/intranet/uploads
```

## 복구

```bash
# PostgreSQL
docker exec -i intranet-db pg_restore -U intranet -d intranet -c < backup.dump

# uploads
docker run --rm -v intranet-uploads-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/uploads_YYYYMMDD.tar.gz -C /data
```

## 운영 점검

- [ ] `/api/health` → database: ok
- [ ] 관리자 로그인 + 사용자 승인 흐름
- [ ] 전자결재 → 문서함 자동 보관
- [ ] 뉴스 키워드 + 수동 수집 테스트
