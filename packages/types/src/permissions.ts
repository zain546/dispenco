export enum Permission {
  // Inventory
  INVENTORY_READ = 'inventory:read',
  INVENTORY_CREATE = 'inventory:create',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_DELETE = 'inventory:delete',

  // Sales / POS
  SALES_READ = 'sales:read',
  SALES_CREATE = 'sales:create',
  SALES_VOID = 'sales:void',

  // Purchases / Batches
  PURCHASES_READ = 'purchases:read',
  PURCHASES_CREATE = 'purchases:create',

  // Reports
  REPORTS_READ = 'reports:read',

  // Settings & Users
  SETTINGS_MANAGE = 'settings:manage',
  USERS_MANAGE = 'users:manage',
}

export const ALL_PERMISSIONS = Object.values(Permission);

export const DEFAULT_STAFF_PERMISSIONS = [
  Permission.INVENTORY_READ,
  Permission.INVENTORY_CREATE,
  Permission.SALES_READ,
  Permission.SALES_CREATE,
  Permission.PURCHASES_READ,
];
