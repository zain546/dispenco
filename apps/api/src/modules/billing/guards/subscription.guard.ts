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

@Injectable()
export class SubscriptionGuard implements CanActivate {
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
      path.includes('/health')
    ) {
      return true;
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
