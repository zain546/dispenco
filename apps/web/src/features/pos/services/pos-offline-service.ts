import { posDb, OfflineSalePayload, OfflineSaleRecord, generateLocalReceiptNumber } from '../db/pos-db';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { toast } from 'sonner';

export const posOfflineService = {
  /**
   * Save a sale locally to IndexedDB queue when offline or network fails
   */
  async saveOfflineSale(
    payload: OfflineSalePayload,
    totals: { subtotal: number; totalDiscount: number; taxTotal: number; grandTotal: number }
  ): Promise<{ sale: SaleResponse; isOffline: true }> {
    const localReceiptNumber = generateLocalReceiptNumber();
    const createdAt = new Date().toISOString();

    const record: OfflineSaleRecord = {
      localReceiptNumber,
      payload,
      totals,
      status: 'pending_sync',
      createdAt,
    };

    const id = await posDb.offlineSales.add(record);

    // Build synthetic SaleResponse for immediate receipt preview & printing
    const syntheticSale: SaleResponse = {
      id: `offline-${id}`,
      receiptNumber: localReceiptNumber,
      subtotal: totals.subtotal,
      discountAmount: totals.totalDiscount,
      taxAmount: totals.taxTotal,
      totalAmount: totals.grandTotal,
      status: 'COMPLETED',
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName || null,
      customer: payload.customerName ? { id: 'offline-cust', name: payload.customerName, phone: payload.customerPhone || null } : null,
      cashierName: 'Offline Mode (Local Queue)',
      createdAt,
      itemsCount: payload.items.length,
      items: payload.items.map((item, idx) => {
        const taxApplied = (item.taxRatePercent || 0) * item.unitPrice * item.quantity / 100;
        const discountAmount = item.discount || 0;
        return {
          id: `offline-item-${idx}`,
          productId: item.productId,
          productName: item.productName || 'Medicine Item',
          unit: item.unit || 'pc',
          batchNumber: 'OFFLINE-FEFO',
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
   * Get all pending sales awaiting synchronization
   */
  async getPendingSales(): Promise<OfflineSaleRecord[]> {
    return await posDb.offlineSales.where('status').equals('pending_sync').toArray();
  },

  /**
   * Get all offline transactions (pending, synced, conflict)
   */
  async getAllOfflineSales(): Promise<OfflineSaleRecord[]> {
    return await posDb.offlineSales.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Count pending sales needing sync
   */
  async getPendingCount(): Promise<number> {
    return await posDb.offlineSales.where('status').equals('pending_sync').count();
  },

  /**
   * Synchronize queued sales sequentially with the NestJS API
   */
  async syncQueuedSales(): Promise<{ successCount: number; conflictCount: number; errorCount: number }> {
    const pendingSales = await this.getPendingSales();
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
        console.error(`Offline sync error for ${record.localReceiptNumber}:`, err);
        const status = err?.response?.status;
        const errMsg = err?.response?.data?.message || err?.message || 'Server sync error';

        if (status === 400 || status === 422 || status === 409) {
          // Business logic / stock conflict (e.g. batch stock exhausted during offline period)
          await posDb.offlineSales.update(record.id, {
            status: 'conflict',
            errorReason: errMsg,
          });
          conflictCount++;
        } else {
          // Connection error / temporary server issue — keep in pending_sync for next attempt
          errorCount++;
        }
      }
    }

    return { successCount, conflictCount, errorCount };
  },

  /**
   * Retry single offline sale marked as conflict
   */
  async retrySingleSale(id: number): Promise<boolean> {
    const record = await posDb.offlineSales.get(id);
    if (!record) return false;

    try {
      const res = await salesApi.createSale(record.payload);
      if (res?.sale) {
        await posDb.offlineSales.update(id, {
          status: 'synced',
          syncedAt: new Date().toISOString(),
          serverId: res.sale.id,
          errorReason: undefined,
        });
        toast.success(`Synced offline transaction #${record.localReceiptNumber}`);
        return true;
      }
      return false;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Sync failed';
      await posDb.offlineSales.update(id, {
        status: 'conflict',
        errorReason: errMsg,
      });
      toast.error(`Sync failed for #${record.localReceiptNumber}: ${errMsg}`);
      return false;
    }
  },

  /**
   * Remove single record from local IndexedDB
   */
  async deleteRecord(id: number): Promise<void> {
    await posDb.offlineSales.delete(id);
  },

  /**
   * Clear all synced records to keep IndexedDB clean
   */
  async clearSyncedRecords(): Promise<void> {
    const syncedRecords = await posDb.offlineSales.where('status').equals('synced').toArray();
    const ids = syncedRecords.map((r) => r.id!).filter(Boolean);
    await posDb.offlineSales.bulkDelete(ids);
  },
};
