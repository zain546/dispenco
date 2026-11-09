/**
 * Centralized TanStack Query Key Factory
 *
 * Scopes query keys hierarchically to enable targeted cache invalidation
 * (e.g., invalidating ['inventory', { storeId: 'xyz' }] busts only that store's queries,
 * while invalidating ['inventory'] busts all inventory queries across all stores).
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  stores: {
    all: ['stores'] as const,
    chainOverview: ['stores', 'chain-overview'] as const,
    detail: (id: string) => ['stores', 'detail', id] as const,
  },
  billing: {
    subscription: ['billing', 'subscription'] as const,
    invoices: ['billing', 'invoices'] as const,
  },
  inventory: {
    all: (storeId?: string) => ['inventory', { storeId: storeId ?? 'all' }] as const,
    aggregation: (storeId?: string) => [...queryKeys.inventory.all(storeId), 'aggregation'] as const,
    products: (storeId?: string, params?: Record<string, unknown>) =>
      [...queryKeys.inventory.all(storeId), 'products', params ?? {}] as const,
    batches: (productId: string, storeId?: string) =>
      [...queryKeys.inventory.all(storeId), 'batches', productId] as const,
    expiryRisk: (storeId?: string, days?: number) =>
      [...queryKeys.inventory.all(storeId), 'expiry-risk', days ?? 90] as const,
    lowStock: (storeId?: string) =>
      [...queryKeys.inventory.all(storeId), 'low-stock'] as const,
  },
  sales: {
    all: (storeId?: string) => ['sales', { storeId: storeId ?? 'all' }] as const,
    recent: (storeId?: string, limit?: number) =>
      [...queryKeys.sales.all(storeId), 'recent', limit ?? 10] as const,
    detail: (id: string) => ['sales', 'detail', id] as const,
    returns: (storeId?: string, params?: Record<string, unknown>) =>
      [...queryKeys.sales.all(storeId), 'returns', params ?? {}] as const,
  },
  reports: {
    sales: (storeId?: string, params?: Record<string, unknown>) =>
      ['reports', 'sales', { storeId: storeId ?? 'all', ...(params ?? {}) }] as const,
    anomalies: (storeId?: string, params?: Record<string, unknown>) =>
      ['reports', 'anomalies', { storeId: storeId ?? 'all', ...(params ?? {}) }] as const,
    audit: (params?: Record<string, unknown>) =>
      ['reports', 'audit', params ?? {}] as const,
    chainOverview: ['reports', 'chain-overview'] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (params?: Record<string, unknown>) => ['customers', 'list', params ?? {}] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    ledger: (id: string) => ['customers', 'ledger', id] as const,
  },
  taxRates: {
    all: ['tax-rates'] as const,
  },
} as const;

