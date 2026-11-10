-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "stockDeducted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unitType" TEXT NOT NULL DEFAULT 'PACK';

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "currentSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentSequence_tenantId_type_idx" ON "DocumentSequence"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSequence_tenantId_type_dateKey_key" ON "DocumentSequence"("tenantId", "type", "dateKey");

-- Seed DocumentSequence from existing Sales so cutover never duplicates existing receipt numbers
INSERT INTO "DocumentSequence" ("id", "tenantId", "type", "dateKey", "currentSeq", "updatedAt")
SELECT 
    gen_random_uuid(),
    s."tenantId",
    'RECEIPT',
    SUBSTRING(s."receiptNumber" FROM 5 FOR 8) AS "dateKey",
    COALESCE(MAX(CAST(NULLIF(SUBSTRING(s."receiptNumber" FROM 14), '') AS INTEGER)), 0) AS "currentSeq",
    NOW()
FROM "Sale" s
WHERE s."receiptNumber" ~ '^REC-[0-9]{8}-[0-9]+$'
GROUP BY s."tenantId", SUBSTRING(s."receiptNumber" FROM 5 FOR 8)
ON CONFLICT ("tenantId", "type", "dateKey")
DO UPDATE SET 
    "currentSeq" = GREATEST("DocumentSequence"."currentSeq", EXCLUDED."currentSeq"),
    "updatedAt" = NOW();

-- Seed DocumentSequence from existing Returns so cutover never duplicates existing return numbers
INSERT INTO "DocumentSequence" ("id", "tenantId", "type", "dateKey", "currentSeq", "updatedAt")
SELECT 
    gen_random_uuid(),
    r."tenantId",
    'RETURN',
    SUBSTRING(r."returnNumber" FROM 5 FOR 8) AS "dateKey",
    COALESCE(MAX(CAST(NULLIF(SUBSTRING(r."returnNumber" FROM 14), '') AS INTEGER)), 0) AS "currentSeq",
    NOW()
FROM "Return" r
WHERE r."returnNumber" ~ '^RET-[0-9]{8}-[0-9]+$'
GROUP BY r."tenantId", SUBSTRING(r."returnNumber" FROM 5 FOR 8)
ON CONFLICT ("tenantId", "type", "dateKey")
DO UPDATE SET 
    "currentSeq" = GREATEST("DocumentSequence"."currentSeq", EXCLUDED."currentSeq"),
    "updatedAt" = NOW();

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Batch_tenantId_productId_storeId_expiryDate_idx" ON "Batch"("tenantId", "productId", "storeId", "expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_tenantId_userId_read_createdAt_idx" ON "Notification"("tenantId", "userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_tenantId_customerId_status_idx" ON "Payment"("tenantId", "customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_saleId_idx" ON "Payment"("saleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_storeId_status_createdAt_idx" ON "Sale"("tenantId", "storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_customerId_status_idx" ON "Sale"("tenantId", "customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SaleItem_batchId_idx" ON "SaleItem"("batchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
