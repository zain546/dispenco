import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  prescriptionsApi,
  QueryPrescriptionsParams,
  CreatePrescriptionPayload,
  DispensePrescriptionPayload,
} from '../services/prescriptions-api';
import { queryKeys } from '@/lib/query-keys';

export function usePrescriptions(
  params?: QueryPrescriptionsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.prescriptions.list(params?.storeId, params as Record<string, unknown>),
    queryFn: () => prescriptionsApi.getPrescriptions(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function usePrescriptionDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.prescriptions.detail(id),
    queryFn: () => prescriptionsApi.getPrescriptionById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) =>
      prescriptionsApi.createPrescription(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
  });
}

export function useDispensePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DispensePrescriptionPayload }) =>
      prescriptionsApi.dispensePrescription(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
