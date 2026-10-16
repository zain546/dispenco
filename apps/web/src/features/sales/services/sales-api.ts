import { apiClient } from '@/lib/api';

export interface CartItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  unitType?: 'BOX' | 'UNIT';
  discount?: number;
  discountType?: 'FLAT' | 'PERCENT';
  taxRatePercent?: number;
}

export interface CreateSaleInput {
  storeId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItemInput[];
  overallDiscount?: number;
  overallDiscountType?: 'FLAT' | 'PERCENT';
  paymentMethod?: 'CASH' | 'DIGITAL' | 'CREDIT';
  notes?: string;
}

export interface SaleItemData {
  id: string;
  productId: string;
  productName: string;
  genericName?: string | null;
  barcode?: string | null;
  category?: string;
  unit: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  returnedQuantity?: number;
  maxReturnable?: number;
  unitPrice: number;
  discount: number;
  discountType?: 'FLAT' | 'PERCENT';
  taxRate?: number;
  taxApplied: number;
  lineTotal: number;
}

export interface SaleReturnSummary {
  id: string;
  returnNumber: string;
  reason: string;
  notes?: string | null;
  refundAmount: number;
  refundMethod: string;
  createdAt: string;
  processedBy: string;
  itemsCount: number;
}

export interface SaleDetailResponse {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  status: string;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    creditBalance?: number;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  store?: {
    id: string;
    name: string;
    address?: string | null;
    currency?: string;
    taxRate?: number;
    receiptFooter?: string | null;
    logoUrl?: string | null;
    tenantName?: string;
  };
  payment?: {
    method: string;
    amount: number;
    status: string;
  } | null;
  returns?: SaleReturnSummary[];
  items: SaleItemData[];
}

export interface SaleResponse {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  subtotal: number;
  status: string;
  createdAt: string;
  customerName?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  cashierName?: string;
  paymentMethod: string;
  itemsCount: number;
  items?: SaleItemData[];
}

export interface CreateReturnItemInput {
  saleItemId: string;
  quantity: number;
}

export interface CreateReturnInput {
  saleId: string;
  reason: string;
  notes?: string;
  refundMethod?: 'CASH' | 'CREDIT' | 'DIGITAL';
  items: CreateReturnItemInput[];
}

export interface ReturnItemDetail {
  id: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  saleItem: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxApplied: number;
    product: {
      id: string;
      name: string;
      barcode?: string | null;
      genericName?: string | null;
    };
    batch: {
      id: string;
      batchNumber: string;
      expiryDate: string;
    };
  };
}

export interface ReturnRecord {
  id: string;
  tenantId: string;
  saleId: string;
  processedByUserId: string;
  returnNumber: string;
  reason: string;
  notes?: string | null;
  refundAmount: number;
  refundMethod: string;
  createdAt: string;
  updatedAt: string;
  sale: {
    id: string;
    receiptNumber: string;
    totalAmount: number;
    createdAt: string;
    customer?: {
      id: string;
      name: string;
      phone?: string | null;
    } | null;
    store?: {
      id: string;
      name: string;
    } | null;
  };
  processedByUser: {
    id: string;
    name: string;
    email: string;
  };
  returnItems: ReturnItemDetail[];
}

export interface QueryReturnsParams {
  storeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReturnsListResponse {
  data: ReturnRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const salesApi = {
  createSale: async (payload: CreateSaleInput) => {
    const response = await apiClient.post('/sales', payload);
    return response.data;
  },

  getRecentSales: async (limit: number = 20, storeId?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (storeId) params.append('storeId', storeId);
    const response = await apiClient.get(`/sales/recent?${params.toString()}`);
    return response.data;
  },

  getSaleById: async (saleId: string) => {
    const response = await apiClient.get(`/sales/${saleId}`);
    return response.data as { success: boolean; sale: SaleDetailResponse; message?: string };
  },

  voidSale: async (saleId: string, reason?: string) => {
    const response = await apiClient.post(`/sales/${saleId}/void`, { reason });
    return response.data;
  },

  createReturn: async (payload: CreateReturnInput): Promise<ReturnRecord> => {
    const response = await apiClient.post('/sales/returns', payload);
    return response.data;
  },

  getReturns: async (params?: QueryReturnsParams): Promise<ReturnsListResponse> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.append('storeId', params.storeId);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const response = await apiClient.get(`/sales/returns?${query.toString()}`);
    return response.data;
  },

  getReturnById: async (returnId: string): Promise<ReturnRecord> => {
    const response = await apiClient.get(`/sales/returns/${returnId}`);
    return response.data;
  },

  sendDigitalInvoice: async (saleId: string, phone?: string) => {
    const response = await apiClient.post(`/sales/${saleId}/send-digital-invoice`, { phone });
    return response.data as {
      success: boolean;
      channel: string;
      recipient: string;
      messageText: string;
      directWhatsAppUrl?: string;
      status: string;
      message: string;
    };
  },
};
