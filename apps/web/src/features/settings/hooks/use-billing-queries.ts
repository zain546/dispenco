import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, SubscriptionInfo } from '../services/billing-api';
import { queryKeys } from '@/lib/query-keys';

export function useSubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.billing.subscription,
    queryFn: () => billingApi.getSubscription(),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVerifyBillingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tracker: string) => billingApi.verifySession(tracker),
    onSuccess: (data: SubscriptionInfo) => {
      queryClient.setQueryData(queryKeys.billing.subscription, data);
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription });
    },
  });
}

export function useMockRenew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => billingApi.mockRenew(),
    onSuccess: (res) => {
      queryClient.setQueryData(queryKeys.billing.subscription, res.subscription);
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription });
    },
  });
}

