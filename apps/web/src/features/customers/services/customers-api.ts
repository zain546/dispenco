import { apiClient as api } from '@/lib/api';

export interface CustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditBalance: number;
  totalSalesCount?: number;
  totalPaymentsCount?: number;
  createdAt: string;
}

export interface CustomerListResponse {
  data: CustomerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalCustomers: number;
    totalCreditOutstanding: number;
    customersWithBalanceCount: number;
  };
}

export interface LedgerEntryItem {
  id: string;
  type: 'DEBIT_SALE' | 'CREDIT_PAYMENT';
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  method?: string;
  receiptNumber?: string;
}

export interface CustomerLedgerResponse {
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    currentCreditBalance: number;
  };
  summary: {
    totalDebits: number;
    totalCredits: number;
    computedBalance: number;
    currentBalance: number;
  };
  entries: LedgerEntryItem[];
}

export interface CustomerDetailResponse extends CustomerItem {
  totalSpent: number;
  updatedAt: string;
  recentSales: Array<{
    id: string;
    receiptNumber?: string | null;
    totalAmount: number;
    status: string;
    storeName: string;
    itemsCount: number;
    createdAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    saleId?: string | null;
    createdAt: string;
  }>;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  initialCreditBalance?: number;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface RecordKhataPaymentPayload {
  amount: number;
  method: 'CASH' | 'DIGITAL';
  notes?: string;
  gatewayRef?: string;
}

export const customersApi = {
  async getCustomers(params?: {
    search?: string;
    hasBalance?: string;
    page?: number;
    limit?: number;
  }): Promise<CustomerListResponse> {
    const res = await api.get('/customers', { params });
    return res.data;
  },

  async searchCustomers(term?: string): Promise<Array<{
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    creditBalance: number;
  }>> {
    const res = await api.get('/customers/search', { params: { q: term } });
    return res.data;
  },

  async getCustomer(id: string): Promise<CustomerDetailResponse> {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  async getLedger(id: string): Promise<CustomerLedgerResponse> {
    const res = await api.get(`/customers/${id}/ledger`);
    return res.data;
  },

  async createCustomer(payload: CreateCustomerPayload): Promise<CustomerItem> {
    const res = await api.post('/customers', payload);
    return res.data;
  },

  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<CustomerItem> {
    const res = await api.patch(`/customers/${id}`, payload);
    return res.data;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },

  async recordPayment(
    customerId: string,
    payload: RecordKhataPaymentPayload,
  ): Promise<{
    success: boolean;
    message: string;
    payment: {
      id: string;
      amount: number;
      method: string;
      reference?: string;
      createdAt: string;
    };
    newCreditBalance: number;
  }> {
    const res = await api.post(`/customers/${customerId}/payments`, payload);
    return res.data;
  },
};
