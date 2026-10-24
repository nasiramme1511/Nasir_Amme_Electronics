-- Nasir Amme Electronics — Migration: Security & Data Integrity Hardening
-- Location: Dire Dawa, Ethiopia

-- 1. Drop CASCADE foreign key constraints on sales children (DAT-01)
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_saleId_fkey";
ALTER TABLE "sale_items" DROP CONSTRAINT IF EXISTS "sale_items_saleId_fkey";

-- 2. Alter payments to support cash sessions
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "cashSessionId" TEXT;

-- 3. Alter sale_items to freeze warranty snapshots at checkout
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "warrantyExpiresAt" TIMESTAMP(3);
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "warrantyMonthsSnapshot" INTEGER NOT NULL DEFAULT 0;

-- 4. Create cash_sessions table for cashier till shift reconciliation
CREATE TABLE IF NOT EXISTS "cash_sessions" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingFloat" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "closingCashCounted" DECIMAL(14,2),
    "expectedCash" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "cashDifference" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalSalesCash" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalRefundsCash" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalTelebirr" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalCbeBirr" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalOther" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- 5. Create indexes on cash_sessions and payments
CREATE INDEX IF NOT EXISTS "cash_sessions_shopId_cashierId_status_idx" ON "cash_sessions"("shopId", "cashierId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "cash_sessions_shopId_sessionNumber_key" ON "cash_sessions"("shopId", "sessionNumber");
CREATE INDEX IF NOT EXISTS "payments_shopId_cashSessionId_idx" ON "payments"("shopId", "cashSessionId");

-- 6. Add ON DELETE RESTRICT foreign keys (DAT-01)
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Add database-level CHECK constraint enforcing non-negative inventory (CON-02)
ALTER TABLE "products" ADD CONSTRAINT "products_on_hand_non_negative" CHECK ("onHand" >= 0);

-- 8. Create atomic PostgreSQL sequence generators for document numbers (CON-03)
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS po_number_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS gr_number_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS return_number_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS count_number_seq START WITH 100 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS cash_session_number_seq START WITH 100 INCREMENT BY 1;
