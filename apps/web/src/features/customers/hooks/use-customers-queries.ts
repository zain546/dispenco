import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  customersApi,
  QueryCustomersParams,
  CustomerListResponse,
  CustomerDetailResponse,
  CustomerLedgerResponse,
  CustomerItem,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  RecordKhataPaymentPayload,
} from '../services/customers-api';

/**
 * Hook to query paginated customer list with server-side search and balance filters.
 * Configured with 30-second staleTime to prevent unnecessary background refetches.
 */
export function useCustomers(params?: QueryCustomersParams) {
  return useQuery<CustomerListResponse>({
    queryKey: queryKeys.customers.list(params as Record<string, unknown>),
    queryFn: () => customersApi.getCustomers(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch detailed customer profile, purchase stats, and recent sales.
 */
export function useCustomerDetail(customerId: string | null | undefined) {
  return useQuery<CustomerDetailResponse>({
    queryKey: queryKeys.customers.detail(customerId || ''),
    queryFn: () => customersApi.getCustomer(customerId!),
    enabled: Boolean(customerId),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch chronological Khata ledger timeline entries and computed balance.
 */
export function useCustomerLedger(customerId: string | null | undefined) {
  return useQuery<CustomerLedgerResponse>({
    queryKey: queryKeys.customers.ledger(customerId || ''),
    queryFn: () => customersApi.getLedger(customerId!),
    enabled: Boolean(customerId),
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation to register a new customer in the store directory.
 * Automatically invalidates all customer list queries.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<CustomerItem, Error, CreateCustomerPayload>({
    mutationFn: (payload) => customersApi.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

/**
 * Mutation to update an existing customer's contact details.
 * Automatically invalidates customer list and specific detail caches.
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<CustomerItem, Error, { id: string; payload: UpdateCustomerPayload }>({
    mutationFn: ({ id, payload }) => customersApi.updateCustomer(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
    },
  });
}

/**
 * Mutation to remove a customer with zero balance and zero activity.
 * Automatically invalidates customer list cache.
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

/**
 * Mutation to record a Khata debt repayment or advance deposit.
 * Automatically invalidates list, profile detail, and ledger statement caches.
 */
export function useRecordKhataPayment() {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      message: string;
      payment: {
        id: string;
        amount: number;
        method: string;
        reference?: string;
        createdAt: string;
      };
      newCreditBalance: number;
    },
    Error,
    { customerId: string; payload: RecordKhataPaymentPayload }
  >({
    mutationFn: ({ customerId, payload }) => customersApi.recordPayment(customerId, payload),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.ledger(customerId) });
    },
  });
}
