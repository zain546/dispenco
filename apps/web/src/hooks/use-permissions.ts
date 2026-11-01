import { useAuth } from '@/context/auth-context';
import { Permission } from '@dispenco/types';

export function usePermissions() {
  const { user } = useAuth();

  const isOwner = user?.role === 'Owner' || user?.role === 'OWNER';
  const isManager = user?.role === 'Manager' || user?.role === 'MANAGER';
  const isStaff = user?.role === 'Staff' || user?.role === 'STAFF';

  const userPermissions = user?.permissions || [];

  const hasPermission = (permission: Permission | string): boolean => {
    if (isOwner) return true;
    return userPermissions.includes(permission as Permission);
  };

  const hasAllPermissions = (...permissions: (Permission | string)[]): boolean => {
    if (isOwner) return true;
    return permissions.every((p) => userPermissions.includes(p as Permission));
  };

  // Specific Action Flags
  const canVoidSales = isOwner || hasPermission(Permission.SALES_VOID);
  const canViewReports = isOwner || hasPermission(Permission.REPORTS_READ);
  const canExportReports = isOwner || hasPermission(Permission.REPORTS_EXPORT);
  const canManageSuppliers = isOwner || hasPermission(Permission.SUPPLIERS_MANAGE) || hasPermission(Permission.SETTINGS_MANAGE);
  const canDeleteProducts = isOwner || hasPermission(Permission.INVENTORY_DELETE);
  const canAdjustStock = isOwner || hasPermission(Permission.INVENTORY_ADJUST);
  const canViewCostPrice = isOwner || hasPermission(Permission.INVENTORY_VIEW_COST);
  const canManageStaff = isOwner || hasPermission(Permission.STAFF_MANAGE) || hasPermission(Permission.USERS_MANAGE);
  const canManageRoles = isOwner || hasPermission(Permission.ROLES_MANAGE);
  const canManageSettings = isOwner || hasPermission(Permission.SETTINGS_MANAGE);
  const canManageInventory = isOwner || hasPermission(Permission.INVENTORY_CREATE) || hasPermission(Permission.INVENTORY_ADJUST);
  const canManageTransfers = isOwner || hasPermission(Permission.INVENTORY_ADJUST) || hasPermission(Permission.INVENTORY_CREATE);
  const canManageBilling = isOwner || hasPermission(Permission.BILLING_MANAGE);

  return {
    role: user?.role || 'User',
    isOwner,
    isManager,
    isStaff,
    hasPermission,
    hasAllPermissions,
    canVoidSales,
    canViewReports,
    canExportReports,
    canManageSuppliers,
    canDeleteProducts,
    canAdjustStock,
    canViewCostPrice,
    canManageStaff,
    canManageRoles,
    canManageUsers: canManageStaff,
    canManageSettings,
    canManageInventory,
    canManageTransfers,
    canManageBilling,
  };
}
