import { apiClient } from '@/lib/api';

export interface CartItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
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
  unit: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxApplied: number;
  lineTotal: number;
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
  items: SaleItemData[];
}

export const salesApi = {
  createSale: async (payload: CreateSaleInput) => {
    const response = await apiClient.post('/sales', payload);
    return response.data;
  },

  getRecentSales: async (limit: number = 20) => {
    const response = await apiClient.get(`/sales/recent?limit=${limit}`);
    return response.data;
  },

  getSaleById: async (saleId: string) => {
    const response = await apiClient.get(`/sales/${saleId}`);
    return response.data;
  },
};
