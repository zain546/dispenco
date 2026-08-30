import { apiClient } from './api';

export interface StoreData {
  id: string;
  tenantId: string;
  name: string;
  address?: string;
  currency: string;
  taxRate: number;
  receiptFooter?: string;
  isActive: boolean;
}

export interface CreateStorePayload {
  name: string;
  address?: string;
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
};
