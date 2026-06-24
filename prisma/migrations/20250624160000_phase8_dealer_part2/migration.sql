-- Phase 8: 대리점 Rollout + Part 2 기반 (Day 34)

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEALER_ROLLOUT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DEALER_IMPORT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ORDER_CREATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "ShipmentStatus" AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');
CREATE TYPE "DealerTradeStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "rolloutActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "rolloutGroupId" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "appNameOverride" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "logoStorageKey" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "sidebarColor" TEXT;
ALTER TABLE "dealers" ADD COLUMN IF NOT EXISTS "sidebarForeground" TEXT;

CREATE TABLE IF NOT EXISTS "rollout_groups" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rollout_groups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rollout_groups_key_key" ON "rollout_groups"("key");

CREATE TABLE IF NOT EXISTS "rollout_feedbacks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealerId" TEXT,
    "category" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rollout_feedbacks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "rollout_feedbacks_dealerId_createdAt_idx" ON "rollout_feedbacks"("dealerId", "createdAt");

ALTER TABLE "dealers" DROP CONSTRAINT IF EXISTS "dealers_rolloutGroupId_fkey";
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_rolloutGroupId_fkey" FOREIGN KEY ("rolloutGroupId") REFERENCES "rollout_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "dealers_rolloutGroupId_idx" ON "dealers"("rolloutGroupId");
CREATE INDEX IF NOT EXISTS "dealers_rolloutActive_isActive_idx" ON "dealers"("rolloutActive", "isActive");

ALTER TABLE "rollout_feedbacks" DROP CONSTRAINT IF EXISTS "rollout_feedbacks_userId_fkey";
ALTER TABLE "rollout_feedbacks" ADD CONSTRAINT "rollout_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rollout_feedbacks" DROP CONSTRAINT IF EXISTS "rollout_feedbacks_dealerId_fkey";
ALTER TABLE "rollout_feedbacks" ADD CONSTRAINT "rollout_feedbacks_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "product_skus" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "productPostId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_skus_sku_key" ON "product_skus"("sku");

CREATE TABLE IF NOT EXISTS "inventory_items" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_dealerId_skuId_key" ON "inventory_items"("dealerId", "skuId");

CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "buyerDealerId" TEXT NOT NULL,
    "sellerDealerId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "approvalDocumentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_approvalDocumentId_key" ON "orders"("approvalDocumentId");
CREATE INDEX IF NOT EXISTS "orders_buyerDealerId_status_idx" ON "orders"("buyerDealerId", "status");
CREATE INDEX IF NOT EXISTS "orders_sellerDealerId_idx" ON "orders"("sellerDealerId");

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_orderId_key" ON "payments"("orderId");

CREATE TABLE IF NOT EXISTS "shipments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PREPARING',
    "trackingNo" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_orderId_key" ON "shipments"("orderId");

CREATE TABLE IF NOT EXISTS "dealer_trades" (
    "id" TEXT NOT NULL,
    "fromDealerId" TEXT NOT NULL,
    "toDealerId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "DealerTradeStatus" NOT NULL DEFAULT 'PROPOSED',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dealer_trades_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dealer_trades_orderId_key" ON "dealer_trades"("orderId");
CREATE INDEX IF NOT EXISTS "dealer_trades_fromDealerId_status_idx" ON "dealer_trades"("fromDealerId", "status");
CREATE INDEX IF NOT EXISTS "dealer_trades_toDealerId_status_idx" ON "dealer_trades"("toDealerId", "status");

ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_dealerId_fkey";
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_skuId_fkey";
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "product_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_buyerDealerId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerDealerId_fkey" FOREIGN KEY ("buyerDealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_sellerDealerId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerDealerId_fkey" FOREIGN KEY ("sellerDealerId") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_approvalDocumentId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_approvalDocumentId_fkey" FOREIGN KEY ("approvalDocumentId") REFERENCES "approval_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_createdById_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_skuId_fkey";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_orderId_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_orderId_fkey";
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dealer_trades" DROP CONSTRAINT IF EXISTS "dealer_trades_fromDealerId_fkey";
ALTER TABLE "dealer_trades" ADD CONSTRAINT "dealer_trades_fromDealerId_fkey" FOREIGN KEY ("fromDealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dealer_trades" DROP CONSTRAINT IF EXISTS "dealer_trades_toDealerId_fkey";
ALTER TABLE "dealer_trades" ADD CONSTRAINT "dealer_trades_toDealerId_fkey" FOREIGN KEY ("toDealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dealer_trades" DROP CONSTRAINT IF EXISTS "dealer_trades_skuId_fkey";
ALTER TABLE "dealer_trades" ADD CONSTRAINT "dealer_trades_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dealer_trades" DROP CONSTRAINT IF EXISTS "dealer_trades_orderId_fkey";
ALTER TABLE "dealer_trades" ADD CONSTRAINT "dealer_trades_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
