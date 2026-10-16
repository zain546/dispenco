import Dexie, { type Table } from 'dexie';

export interface OfflineSaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitType?: 'BOX' | 'UNIT';
  discount?: number;
  discountType?: 'FLAT' | 'PERCENT';
  taxRatePercent?: number;
  productName?: string;
  unit?: string;
}

export interface OfflineSalePayload {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: 'CASH' | 'DIGITAL' | 'CREDIT';
  overallDiscount?: number;
  overallDiscountType?: 'FLAT' | 'PERCENT';
  items: OfflineSaleItemPayload[];
}

export interface OfflineSaleRecord {
  id?: number;
  localReceiptNumber: string;
  clientTxId?: string;
  payload: OfflineSalePayload;
  totals: {
    subtotal: number;
    totalDiscount: number;
    taxTotal: number;
    grandTotal: number;
  };
  status: 'pending_sync' | 'synced' | 'conflict';
  errorReason?: string;
  conflictDetails?: {
    reason: string;
    conflictingProduct?: string;
    requestedQty?: number;
    availableQty?: number;
    resolution?: 'OVERRIDE_ADJUST' | 'CANCEL';
  };
  createdAt: string;
  syncedAt?: string;
  serverId?: string;
}

export interface LocalBatchRecord {
  id: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellPrice: number;
  quantityRemaining: number;
}

export interface LocalProductRecord {
  id: string;
  tenantId: string;
  name: string;
  genericName?: string | null;
  category: string;
  unit: string;
  barcode?: string | null;
  isControlledSubstance: boolean;
  isActive: boolean;
  lowStockThreshold: number;
  attributes: Record<string, unknown>;
  totalStock: number;
  latestSellPrice?: number | null;
  latestCostPrice?: number | null;
  nearestExpiryDate?: string | null;
  batches?: LocalBatchRecord[];
  updatedAt: string;
}

export interface LocalCustomerRecord {
  id: string;
  name: string;
  phone?: string | null;
  creditBalance: number;
}

export interface SyncMetadataRecord {
  key: string;
  lastSyncedAt: string;
  recordCount: number;
}

export class DispencoPosDatabase extends Dexie {
  offlineSales!: Table<OfflineSaleRecord, number>;
  localProducts!: Table<LocalProductRecord, string>;
  localCustomers!: Table<LocalCustomerRecord, string>;
  syncMetadata!: Table<SyncMetadataRecord, string>;

  constructor() {
    super('DispencoPosDatabase');

    this.version(1).stores({
      offlineSales: '++id, localReceiptNumber, status, createdAt',
    });

    this.version(2).stores({
      offlineSales: '++id, localReceiptNumber, clientTxId, status, createdAt',
      localProducts: 'id, name, genericName, category, barcode, isControlledSubstance, totalStock, updatedAt',
      localCustomers: 'id, name, phone, creditBalance',
      syncMetadata: 'key, lastSyncedAt',
    });
  }
}

export const posDb = new DispencoPosDatabase();

/**
 * Generate a unique local receipt identifier for offline transactions
 */
export function generateLocalReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `OFFLINE-${timestamp}-${random}`;
}

/**
 * Generate a client transaction UUID for idempotency
 */
export function generateClientTxId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
