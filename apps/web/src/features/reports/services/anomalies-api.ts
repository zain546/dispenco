import { apiClient } from '@/lib/api';
import {
  AnomalyFlagItem,
  AnomalyQuery,
  AnomalyKpiSummary,
  UpdateAnomalyStatusPayload,
} from '@dispenco/types';

export interface AnomaliesListResponse {
  items: AnomalyFlagItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const anomaliesApi = {
  /**
   * Fetch paginated list of operational discrepancy variance flags
   */
  async getAnomalies(params?: AnomalyQuery): Promise<AnomaliesListResponse> {
    const cleanParams: Record<string, unknown> = {};
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== 'ALL') {
          cleanParams[key] = val;
        }
      });
    }
    const res = await apiClient.get<AnomaliesListResponse>('/reports/anomalies', {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * Get operational integrity KPI metrics and variance breakdowns
   */
  async getSummary(): Promise<AnomalyKpiSummary> {
    const res = await apiClient.get<AnomalyKpiSummary>('/reports/anomalies/summary');
    return res.data;
  },

  /**
   * Trigger an on-demand statistical anomaly scan
   */
  async triggerScan(storeId?: string): Promise<{ scannedRules: number; newFlagsCreated: number }> {
    const res = await apiClient.post<{ scannedRules: number; newFlagsCreated: number }>(
      '/reports/anomalies/scan',
      { storeId },
    );
    return res.data;
  },

  /**
   * Update discrepancy review status (under review, resolved, dismissed)
   */
  async updateStatus(
    flagId: string,
    payload: UpdateAnomalyStatusPayload,
  ): Promise<AnomalyFlagItem> {
    const res = await apiClient.patch<AnomalyFlagItem>(
      `/reports/anomalies/${flagId}/status`,
      payload,
    );
    return res.data;
  },
};
