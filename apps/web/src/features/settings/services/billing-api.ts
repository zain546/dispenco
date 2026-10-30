import { apiClient } from '@/lib/api';

export interface SubscriptionInfo {
  id: string;
  tenantId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED';
  plan: {
    id: string;
    code: string;
    name: string;
    pricePkr: number;
    intervalDays: number;
  };
  trialEndsAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number;
  isTrial: boolean;
  isExpired: boolean;
  cancelAtPeriodEnd: boolean;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    createdAt: string;
    paidAt: string | null;
    billingPeriodStart: string;
    billingPeriodEnd: string;
  }>;
}

export const billingApi = {
  getSubscription: async (): Promise<SubscriptionInfo> => {
    const res = await apiClient.get<SubscriptionInfo>('/billing/subscription');
    return res.data;
  },

  mockRenew: async (): Promise<{ success: boolean; message: string; subscription: SubscriptionInfo }> => {
    const res = await apiClient.post('/billing/mock-renew', {});
    return res.data;
  },
};

