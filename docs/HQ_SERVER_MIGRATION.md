# 본사 서버 배포 — 프로젝트 이전 가이드 (Day 36)

> v1.0.0-product-ready 태그 기준 · 상세는 `DEPLOY.md` §2, §19 참고

---

## 1. 프로젝트 복사 방법

### 방법 A — Git (권장)

```bash
# 본사 서버에서
git clone <저장소 URL> /opt/intranet-part1
cd /opt/intranet-part1
git checkout v1.0.0-product-ready
```

### 방법 B — 아카이브 전송

```powershell
# 개발 PC (Windows)
cd "intranet-part1"
git archive -o intranet-part1-v1.0.0.tar HEAD
# SCP / USB / 사내 파일서버로 전송
```

```bash
# 본사 Linux 서버
mkdir -p /opt/intranet-part1 && cd /opt/intranet-part1
tar xf intranet-part1-v1.0.0.tar
```

### 방법 C — Docker 이미지 export (오프라인)

```bash
docker save intranet-part1-app:latest | gzip > intranet-app.tar.gz
# 서버에서: docker load < intranet-app.tar.gz
```

**제외:** `.env`, `.env.production`, `node_modules`, `.next`, `uploads/*`, `postgres-data`

---

## 2. `.env.production` 실제 값 적용

```bash
cp .env.production.example .env.production
nano .env.production   # 또는 사내 Secret Manager
```

| 변수 | 로컬 Pilot | **본사 정식** |
|------|------------|---------------|
| `POSTGRES_PASSWORD` | intranet_pw | `openssl rand -base64 24` |
| `NEXTAUTH_SECRET` | dev 값 | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | http://localhost:8080 | `https://intranet.company.local` |
| `PILOT_MODE` | true (테스트) | **false** |
| `RUN_SEED` | false | true (최초 1회) → false |
| `RUN_DEMO_SEED` | true (테스트) | **false** |
| `RUN_DEALER_DEMO_SEED` | true (테스트) | false (필요 시 1회) |
| `ALLOWED_ORIGINS` | localhost | 본사 HTTPS URL만 |
| `OPENAI_API_KEY` | 개발 키 | **본사 전용 키** |
| `BEHIND_NGINX` | true | true |

---

## 3. 첫 배포 명령어 (본사 서버)

```bash
cd /opt/intranet-part1

# 1) 환경 파일 확인
test -f .env.production || { echo "missing .env.production"; exit 1; }

# 2) 빌드 & 기동
docker compose build app
docker compose up -d
docker compose restart nginx
sleep 60
curl -sf http://localhost:8080/api/health | jq .

# 4) 검증
npm ci
npm run final:check
npm run test:e2e -- --grep "smoke|Phase 9"

# 5) Pilot/데모 시드 OFF (정식 전환 시)
# .env.production: RUN_DEMO_SEED=false, PILOT_MODE=false
docker compose up -d --force-recreate app
```

### HTTPS (Nginx + SSL)

```bash
cp nginx/nginx.ssl.example.conf nginx/nginx.ssl.conf
# 인증서 경로 수정 후 compose nginx volumes 교체 — DEPLOY.md §17
```

### 백업 Cron

```bash
chmod +x scripts/backup/daily-backup.sh
# crontab: 0 2 * * * /opt/intranet-part1/scripts/backup/daily-backup.sh
```

---

## 4. 이전 후 72시간 — DEPLOY.md §19 표 참고

- `/admin/monitoring` · `/admin/system`
- Rollout group-1 활성화 전 smoke
- 백업·복구 테스트: `scripts/backup/restore-test.sh`

---

## 5. 롤백

```bash
docker compose down
# postgres-data / uploads-data 볼륨 복원 (백업에서)
docker compose up -d
git checkout v1.0.0-product-ready  # 또는 이전 태그
docker compose build app && docker compose up -d
```
