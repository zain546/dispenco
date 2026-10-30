import { useAuth } from '@/context/auth-context';
import { Permission, DEFAULT_STAFF_PERMISSIONS } from '@dispenco/types';

export function usePermissions() {
  const { user } = useAuth();

  const isOwner = user?.role === 'Owner' || user?.role === 'OWNER';
  const isManager = user?.role === 'Manager' || user?.role === 'MANAGER';
  const isStaff = user?.role === 'Staff' || user?.role === 'STAFF';

  // Permission set
  const userPermissions =
    user?.permissions ||
    (isOwner
      ? Object.values(Permission)
      : isManager
      ? Object.values(Permission)
      : DEFAULT_STAFF_PERMISSIONS);

  const hasPermission = (permission: Permission | string): boolean => {
    if (isOwner) return true;
    return userPermissions.includes(permission as Permission);
  };

  const hasAllPermissions = (...permissions: (Permission | string)[]): boolean => {
    if (isOwner) return true;
    return permissions.every((p) => userPermissions.includes(p as Permission));
  };

  // Specific Action Flags
  const canVoidSales = isOwner || isManager || hasPermission(Permission.SALES_VOID);
  const canViewReports = isOwner || isManager || hasPermission(Permission.REPORTS_READ);
  const canExportReports = isOwner || isManager || hasPermission(Permission.REPORTS_EXPORT);
  const canManageSuppliers = isOwner || isManager || hasPermission(Permission.SUPPLIERS_MANAGE) || hasPermission(Permission.SETTINGS_MANAGE);
  const canDeleteProducts = isOwner || isManager || hasPermission(Permission.INVENTORY_DELETE);
  const canAdjustStock = isOwner || isManager || hasPermission(Permission.INVENTORY_ADJUST);
  const canViewCostPrice = isOwner || isManager || hasPermission(Permission.INVENTORY_VIEW_COST);
  const canManageStaff = isOwner || isManager || hasPermission(Permission.STAFF_MANAGE) || hasPermission(Permission.USERS_MANAGE);
  const canManageRoles = isOwner || hasPermission(Permission.ROLES_MANAGE);
  const canManageSettings = isOwner || isManager || hasPermission(Permission.SETTINGS_MANAGE);
  const canManageInventory = isOwner || isManager || hasPermission(Permission.INVENTORY_CREATE) || hasPermission(Permission.INVENTORY_ADJUST);
  const canManageTransfers = isOwner || isManager || hasPermission(Permission.INVENTORY_ADJUST) || hasPermission(Permission.INVENTORY_CREATE);
  const canManageBilling = isOwner || hasPermission(Permission.BILLING_MANAGE);

  return {
    role: user?.role || 'Owner',
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
