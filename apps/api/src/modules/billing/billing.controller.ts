import { Controller, Get, Post, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SafepayService } from './safepay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '@dispenco/types';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly safepayService: SafepayService
  ) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionService.getTenantSubscription(tenantId);
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.BILLING_MANAGE)
  async createCheckoutSession(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.safepayService.createCheckoutSession(tenantId);
  }

  @Post('verify-session')
  @UseGuards(JwtAuthGuard)
  async verifySession(@Body() body: { tracker: string }, @Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionService.getTenantSubscription(tenantId);
  }

  @Post('safepay/webhook')
  async safepayWebhook(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-sfpy-signature') signature?: string
  ) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(body);
    return this.safepayService.handleWebhook(rawBody, signature, body);
  }

  @Post('mock-renew')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.BILLING_MANAGE)
  async mockRenew(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.subscriptionService.extendSubscriptionPeriod(tenantId, 30);
  }
}
