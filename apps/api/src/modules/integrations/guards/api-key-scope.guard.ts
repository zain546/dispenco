import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicApiScope } from '@dispenco/types';
import { PUBLIC_SCOPE_KEY } from '../decorators/require-public-scope.decorator';
import { AuthenticatedApiKey } from '../decorators/current-api-key.decorator';

@Injectable()
export class ApiKeyScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<PublicApiScope>(
      PUBLIC_SCOPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey: AuthenticatedApiKey | undefined = request.apiKey;

    if (!apiKey) {
      throw new ForbiddenException('API Key credentials missing');
    }

    const permissions = apiKey.permissions || [];

    if (!permissions.includes(requiredScope)) {
      throw new ForbiddenException(
        `Insufficient scope. This endpoint requires '${requiredScope}'. Granted scopes: [${permissions.join(', ')}]`
      );
    }

    return true;
  }
}
