import { apiClient } from '@/lib/api';

export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  batchId?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  costPrice?: number | string | null;
  sellPrice?: number | string | null;
  quantityRequested: number;
  quantitySent?: number | null;
  quantityReceived?: number | null;
  product: {
    id: string;
    name: string;
    genericName?: string | null;
    unit: string;
    category: string;
  };
  batch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    costPrice?: number | string;
    sellPrice?: number | string;
  } | null;
}

export interface StockTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  sourceStoreId: string;
  targetStoreId: string;
  status: TransferStatus;
  requestedByUserId: string;
  dispatchedByUserId?: string | null;
  receivedByUserId?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceStore: {
    id: string;
    name: string;
    address?: string | null;
    currency?: string;
  };
  targetStore: {
    id: string;
    name: string;
    address?: string | null;
    currency?: string;
  };
  requestedByUser: {
    id: string;
    name: string;
    email: string;
  };
  dispatchedByUser?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  receivedByUser?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  items: StockTransferItem[];
}

export interface QueryTransfersParams {
  storeId?: string;
  direction?: 'incoming' | 'outgoing' | 'all';
  status?: TransferStatus;
  page?: number;
  limit?: number;
}

export interface CreateTransferPayload {
  sourceStoreId: string;
  targetStoreId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantityRequested: number;
  }>;
}

export interface DispatchTransferPayload {
  items: Array<{
    itemId: string;
    batchId: string;
    quantitySent: number;
  }>;
  notes?: string;
}

export interface ReceiveTransferPayload {
  items: Array<{
    itemId: string;
    quantityReceived: number;
  }>;
  notes?: string;
}

export const transfersApi = {
  async getTransfers(params?: QueryTransfersParams): Promise<{
    success: boolean;
    data: StockTransfer[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const res = await apiClient.get('/transfers', { params });
    return res.data;
  },

  async getTransferById(id: string): Promise<{
    success: boolean;
    data: StockTransfer;
  }> {
    const res = await apiClient.get(`/transfers/${id}`);
    return res.data;
  },

  async createTransferRequest(payload: CreateTransferPayload): Promise<{
    success: boolean;
    message: string;
    data: StockTransfer;
  }> {
    const res = await apiClient.post('/transfers/request', payload);
    return res.data;
  },

  async dispatchTransfer(
    id: string,
    payload: DispatchTransferPayload
  ): Promise<{
    success: boolean;
    message: string;
    data: StockTransfer;
  }> {
    const res = await apiClient.post(`/transfers/${id}/dispatch`, payload);
    return res.data;
  },

  async receiveTransfer(
    id: string,
    payload: ReceiveTransferPayload
  ): Promise<{
    success: boolean;
    message: string;
    data: StockTransfer;
  }> {
    const res = await apiClient.post(`/transfers/${id}/receive`, payload);
    return res.data;
  },

  async cancelTransfer(
    id: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: StockTransfer;
  }> {
    const res = await apiClient.post(`/transfers/${id}/cancel`, { reason });
    return res.data;
  },
};
