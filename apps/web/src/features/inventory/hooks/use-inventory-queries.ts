import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '../services/products-api';
import { queryKeys } from '@/lib/query-keys';

export function useInventoryAggregation(
  params?: {
    storeId?: string;
    inStockOnly?: boolean;
    lowStockOnly?: boolean;
    expiringSoonOnly?: boolean;
    priorityOnly?: boolean;
    unstockedOnly?: boolean;
    expiryAlertDays?: number;
    lowStockThreshold?: number;
    search?: string;
  },
  options?: { enabled?: boolean }
) {
  const { storeId, ...filterParams } = params ?? {};

  return useQuery({
    queryKey: queryKeys.inventory.aggregation(storeId, filterParams),
    queryFn: () => productsApi.getInventoryAggregation(params),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 60 seconds matching backend Redis TTL
  });
}

export function useExpiryRisk(
  params?: {
    storeId?: string;
    timeframeDays?: number;
    riskFilter?: string;
    search?: string;
    limit?: number;
  },
  options?: { enabled?: boolean }
) {
  const { storeId, ...filterParams } = params ?? {};

  // Only retain placeholder data if the store scope matches
  const keepPreviousData = (previousData: any, previousQuery: any) => {
    if (!previousData || !previousQuery) return undefined;
    const prevKey = previousQuery.queryKey as unknown[];
    const prevStore = (prevKey?.[1] as { storeId?: string })?.storeId;
    const currentStore = storeId ?? 'all';
    if (prevStore !== currentStore) return undefined;
    return previousData;
  };

  return useQuery({
    queryKey: queryKeys.inventory.expiryRisk(storeId, filterParams),
    queryFn: () => productsApi.getExpiryRiskForecast(params),
    enabled: options?.enabled ?? true,
    staleTime: 180 * 1000, // 3 minutes matching backend Redis TTL
    placeholderData: keepPreviousData,
  });
}

export function useAdjustBatchStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      payload,
    }: {
      batchId: string;
      payload: {
        newQuantity: number;
        reason: 'DAMAGED' | 'EXPIRED_WRITEOFF' | 'RECOUNT' | 'OTHER';
        notes?: string;
      };
    }) => productsApi.adjustBatchStock(batchId, payload),
    onSuccess: () => {
      // Invalidate all inventory queries across all stores
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

