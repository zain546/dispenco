import { apiClient } from '@/lib/api';

export interface TaxRateData {
  id?: string;
  code: string;
  name: string;
  ratePercent: number;
  isDefault?: boolean;
}

export const taxRatesApi = {
  getTaxRates: async (): Promise<TaxRateData[]> => {
    const res = await apiClient.get('/tax-rates');
    return res.data;
  },

  createTaxRate: async (data: TaxRateData): Promise<TaxRateData> => {
    const res = await apiClient.post('/tax-rates', data);
    return res.data;
  },

  updateTaxRate: async (id: string, data: Partial<TaxRateData>): Promise<TaxRateData> => {
    const res = await apiClient.patch(`/tax-rates/${id}`, data);
    return res.data;
  },

  deleteTaxRate: async (id: string): Promise<void> => {
    await apiClient.delete(`/tax-rates/${id}`);
  },
};
