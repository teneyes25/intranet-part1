# Part 2 API 설계 (대리점 거래/결제/배송)

## 버전 전략

- Base URL: `/api/v2`
- Part 1 API는 `/api/*` 유지 (breaking change 없음)
- Part 2 신규 도메인만 v2 네임스페이스

## RESTful 리소스 (초안)

| 리소스 | Method | Path | Role |
|--------|--------|------|------|
| 주문 | GET | `/api/v2/orders` | DEALER+ |
| 주문 | POST | `/api/v2/orders` | DEALER |
| 주문 | GET | `/api/v2/orders/:id` | 소유/본사 |
| 결제 | POST | `/api/v2/payments` | DEALER |
| 결제 | GET | `/api/v2/payments/:id` | 소유/본사 |
| 배송 | GET | `/api/v2/shipments` | DEALER+ |
| 배송 | PATCH | `/api/v2/shipments/:id/status` | HEADQUARTER |

## User / Dealer 모델 확장 검토

### 현재 (Part 1) — 적합

```prisma
User { role, dealerId?, approvalStatus }
Dealer { code, name, isActive }
```

### Part 2 권장 추가

```prisma
model Dealer {
  // 기존 필드 유지
  businessNumber  String?   // 사업자번호
  region          String?   // 지역
  creditLimit     Decimal?  // 여신 한도
  orders          Order[]
}

model Order {
  id        String @id
  dealerId  String
  dealer    Dealer @relation(...)
  status    OrderStatus
  items     OrderItem[]
  payment   Payment?
  shipment  Shipment?
}
```

**결론:** `User.dealerId` + `Dealer.code` 구조는 Part 2 확장에 **적합**.  
대리점 사용자는 `dealerId`로 데이터 격리, 본사/관리자는 전체 조회 RBAC 적용.

## RBAC Part 2

| Role | 주문 | 결제 | 배송 상태 변경 |
|------|------|------|----------------|
| DEALER | 본인 대리점 CRUD | 본인 | 조회만 |
| HEADQUARTER | 전체 R | 전체 R | UPDATE |
| ADMIN | 전체 CRUD | 전체 CRUD | 전체 CRUD |

## 공통 패턴 (Part 1 재사용)

- `withApiGuard()` — Rate limit + CORS + RBAC
- `writeAudit()` — 주문/결제 감사 로그
- Redis cache — 상품 카탈로그, 대리점 정보

## 마이그레이션 순서 (권장)

1. Prisma 모델 추가 (Order, Payment, Shipment)
2. `/api/v2/*` Route Handler scaffold
3. Dealer 포털 UI (`/dealer-portal/orders`)
4. 본사 관리 UI (`/headquarter/orders`)
5. PG/택배사 연동 Adapter 레이어
