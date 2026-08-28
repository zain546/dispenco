import { SetMetadata } from '@nestjs/common';
import { Permission } from '@dispenco/types';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to enforce required permissions on controller endpoints.
 * @example @RequirePermissions(Permission.INVENTORY_READ, Permission.INVENTORY_CREATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
