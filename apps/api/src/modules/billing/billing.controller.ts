import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '@dispenco/types';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('subscription')
  async getSubscription(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionService.getTenantSubscription(tenantId);
  }

  @Post('mock-renew')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.BILLING_MANAGE)
  async mockRenew(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionService.extendSubscriptionPeriod(tenantId, 30);
  }
}
