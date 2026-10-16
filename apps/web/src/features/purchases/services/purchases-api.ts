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

  getReorderSuggestions: async (params?: {
    storeId?: string;
    timeframeDays?: number;
    urgencyFilter?: string;
    search?: string;
    limit?: number;
  }): Promise<ReorderSuggestionsResponse> => {
    const res = await apiClient.get('/purchases/reorder-suggestions', { params });
    return res.data;
  },
};

export type ReorderUrgency =
  | 'OUT_OF_STOCK'
  | 'CRITICAL_REORDER'
  | 'REORDER_SOON'
  | 'UPCOMING'
  | 'ADEQUATE';

export interface ReorderSuggestionItem {
  productId: string;
  productName: string;
  genericName: string | null;
  category: string;
  unit: string;
  barcode: string | null;
  lowStockThreshold: number;
  currentStock: number;
  dailySalesVelocity: number;
  totalUnitsSoldInTimeframe: number;
  timeframeDays: number;
  daysUntilStockout: number;
  estimatedStockoutDate: string | null;
  reorderPoint: number;
  targetStockLevel: number;
  suggestedQuantity: number;
  estimatedUnitCost: number;
  estimatedUnitSellPrice: number;
  estimatedOrderCost: number;
  urgencyLevel: ReorderUrgency;
  urgencyScore: number;
  actionTitle: string;
  reason: string;
  recommendedOrderDate: string;
  supplier: {
    id: string | null;
    name: string;
    leadTimeDays: number;
    contactPhone: string | null;
    contactEmail: string | null;
  };
}

export interface ReorderSuggestionsResponse {
  timeframeDays: number;
  summary: {
    totalProductsAnalyzed: number;
    outOfStockCount: number;
    criticalReordersCount: number;
    reorderSoonCount: number;
    upcomingCount: number;
    adequateCount: number;
    totalUnitsToOrder: number;
    totalEstimatedCost: number;
  };
  suggestions: ReorderSuggestionItem[];
}
