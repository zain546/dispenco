import { apiClient } from '@/lib/api';

export interface SupplierData {
  id: string;
  name: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  leadTimeDays?: number;
  isActive?: boolean;
  purchaseOrdersCount?: number;
  createdAt?: string;
}

export interface CreateSupplierInput {
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  leadTimeDays?: number;
  isActive?: boolean;
}

export const suppliersApi = {
  getSuppliers: async (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiClient.get(`/suppliers${params}`);
    return res.data;
  },

  getSupplierById: async (id: string) => {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  },

  createSupplier: async (data: CreateSupplierInput) => {
    const res = await apiClient.post('/suppliers', data);
    return res.data;
  },

  updateSupplier: async (id: string, data: Partial<CreateSupplierInput>) => {
    const res = await apiClient.patch(`/suppliers/${id}`, data);
    return res.data;
  },

  deleteSupplier: async (id: string) => {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data;
  },
};
