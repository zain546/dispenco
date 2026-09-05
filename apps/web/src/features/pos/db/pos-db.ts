import Dexie, { type Table } from 'dexie';

export interface OfflineSaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
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
  payload: OfflineSalePayload;
  totals: {
    subtotal: number;
    totalDiscount: number;
    taxTotal: number;
    grandTotal: number;
  };
  status: 'pending_sync' | 'synced' | 'conflict';
  errorReason?: string;
  createdAt: string;
  syncedAt?: string;
  serverId?: string;
}

export class DispencoPosDatabase extends Dexie {
  offlineSales!: Table<OfflineSaleRecord, number>;

  constructor() {
    super('DispencoPosDatabase');
    this.version(1).stores({
      offlineSales: '++id, localReceiptNumber, status, createdAt',
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
