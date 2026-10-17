export enum AnomalyType {
  HIGH_VOID_RATE = 'HIGH_VOID_RATE',
  EXCESSIVE_DISCOUNT = 'EXCESSIVE_DISCOUNT',
  AFTER_HOURS_SALE = 'AFTER_HOURS_SALE',
  BELOW_COST_SALE = 'BELOW_COST_SALE',
  REPETITIVE_SHRINKAGE = 'REPETITIVE_SHRINKAGE',
}

export enum AnomalyStatus {
  FLAGGED = 'FLAGGED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyFlagUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AnomalyFlagItem {
  id: string;
  tenantId: string;
  storeId?: string | null;
  storeName?: string | null;
  userId?: string | null;
  user?: AnomalyFlagUser | null;
  type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  description: string;
  statisticalScore?: number | null;
  metricBaseline?: number | null;
  metricObserved?: number | null;
  referenceId?: string | null;
  metadata: Record<string, unknown>;
  resolutionNote?: string | null;
  reviewedBy?: AnomalyFlagUser | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnomalyQuery {
  status?: AnomalyStatus | 'ALL';
  type?: AnomalyType | 'ALL';
  severity?: AnomalySeverity | 'ALL';
  storeId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface UpdateAnomalyStatusPayload {
  status: AnomalyStatus;
  resolutionNote?: string;
}

export interface AnomalyKpiSummary {
  totalFlags: number;
  pendingReviewCount: number;
  investigatingCount: number;
  resolvedCount: number;
  dismissedCount: number;
  criticalSeverityCount: number;
  highSeverityCount: number;
  integrityScorePercent: number;
  breakdownByType: Record<string, number>;
}
