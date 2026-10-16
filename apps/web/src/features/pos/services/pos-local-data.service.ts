import {
  posDb,
  LocalProductRecord,
  LocalCustomerRecord,
  OfflineSalePayload,
  OfflineSaleRecord,
  generateLocalReceiptNumber,
  generateClientTxId,
} from '../db/pos-db';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { customersApi } from '@/features/customers/services/customers-api';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { toast } from 'sonner';

export interface LocalSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  cachedProductsCount: number;
  pendingSalesCount: number;
  conflictSalesCount: number;
}

export const posLocalDataService = {
  /**
   * 1. Pull latest server catalog and persist into local IndexedDB
   */
  async syncCatalogToLocal(storeId?: string): Promise<{ count: number; timestamp: string }> {
    try {
      const [productsRes, customersRes] = await Promise.all([
        productsApi.getProducts({ storeId, limit: 1000 }),
        customersApi.getCustomers({ limit: 500 }).catch(() => ({ data: [] })),
      ]);

      const now = new Date().toISOString();
      const products: ProductData[] = productsRes?.data || [];
      const customers = customersRes?.data || [];

      // Map to LocalProductRecord
      const localProductRecords: LocalProductRecord[] = products.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        genericName: p.genericName || null,
        category: p.category,
        unit: p.unit,
        barcode: p.barcode || null,
        isControlledSubstance: Boolean(p.isControlledSubstance),
        isActive: p.isActive,
        lowStockThreshold: p.lowStockThreshold || 10,
        attributes: (p.attributes as Record<string, unknown>) || {},
        totalStock: p.totalStock !== undefined ? p.totalStock : 0,
        latestSellPrice: p.latestSellPrice ?? null,
        latestCostPrice: p.latestCostPrice ?? null,
        nearestExpiryDate: p.nearestExpiryDate || null,
        batches: (p.batches || []).map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          sellPrice: b.sellPrice,
          costPrice: b.costPrice,
          quantityRemaining: b.quantityRemaining,
        })),
        updatedAt: p.updatedAt || now,
      }));

      // Map to LocalCustomerRecord
      const localCustomerRecords: LocalCustomerRecord[] = customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        creditBalance: Number(c.creditBalance) || 0,
      }));

      // Transactional bulk overwrite in IndexedDB
      await posDb.transaction('rw', [posDb.localProducts, posDb.localCustomers, posDb.syncMetadata], async () => {
        await posDb.localProducts.clear();
        await posDb.localProducts.bulkPut(localProductRecords);

        await posDb.localCustomers.clear();
        await posDb.localCustomers.bulkPut(localCustomerRecords);

        await posDb.syncMetadata.put({
          key: 'catalog_sync',
          lastSyncedAt: now,
          recordCount: localProductRecords.length,
        });
      });

      return { count: localProductRecords.length, timestamp: now };
    } catch (err: unknown) {
      console.warn('Background catalog sync to local IndexedDB failed:', err);
      throw err;
    }
  },

  /**
   * 2. Local-First Product Search: instantaneous queries directly from IndexedDB
   */
  async searchLocalProducts(query: string): Promise<ProductData[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      const records = await posDb.localProducts.limit(30).toArray();
      return records as unknown as ProductData[];
    }

    // 1. Exact or prefix barcode match
    const barcodeMatches = await posDb.localProducts
      .where('barcode')
      .startsWithIgnoreCase(q)
      .toArray();

    // 2. Name & Generic Formula substring match
    const all = await posDb.localProducts.toArray();
    const textMatches = all.filter((p) => {
      const name = p.name.toLowerCase();
      const gen = (p.genericName || '').toLowerCase();
      return name.includes(q) || gen.includes(q);
    });

    // Merge and deduplicate
    const combined = Array.from(
      new Map([...barcodeMatches, ...textMatches].map((p) => [p.id, p])).values(),
    );

    return combined.slice(0, 30) as unknown as ProductData[];
  },

  /**
   * 3. Local-First Barcode lookup
   */
  async getLocalProductByBarcode(barcode: string): Promise<ProductData | null> {
    const clean = barcode.trim();
    if (!clean) return null;

    const found = await posDb.localProducts.where('barcode').equals(clean).first();
    return (found as unknown as ProductData) || null;
  },

  /**
   * 4. Save local-first sale: saves queue record AND immediately decrements local stock
   */
  async recordLocalSale(
    payload: OfflineSalePayload,
    totals: { subtotal: number; totalDiscount: number; taxTotal: number; grandTotal: number },
  ): Promise<{ sale: SaleResponse; isOffline: boolean }> {
    const localReceiptNumber = generateLocalReceiptNumber();
    const clientTxId = generateClientTxId();
    const createdAt = new Date().toISOString();

    const record: OfflineSaleRecord = {
      localReceiptNumber,
      clientTxId,
      payload,
      totals,
      status: 'pending_sync',
      createdAt,
    };

    // Save transaction and decrement local product stock atomically
    const id = await posDb.transaction('rw', [posDb.offlineSales, posDb.localProducts], async () => {
      const recordId = await posDb.offlineSales.add(record);

      for (const item of payload.items) {
        const prod = await posDb.localProducts.get(item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.totalStock - item.quantity);
          await posDb.localProducts.update(item.productId, { totalStock: newStock });
        }
      }

      return recordId;
    });

    // Generate synthetic sale response for receipt printing
    const syntheticSale: SaleResponse = {
      id: `local-${id}`,
      receiptNumber: localReceiptNumber,
      subtotal: totals.subtotal,
      discountAmount: totals.totalDiscount,
      taxAmount: totals.taxTotal,
      totalAmount: totals.grandTotal,
      status: 'COMPLETED',
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName || null,
      customer: payload.customerName
        ? { id: 'local-cust', name: payload.customerName, phone: payload.customerPhone || null }
        : null,
      cashierName: 'Offline Mode (Local-First)',
      createdAt,
      itemsCount: payload.items.length,
      items: payload.items.map((item, idx) => {
        const taxApplied = ((item.taxRatePercent || 0) * item.unitPrice * item.quantity) / 100;
        const discountAmount = item.discount || 0;
        return {
          id: `local-item-${idx}`,
          productId: item.productId,
          productName: item.productName || 'Medicine Item',
          unit: item.unit || 'Unit',
          batchNumber: 'LOCAL-FEFO',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: discountAmount,
          discountAmount,
          taxApplied,
          taxAmount: taxApplied,
          lineTotal: item.unitPrice * item.quantity - discountAmount,
        };
      }),
    };

    return { sale: syntheticSale, isOffline: true };
  },

  /**
   * 5. Opportunistic Background Sync with Conflict Detection
   */
  async syncPendingSales(): Promise<{
    successCount: number;
    conflictCount: number;
    errorCount: number;
  }> {
    const pendingSales = await posDb.offlineSales
      .where('status')
      .equals('pending_sync')
      .toArray();

    if (pendingSales.length === 0) {
      return { successCount: 0, conflictCount: 0, errorCount: 0 };
    }

    let successCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    for (const record of pendingSales) {
      if (!record.id) continue;

      try {
        const res = await salesApi.createSale(record.payload);
        if (res?.sale) {
          await posDb.offlineSales.update(record.id, {
            status: 'synced',
            syncedAt: new Date().toISOString(),
            serverId: res.sale.id,
            errorReason: undefined,
          });
          successCount++;
        }
      } catch (err: any) {
        console.error(`Local sync error for ${record.localReceiptNumber}:`, err);
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.message || err?.message || 'Server sync error';

        if (status === 400 || status === 409 || status === 422) {
          // Concurrent conflict: inventory was exhausted by another device while offline
          await posDb.offlineSales.update(record.id, {
            status: 'conflict',
            errorReason: errMsg,
            conflictDetails: {
              reason: errMsg,
              conflictingProduct: record.payload.items[0]?.productName || 'Medicine',
              requestedQty: record.payload.items[0]?.quantity || 1,
            },
          });
          conflictCount++;
        } else {
          errorCount++;
        }
      }
    }

    return { successCount, conflictCount, errorCount };
  },

  /**
   * 6. Resolve Concurrent Conflict
   */
  async resolveConflict(
    recordId: number,
    resolution: 'OVERRIDE_ADJUST' | 'CANCEL',
  ): Promise<boolean> {
    const record = await posDb.offlineSales.get(recordId);
    if (!record) return false;

    if (resolution === 'CANCEL') {
      // Restore local stock that was decremented
      for (const item of record.payload.items) {
        const prod = await posDb.localProducts.get(item.productId);
        if (prod) {
          await posDb.localProducts.update(item.productId, {
            totalStock: prod.totalStock + item.quantity,
          });
        }
      }
      await posDb.offlineSales.delete(recordId);
      toast.info(`Conflicting sale #${record.localReceiptNumber} was cancelled.`);
      return true;
    }

    if (resolution === 'OVERRIDE_ADJUST') {
      // Force sync retry
      await posDb.offlineSales.update(recordId, { status: 'pending_sync' });
      const res = await this.syncPendingSales();
      return res.successCount > 0;
    }

    return false;
  },

  /**
   * 7. Get live sync status summary
   */
  async getStatus(): Promise<LocalSyncStatus> {
    const [meta, pendingCount, conflictCount, cachedCount] = await Promise.all([
      posDb.syncMetadata.get('catalog_sync'),
      posDb.offlineSales.where('status').equals('pending_sync').count(),
      posDb.offlineSales.where('status').equals('conflict').count(),
      posDb.localProducts.count(),
    ]);

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncedAt: meta?.lastSyncedAt || null,
      cachedProductsCount: cachedCount,
      pendingSalesCount: pendingCount,
      conflictSalesCount: conflictCount,
    };
  },

  /**
   * 8. Get all offline sale records ordered by creation date
   */
  async getAllOfflineSales(): Promise<OfflineSaleRecord[]> {
    return await posDb.offlineSales.orderBy('createdAt').reverse().toArray();
  },

  /**
   * 9. Delete a single offline sale record
   */
  async deleteRecord(id: number): Promise<void> {
    await posDb.offlineSales.delete(id);
  },

  /**
   * 10. Clear synced records from IndexedDB to maintain optimal performance
   */
  async clearSyncedRecords(): Promise<void> {
    const syncedRecords = await posDb.offlineSales.where('status').equals('synced').toArray();
    const ids = syncedRecords.map((r) => r.id!).filter(Boolean);
    await posDb.offlineSales.bulkDelete(ids);
  },
};

