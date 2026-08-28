import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@dispenco/types';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Owner role automatically bypasses permission checks
    if (user.role === 'Owner' || user.role === 'OWNER') {
      return true;
    }

    const userPermissions = user.permissions || [];

    const hasAllRequired = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllRequired) {
      throw new ForbiddenException(
        `Forbidden resource. Required permission: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
