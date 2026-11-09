import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, CreateSaleInput, CreateReturnInput } from '../services/sales-api';
import { queryKeys } from '@/lib/query-keys';

export function useRecentSales(storeId?: string, limit: number = 20, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.sales.recent(storeId, limit),
    queryFn: () => salesApi.getRecentSales(limit, storeId),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useSaleDetail(saleId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.sales.detail(saleId),
    queryFn: () => salesApi.getSaleById(saleId),
    enabled: Boolean(saleId) && (options?.enabled ?? true),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSaleInput) => salesApi.createSale(payload),
    onSuccess: (_, variables) => {
      // Invalidate sales, inventory, and reports across caches
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      }
    },
  });
}

export function useVoidSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason?: string }) =>
      salesApi.voidSale(saleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReturnInput) => salesApi.createReturn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

