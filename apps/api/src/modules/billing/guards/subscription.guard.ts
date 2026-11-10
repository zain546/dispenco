import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';
import { SubscriptionService } from '../subscription.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly jwtAuthGuard = new JwtAuthGuard();

  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isSkipped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Read-only operations are always permitted (never lock out data)
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const path = request.originalUrl || request.url || '';
    // Auth, Billing, and health endpoints must remain accessible for renewal and login
    if (
      path.includes('/auth/') ||
      path.includes('/billing/') ||
      path.includes('/health') ||
      path === '/' ||
      path === '/api/v1'
    ) {
      return true;
    }

    // When running as a global APP_GUARD before controller-level JwtAuthGuard,
    // request.user is not yet populated. Authenticate via JwtAuthGuard first to obtain tenantId.
    if (!request.user) {
      try {
        await Promise.resolve(this.jwtAuthGuard.canActivate(context));
      } catch {
        // Unauthenticated or invalid token; allow request through so controller-level
        // JwtAuthGuard can issue the standard 401 Unauthorized response.
        return true;
      }
    }

    const user = request.user;
    if (!user || !user.tenantId) {
      return true; // Let auth guard handle unauthenticated requests
    }

    const sub = await this.subscriptionService.getTenantSubscription(user.tenantId);
    if (sub.isExpired) {
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message:
            'Subscription expired. Your account is in Read-Only mode. Please renew your subscription to perform write operations.',
          code: 'SUBSCRIPTION_EXPIRED',
          daysRemaining: 0,
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    return true;
  }
}
