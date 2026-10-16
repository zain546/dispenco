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

export interface StorePerformanceBreakdown {
  storeId: string;
  storeName: string;
  address?: string | null;
  currency: string;
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageOrderValue: number;
  revenueSharePercent: number;
  activeBatchesCount: number;
  uniqueProductsStocked: number;
  totalUnitsInStock: number;
}

export interface OrgOverviewResponse {
  success: boolean;
  data: {
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      totalItemsSold: number;
      averageOrderValue: number;
      totalStoresCount: number;
      dateRange: {
        startDate: string;
        endDate: string;
      };
    };
    stores: StorePerformanceBreakdown[];
  };
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

  getOrgOverview: async (params?: { startDate?: string; endDate?: string }): Promise<OrgOverviewResponse> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get(`/reports/org-overview${queryString}`);
    return res.data;
  },

  queryCopilot: async (data: QueryCopilotInput): Promise<CopilotQueryResult> => {
    const res = await apiClient.post('/reports/copilot/query', data);
    return res.data;
  },
};

export interface CopilotQueryResult {
  question: string;
  intent: string;
  timeframeLabel: string;
  narrative: string;
  chartType: 'bar' | 'line' | 'pie' | 'kpi' | 'table';
  summaryMetrics: Array<{
    label: string;
    value: string | number;
    change?: string;
    isPositive?: boolean;
  }>;
  chartData: Array<Record<string, unknown>>;
  tableColumns?: Array<{
    key: string;
    label: string;
    format?: 'currency' | 'number' | 'text' | 'date';
  }>;
  tableData?: Array<Record<string, unknown>>;
  suggestedFollowUps: string[];
  executionTimeMs: number;
}

export interface QueryCopilotInput {
  question: string;
  storeId?: string;
  timeframe?: string;
}
