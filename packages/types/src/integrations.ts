export enum PublicApiScope {
  INVENTORY_READ = 'public:inventory:read',
  SALES_READ = 'public:sales:read',
  REPORTS_READ = 'public:reports:read',
  SUPPLIERS_READ = 'public:suppliers:read',
}

export interface PublicApiScopeDefinition {
  scope: PublicApiScope;
  name: string;
  description: string;
  recommendedFor: string;
}

export const ALL_PUBLIC_API_SCOPES: PublicApiScopeDefinition[] = [
  {
    scope: PublicApiScope.INVENTORY_READ,
    name: 'Inventory & Medicines Read',
    description: 'Read-only access to master catalog, stock levels per store, and batch shelf quantities with expiry dates.',
    recommendedFor: 'E-commerce sync, distributor stock checks, inventory portals',
  },
  {
    scope: PublicApiScope.SALES_READ,
    name: 'Sales & Receipts Read',
    description: 'Read-only access to customer sale transactions, itemized receipts, customer IDs, and payment methods.',
    recommendedFor: 'Accounting software (QuickBooks, Xero), loyalty programs, business intelligence',
  },
  {
    scope: PublicApiScope.REPORTS_READ,
    name: 'Financial Summaries & Metrics',
    description: 'Read-only access to aggregated store revenue, daily sales totals, tax collections, and financial ledgers.',
    recommendedFor: 'Corporate reporting, external dashboards, executive KPI monitors',
  },
  {
    scope: PublicApiScope.SUPPLIERS_READ,
    name: 'Suppliers & Purchases Read',
    description: 'Read-only access to vendor directory, lead times, purchase orders, and receiving records.',
    recommendedFor: 'Vendor ERP sync, supply chain visibility, automated supplier portals',
  },
];

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  permissions: string[];
  rateLimit?: number;
  expiresInDays?: number | null;
}

export interface CreateApiKeyResult {
  apiKey: ApiKeyItem;
  rawKey: string;
}

export interface PublicInventoryItem {
  id: string;
  name: string;
  genericName: string | null;
  category: string;
  unit: string;
  barcode: string | null;
  taxCode: string | null;
  isControlledSubstance: boolean;
  totalStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  storeId?: string;
  storeName?: string;
  attributes: Record<string, unknown>;
  batchesCount: number;
}

export interface PublicBatchItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  sellPrice: number;
  quantityRemaining: number;
  storeId: string;
  storeName: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export interface PublicSaleRecord {
  id: string;
  saleNumber: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  paymentMethod: string;
  customerName?: string | null;
  customerPhone?: string | null;
  itemsCount: number;
  items: Array<{
    productName: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxApplied: number;
    total: number;
  }>;
}

export interface PublicLedgerTransaction {
  id: string;
  date: string;
  transactionType: 'SALE' | 'RETURN' | 'PAYMENT' | 'PURCHASE';
  referenceNumber: string;
  storeId: string;
  storeName: string;
  accountCode: string;
  debit: number;
  credit: number;
  netAmount: number;
  taxAmount: number;
  paymentMethod: string;
  entityName: string;
  description: string;
}

export interface PublicFinancialSummary {
  periodStart: string;
  periodEnd: string;
  totalGrossSales: number;
  totalDiscounts: number;
  totalTaxes: number;
  totalNetSales: number;
  totalTransactions: number;
  averageTicketSize: number;
  paymentMethodsBreakdown: Record<string, number>;
  storesBreakdown: Array<{
    storeId: string;
    storeName: string;
    grossSales: number;
    netSales: number;
    transactions: number;
  }>;
}

export interface PublicSupplierItem {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  leadTimeDays: number;
  isActive: boolean;
  pendingOrdersCount: number;
}
