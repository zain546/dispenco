import { apiClient } from '@/lib/api';

export interface PurchaseOrderItemInput {
  productId: string;
  expectedQuantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderInput {
  storeId: string;
  supplierId: string;
  notes?: string;
  items: PurchaseOrderItemInput[];
}

export interface ReceivePurchaseItemInput {
  purchaseItemId: string;
  receivedQuantity: number;
  batchNumber: string;
  expiryDate: string;
  sellPrice?: number;
}

export interface ReceivePurchaseOrderInput {
  items: ReceivePurchaseItemInput[];
  notes?: string;
}

export const purchasesApi = {
  getPurchases: async (storeId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (storeId) params.append('storeId', storeId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/purchases${query}`);
    return res.data;
  },

  getPurchaseById: async (id: string) => {
    const res = await apiClient.get(`/purchases/${id}`);
    return res.data;
  },

  createPurchaseOrder: async (data: CreatePurchaseOrderInput) => {
    const res = await apiClient.post('/purchases', data);
    return res.data;
  },

  receivePurchaseOrder: async (id: string, data: ReceivePurchaseOrderInput) => {
    const res = await apiClient.post(`/purchases/${id}/receive`, data);
    return res.data;
  },
};
