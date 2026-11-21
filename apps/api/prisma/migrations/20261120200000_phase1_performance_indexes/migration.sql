-- CreateIndex
CREATE INDEX IF NOT EXISTS "Store_tenantId_isActive_idx" ON "Store"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_tenantId_isActive_createdAt_idx" ON "Product"("tenantId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_tenantId_isActive_name_idx" ON "Product"("tenantId", "isActive", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Batch_tenantId_storeId_quantityRemaining_expiryDate_idx" ON "Batch"("tenantId", "storeId", "quantityRemaining", "expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Batch_productId_storeId_quantityRemaining_idx" ON "Batch"("productId", "storeId", "quantityRemaining");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Batch_tenantId_storeId_productId_batchNumber_idx" ON "Batch"("tenantId", "storeId", "productId", "batchNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Supplier_tenantId_isActive_idx" ON "Supplier"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_createdAt_idx" ON "PurchaseOrder"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseItem_purchaseOrderId_idx" ON "PurchaseItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseItem_batchId_idx" ON "PurchaseItem"("batchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_tenantId_creditBalance_idx" ON "Customer"("tenantId", "creditBalance");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_status_createdAt_idx" ON "Sale"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_tenantId_createdAt_idx" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_tenantId_gatewayRef_status_idx" ON "Payment"("tenantId", "gatewayRef", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Return_tenantId_createdAt_idx" ON "Return"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Return_tenantId_refundMethod_idx" ON "Return"("tenantId", "refundMethod");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReturnItem_saleItemId_idx" ON "ReturnItem"("saleItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_tenantId_type_createdAt_idx" ON "Notification"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnomalyFlag_tenantId_referenceId_type_idx" ON "AnomalyFlag"("tenantId", "referenceId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnomalyFlag_tenantId_userId_type_status_idx" ON "AnomalyFlag"("tenantId", "userId", "type", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_subscriptionId_createdAt_idx" ON "SubscriptionInvoice"("subscriptionId", "createdAt");
