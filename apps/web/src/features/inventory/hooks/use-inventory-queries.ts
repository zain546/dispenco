import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, ExpiryRiskForecastResponse } from '../services/products-api';
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
  const storeId = params?.storeId;
  return useQuery({
    queryKey: queryKeys.inventory.aggregation(storeId),
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
  const storeId = params?.storeId;
  const days = params?.timeframeDays ?? 90;
  return useQuery({
    queryKey: queryKeys.inventory.expiryRisk(storeId, days),
    queryFn: () => productsApi.getExpiryRiskForecast(params),
    enabled: options?.enabled ?? true,
    staleTime: 180 * 1000, // 3 minutes matching backend Redis TTL
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

