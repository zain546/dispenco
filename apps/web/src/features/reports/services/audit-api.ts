import { apiClient } from '@/lib/api';
import { AuditLogItem, AuditLogQuery, AuditMetricsSummary } from '@dispenco/types';

export interface AuditLogsResponse {
  items: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const auditApi = {
  /**
   * Fetch paginated audit trail logs with filtering
   */
  async getAuditLogs(params?: AuditLogQuery): Promise<AuditLogsResponse> {
    const res = await apiClient.get<AuditLogsResponse>('/reports/audit-logs', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch audit metrics summary and breakdowns
   */
  async getAuditSummary(params?: AuditLogQuery): Promise<AuditMetricsSummary> {
    const res = await apiClient.get<AuditMetricsSummary>('/reports/audit-logs/summary', {
      params,
    });
    return res.data;
  },

  /**
   * Export audit log report as CSV and trigger browser download
   */
  async downloadAuditCsv(params?: AuditLogQuery): Promise<void> {
    const res = await apiClient.get('/reports/audit-logs/export/csv', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `dispenco-audit-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
