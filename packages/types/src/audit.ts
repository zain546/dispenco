export enum AuditAction {
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  SALE_VOIDED = 'SALE_VOIDED',
  SALE_RETURNED = 'SALE_RETURNED',
  TRANSFER_REQUESTED = 'TRANSFER_REQUESTED',
  TRANSFER_DISPATCHED = 'TRANSFER_DISPATCHED',
  TRANSFER_RECEIVED = 'TRANSFER_RECEIVED',
  TRANSFER_CANCELLED = 'TRANSFER_CANCELLED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_ACTIVATED = 'API_KEY_ACTIVATED',
  API_KEY_DEACTIVATED = 'API_KEY_DEACTIVATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  STAFF_ROLE_CHANGED = 'STAFF_ROLE_CHANGED',
  STAFF_INVITED = 'STAFF_INVITED',
  PRESCRIPTION_DISPENSED = 'PRESCRIPTION_DISPENSED',
  BULK_PRICE_PUSH = 'BULK_PRICE_PUSH',
  BROADCAST_SETTING = 'BROADCAST_SETTING',
  CUSTOMER_CREDIT_ADJUSTED = 'CUSTOMER_CREDIT_ADJUSTED',
  PURCHASE_ORDER_RECEIVED = 'PURCHASE_ORDER_RECEIVED',
}

export interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: AuditLogUser | null;
  summaryText: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AuditLogQuery {
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditMetricsSummary {
  totalEvents: number;
  voidsCount: number;
  stockAdjustmentsCount: number;
  securityEventsCount: number;
  transfersCount: number;
  topUsers: Array<{ userId: string; name: string; count: number }>;
  actionsBreakdown: Record<string, number>;
}
