import { apiClient } from '@/lib/api';

export interface ProductData {
  id: string;
  tenantId: string;
  name: string;
  genericName?: string | null;
  category: string;
  unit: string;
  barcode?: string | null;
  images: string[];
  taxCode?: string | null;
  isControlledSubstance: boolean;
  isActive: boolean;
  lowStockThreshold: number;
  attributes: Record<string, unknown>;
  totalStock?: number;
  batchCount?: number;
  expiredBatchCount?: number;
  nearExpiryBatchCount?: number;
  latestSellPrice?: number | null;
  latestCostPrice?: number | null;
  nearestExpiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchData {
  id: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellPrice: number;
  quantityReceived: number;
  quantityRemaining: number;
  daysUntilExpiry: number;
  isExpired: boolean;
  isNearExpiry: boolean;
  createdAt: string;
  mfgDate?: string | null;
  vendorName?: string | null;
  purchaseInvoiceNumber?: string | null;
  purchaseInvoiceDate?: string | null;
  rackNumber?: string | null;
}

export interface CreateProductPayload {
  name: string;
  genericName?: string;
  category: string;
  unit: string;
  barcode?: string;
  images?: string[];
  taxCode?: string;
  isControlledSubstance?: boolean;
  lowStockThreshold?: number;
  attributes?: Record<string, unknown>;

  // Unified Initial Stock & Batch Fields
  initialStockQuantity?: number;
  expiryDate?: string;
  costPrice?: number;
  sellPrice?: number;
  batchNumber?: string;
  rackNumber?: string;
  vendorName?: string;

  // Manufacturing & Purchase Invoice Details
  mfgDate?: string;
  purchaseInvoiceNumber?: string;
  purchaseInvoiceDate?: string;
}

export interface ReceiveStockPayload {
  productId: string;
  quantity: number;
  expiryDate: string;
  costPrice: number;
  sellPrice: number;
  batchNumber?: string;
  rackNumber?: string;
  vendorName?: string;
  mfgDate?: string;
  purchaseInvoiceNumber?: string;
  purchaseInvoiceDate?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  isActive?: boolean;
}

export interface QueryProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isControlledSubstance?: boolean;
  isActive?: boolean;
}

export interface PaginatedProductsResponse {
  success: boolean;
  data: ProductData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export const productsApi = {
  async createProduct(
    payload: CreateProductPayload,
  ): Promise<{ success: boolean; data: ProductData; message?: string }> {
    const { data } = await apiClient.post('/products', payload);
    return data;
  },

  async getProducts(params?: QueryProductsParams): Promise<PaginatedProductsResponse> {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },

  async getProductById(id: string): Promise<{ success: boolean; data: ProductData }> {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },

  async updateProduct(
    id: string,
    payload: UpdateProductPayload,
  ): Promise<{ success: boolean; data: ProductData; message?: string }> {
    const { data } = await apiClient.patch(`/products/${id}`, payload);
    return data;
  },

  async deleteProduct(
    id: string,
  ): Promise<{ success: boolean; data: ProductData; message?: string }> {
    const { data } = await apiClient.delete(`/products/${id}`);
    return data;
  },

  // Stock Receive & Batch APIs
  async receiveStock(payload: ReceiveStockPayload): Promise<{
    success: boolean;
    message: string;
    batch: {
      id: string;
      batchNumber: string;
      quantityReceived: number;
      quantityRemaining: number;
      costPrice: number;
      sellPrice: number;
      expiryDate: string;
    };
    product: {
      id: string;
      name: string;
      totalStock: number;
    };
  }> {
    const { data } = await apiClient.post('/inventory/receive', payload);
    return data;
  },

  async getProductBatches(productId: string): Promise<{
    product: {
      id: string;
      name: string;
      category: string;
      unit: string;
      totalStock: number;
    };
    batches: BatchData[];
  }> {
    const { data } = await apiClient.get(`/inventory/products/${productId}/batches`);
    return data;
  },

  async updateBatch(
    batchId: string,
    payload: {
      batchNumber?: string;
      expiryDate?: string;
      costPrice?: number;
      sellPrice?: number;
      quantityRemaining?: number;
      quantityReceived?: number;
      mfgDate?: string;
      vendorName?: string;
      purchaseInvoiceNumber?: string;
      purchaseInvoiceDate?: string;
      rackNumber?: string;
    },
  ): Promise<{ success: boolean; message: string; batch: BatchData }> {
    const { data } = await apiClient.patch(`/inventory/batches/${batchId}`, payload);
    return data;
  },
};
