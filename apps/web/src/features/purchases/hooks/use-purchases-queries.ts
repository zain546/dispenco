import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  purchasesApi,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceivePurchaseOrderInput,
  ReorderSuggestionsResponse,
} from '../services/purchases-api';
import { queryKeys } from '@/lib/query-keys';

export function usePurchases(
  params?: {
    storeId?: string;
    status?: string;
  },
  options?: { enabled?: boolean }
) {
  const storeId = params?.storeId;
  const filterParams = params?.status ? { status: params.status } : undefined;

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
    queryKey: queryKeys.purchases.list(storeId, filterParams),
    queryFn: async () => {
      const res = await purchasesApi.getPurchases(params?.storeId, params?.status);
      return res?.data ?? [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 45 * 1000, // 45s stale-while-revalidate
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: async () => {
      const res = await purchasesApi.getPurchaseById(id);
      return res?.data ?? null;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export function useReorderSuggestions(
  params?: {
    storeId?: string;
    timeframeDays?: number;
    urgencyFilter?: string;
    search?: string;
    limit?: number;
  },
  options?: { enabled?: boolean }
) {
  const { storeId, ...filterParams } = params ?? {};

  return useQuery<ReorderSuggestionsResponse>({
    queryKey: queryKeys.purchases.suggestions(storeId, filterParams),
    queryFn: () => purchasesApi.getReorderSuggestions(params),
    enabled: options?.enabled ?? true,
    staleTime: 120 * 1000, // 2 minutes matching backend Redis TTL
    placeholderData: keepPreviousData,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => purchasesApi.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivePurchaseOrderInput }) =>
      purchasesApi.receivePurchaseOrder(id, data),
    onSuccess: () => {
      // Invalidate purchases queries
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      // Invalidate store inventory queries since new batches were checked in
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      // Invalidate reports
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseOrderInput }) =>
      purchasesApi.updatePurchaseOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(variables.id) });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesApi.cancelPurchaseOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(id) });
    },
  });
}
