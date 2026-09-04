import { apiClient } from '@/lib/api';

export interface SalesOverTimeData {
  date: string;
  revenue: number;
  count: number;
}

export interface TopProductData {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface SalesReportResponse {
  success: boolean;
  data: {
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      averageOrderValue: number;
      totalItemsSold: number;
      dateRange: {
        startDate: string;
        endDate: string;
      };
    };
    salesOverTime: SalesOverTimeData[];
    topProductsByQuantity: TopProductData[];
    topProductsByRevenue: TopProductData[];
  };
}

export interface GetSalesReportParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  storeId?: string;
}

export const reportsApi = {
  getSalesReport: async (params?: GetSalesReportParams): Promise<SalesReportResponse> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.groupBy) query.append('groupBy', params.groupBy);
    if (params?.storeId) query.append('storeId', params.storeId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get(`/reports/sales${queryString}`);
    return res.data;
  },
};
