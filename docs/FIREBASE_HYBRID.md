# Firebase 하이브리드 통합 가이드

PostgreSQL + Prisma(코어 데이터)와 Firebase(Auth·Storage·Firestore·FCM)를 병행합니다.  
**Firebase 환경변수가 없으면 기존 로컬/Docker 동작만 사용**합니다.

## 아키텍처

```
[브라우저]
  ├─ NextAuth JWT 세션 (PostgreSQL User)
  ├─ Firebase Auth (Google 등) → idToken → NextAuth firebase provider
  ├─ Firestore 리스너 (알림, Page Builder 협업)
  └─ FCM Web Push

[Next.js Server]
  ├─ Prisma → PostgreSQL (전자결재, PageLayout, User, Notification 원본)
  ├─ firebase-admin → Storage / Firestore sync / FCM send
  └─ uploads/ 로컬 디스크 (Firebase 실패 시 폴백)
```

## 1. Firebase 콘솔 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. **Authentication** → Google(및 Email/Password) 활성화
3. **Firestore Database** 생성
4. **Storage** 버킷 생성
5. **Cloud Messaging** → Web Push → VAPID 키 발급
6. 서비스 계정 JSON 다운로드

## 2. 환경변수

`.env` / `.env.production` — `.env.example` Firebase 섹션 참고.

## 3. Google 로그인

Prisma `User.email`과 Firebase 이메일이 일치해야 합니다.

## 4. 기능 플래그

`FIREBASE_ENABLED=false` 시 전체 비활성. 개별 `FIREBASE_*_ENABLED`로 세부 제어.
