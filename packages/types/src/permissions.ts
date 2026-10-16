export enum Permission {
  // Inventory & Stock
  INVENTORY_READ = 'inventory:read',
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_DELETE = 'inventory:delete',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_VIEW_COST = 'inventory:view_cost',

  // Sales & POS Counter
  SALES_READ = 'sales:read',
  SALES_CREATE = 'sales:create',
  SALES_VOID = 'sales:void',
  CUSTOMERS_READ = 'customers:read',
  CUSTOMERS_MANAGE = 'customers:manage',

  // Purchases & Suppliers
  PURCHASES_READ = 'purchases:read',
  PURCHASES_CREATE = 'purchases:create',
  SUPPLIERS_MANAGE = 'suppliers:manage',

  // Prescriptions & Controlled Substances
  PRESCRIPTIONS_READ = 'prescriptions:read',
  PRESCRIPTIONS_MANAGE = 'prescriptions:manage',

  // Reports & Analytics
  REPORTS_READ = 'reports:read',
  REPORTS_EXPORT = 'reports:export',

  // Team & Administration
  STAFF_MANAGE = 'staff:manage',
  ROLES_MANAGE = 'roles:manage',
  USERS_MANAGE = 'users:manage', // Legacy alias for staff:manage
  SETTINGS_MANAGE = 'settings:manage',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export interface PermissionDefinition {
  code: Permission;
  name: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  title: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'inventory',
    title: 'Inventory & Stock',
    description: 'Control access to medicine catalog, batches, and stock adjustments',
    permissions: [
      {
        code: Permission.INVENTORY_READ,
        name: 'View Inventory',
        description: 'Search and view catalog medicines, stock levels, and active batch shelf status',
      },
      {
        code: Permission.INVENTORY_CREATE,
        name: 'Add Medicines & Stock',
        description: 'Register new medicines in the master catalog and receive incoming stock batches',
      },
      {
        code: Permission.INVENTORY_UPDATE,
        name: 'Edit Medicine Details',
        description: 'Modify medicine metadata, dosages, packaging units, and reorder thresholds',
      },
      {
        code: Permission.INVENTORY_DELETE,
        name: 'Deactivate / Delete Medicines',
        description: 'Deactivate medicines or archive them from the company formulary',
      },
      {
        code: Permission.INVENTORY_ADJUST,
        name: 'Manual Stock Adjustments',
        description: 'Record stock reconciliations, damage, write-offs, and loss audit logs',
      },
      {
        code: Permission.INVENTORY_VIEW_COST,
        name: 'View Wholesale Cost Prices',
        description: 'Inspect purchase cost prices and profit margins across batches',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & POS Billing',
    description: 'Control point-of-sale checkout, customer billing, and receipt cancellations',
    permissions: [
      {
        code: Permission.SALES_READ,
        name: 'View Sales History',
        description: 'Search and inspect previous customer receipts and transaction ledgers',
      },
      {
        code: Permission.SALES_CREATE,
        name: 'Process POS Sales',
        description: 'Operate the POS billing counter, scan medicines, and complete sales checkouts',
      },
      {
        code: Permission.SALES_VOID,
        name: 'Void Sales Receipts',
        description: 'Cancel completed customer transactions and restore deducted batch quantities',
      },
      {
        code: Permission.CUSTOMERS_READ,
        name: 'View Customers & Ledgers',
        description: 'Search customer directories, view profiles, and inspect credit transaction history',
      },
      {
        code: Permission.CUSTOMERS_MANAGE,
        name: 'Manage Customers & Khata',
        description: 'Add new customers, update contact records, and record debt settlement payments',
      },
    ],
  },
  {
    id: 'purchasing',
    title: 'Purchasing & Suppliers',
    description: 'Procurement orders, distributor management, and vendor bills',
    permissions: [
      {
        code: Permission.PURCHASES_READ,
        name: 'View Purchase Orders',
        description: 'Inspect open, pending, and received purchase orders from vendors',
      },
      {
        code: Permission.PURCHASES_CREATE,
        name: 'Create Purchase Orders',
        description: 'Generate purchase orders and draft stock replenishment requests',
      },
      {
        code: Permission.SUPPLIERS_MANAGE,
        name: 'Manage Distributors & Suppliers',
        description: 'Add, update, and manage pharmaceutical vendor contacts and lead times',
      },
    ],
  },
  {
    id: 'reports',
    title: 'Analytics & Financial Reports',
    description: 'Store revenue, branch comparison matrix, and financial ledger exports',
    permissions: [
      {
        code: Permission.REPORTS_READ,
        name: 'View Analytics & Reports',
        description: 'Access revenue charts, top product sales metrics, and branch performance',
      },
      {
        code: Permission.REPORTS_EXPORT,
        name: 'Export Ledgers & Reports',
        description: 'Download sales summaries, tax audit sheets, and CSV/PDF financial files',
      },
    ],
  },
  {
    id: 'administration',
    title: 'Team & Settings',
    description: 'User accounts, custom roles, branch stores, and pharmacy preferences',
    permissions: [
      {
        code: Permission.STAFF_MANAGE,
        name: 'Manage Staff Members',
        description: 'Invite new employees, change assigned roles, and toggle account activation',
      },
      {
        code: Permission.ROLES_MANAGE,
        name: 'Manage Roles & Permissions',
        description: 'Create and edit custom roles with tailored permission combinations',
      },
      {
        code: Permission.SETTINGS_MANAGE,
        name: 'Store & Pharmacy Settings',
        description: 'Configure branch stores, currency, tax rates, and expiry alert windows',
      },
    ],
  },
];

export const DEFAULT_STAFF_PERMISSIONS = [
  Permission.INVENTORY_READ,
  Permission.INVENTORY_CREATE,
  Permission.SALES_READ,
  Permission.SALES_CREATE,
  Permission.PURCHASES_READ,
  Permission.CUSTOMERS_READ,
];

export const DEFAULT_MANAGER_PERMISSIONS = [
  Permission.INVENTORY_READ,
  Permission.INVENTORY_CREATE,
  Permission.INVENTORY_UPDATE,
  Permission.INVENTORY_DELETE,
  Permission.INVENTORY_ADJUST,
  Permission.INVENTORY_VIEW_COST,
  Permission.SALES_READ,
  Permission.SALES_CREATE,
  Permission.SALES_VOID,
  Permission.CUSTOMERS_READ,
  Permission.CUSTOMERS_MANAGE,
  Permission.PURCHASES_READ,
  Permission.PURCHASES_CREATE,
  Permission.SUPPLIERS_MANAGE,
  Permission.REPORTS_READ,
  Permission.REPORTS_EXPORT,
  Permission.STAFF_MANAGE,
];

export const DEFAULT_PHARMACIST_PERMISSIONS = [
  Permission.INVENTORY_READ,
  Permission.INVENTORY_CREATE,
  Permission.INVENTORY_UPDATE,
  Permission.INVENTORY_ADJUST,
  Permission.SALES_READ,
  Permission.SALES_CREATE,
  Permission.PURCHASES_READ,
  Permission.CUSTOMERS_READ,
  Permission.CUSTOMERS_MANAGE,
];

export const DEFAULT_CASHIER_PERMISSIONS = [
  Permission.INVENTORY_READ,
  Permission.SALES_READ,
  Permission.SALES_CREATE,
  Permission.CUSTOMERS_READ,
  Permission.CUSTOMERS_MANAGE,
];
