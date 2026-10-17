import { apiClient } from './api';

export interface StoreData {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  currency: string;
  taxRate: number;
  receiptFooter?: string | null;
  expiryAlertDays?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStorePayload {
  name: string;
  address?: string;
  currency?: string;
  taxRate?: number;
  receiptFooter?: string;
  expiryAlertDays?: number;
}

export interface ChainStoreSummary {
  id: string;
  name: string;
  address?: string | null;
  currency: string;
  taxRate: number;
  receiptFooter?: string | null;
  expiryAlertDays: number;
  salesToday: number;
  salesCountToday: number;
  salesMonth: number;
  salesCountMonth: number;
  activeBatchesCount: number;
  totalUnitsInStock: number;
  inventoryCostValue: number;
  retailValue: number;
  lowStockCount: number;
  pendingTransfers: number;
}

export interface ChainOverviewData {
  totalStoresCount: number;
  consolidated: {
    totalSalesToday: number;
    totalSalesMonth: number;
    totalInventoryCostValue: number;
    totalRetailValue: number;
    totalLowStockCount: number;
    totalPendingTransfers: number;
  };
  stores: ChainStoreSummary[];
}

export interface BulkPricePushPayload {
  productId?: string;
  category?: string;
  newSellPrice?: number;
  percentageAdjustment?: number;
  targetStoreIds?: string[];
  reason?: string;
}

export interface BroadcastSettingPayload {
  targetStoreIds?: string[];
  taxRate?: number;
  receiptFooter?: string;
  expiryAlertDays?: number;
}

export const storesApi = {
  async createStore(payload: CreateStorePayload): Promise<{ success: boolean; data: StoreData; message?: string }> {
    const { data } = await apiClient.post('/stores', payload);
    return data;
  },

  async getStores(): Promise<{ success: boolean; data: StoreData[]; total: number }> {
    const { data } = await apiClient.get('/stores');
    return data;
  },

  async getChainOverview(): Promise<{ success: boolean; data: ChainOverviewData }> {
    const { data } = await apiClient.get('/stores/chain/overview');
    return data;
  },

  async bulkPricePush(payload: BulkPricePushPayload): Promise<{
    success: boolean;
    data: {
      updatedBatchesCount: number;
      affectedStoresCount: number;
      storeNames: string[];
      reason: string;
    };
    message: string;
  }> {
    const { data } = await apiClient.post('/stores/chain/bulk-price-push', payload);
    return data;
  },

  async broadcastSetting(payload: BroadcastSettingPayload): Promise<{
    success: boolean;
    data: {
      updatedStoresCount: number;
      storeNames: string[];
    };
    message: string;
  }> {
    const { data } = await apiClient.post('/stores/chain/broadcast-setting', payload);
    return data;
  },
};
