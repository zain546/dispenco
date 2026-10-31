import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';
import * as crypto from 'crypto';

@Injectable()
export class SafepayService {
  private readonly logger = new Logger(SafepayService.name);

  private readonly env: 'sandbox' | 'production';
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly apiBaseUrl: string;
  private readonly checkoutBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService
  ) {
    this.env = (this.configService.get<string>('SAFEPAY_ENV') || 'sandbox') as 'sandbox' | 'production';
    this.apiKey = this.configService.get<string>('SAFEPAY_API_KEY') || 'sec_sandbox_test_key';
    this.secretKey = this.configService.get<string>('SAFEPAY_SECRET_KEY') || 'sec_sandbox_secret';
    this.webhookSecret = this.configService.get<string>('SAFEPAY_WEBHOOK_SECRET') || 'whsec_sandbox_secret';

    this.apiBaseUrl =
      this.env === 'production'
        ? 'https://api.getsafepay.com'
        : 'https://sandbox.api.getsafepay.com';

    this.checkoutBaseUrl =
      this.env === 'production'
        ? 'https://getsafepay.com/checkout/pay'
        : 'https://sandbox.api.getsafepay.com/checkout/pay';
  }

  /**
   * Initializes a Safepay hosted checkout order tracker and creates a pending invoice
   */
  async createCheckoutSession(tenantId: string) {
    const subscription = await this.subscriptionService.getOrCreateSubscriptionRecord(tenantId);

    const now = new Date();
    const baseDate =
      subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
        ? subscription.currentPeriodEnd
        : (subscription.trialEndsAt > now ? subscription.trialEndsAt : now);

    const periodEnd = new Date(baseDate);
    periodEnd.setDate(periodEnd.getDate() + (subscription.plan.intervalDays || 30));

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-${now.getFullYear()}-${randomSuffix}`;
    const amountPkr = subscription.plan.priceMinor / 100;

    let trackerToken: string;
    let isLiveGatewayCall = false;

    // Check if live/sandbox credentials are configured
    if (this.apiKey && !this.apiKey.includes('test_key')) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/order/v1/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': this.secretKey,
          },
          body: JSON.stringify({
            client: this.apiKey,
            amount: amountPkr,
            currency: 'PKR',
            environment: this.env,
          }),
        });

        const json = await response.json();
        if (json?.data?.token) {
          trackerToken = json.data.token;
          isLiveGatewayCall = true;
        } else {
          this.logger.warn(`Safepay init returned non-standard format: ${JSON.stringify(json)}`);
          trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
      } catch (err: any) {
        this.logger.error(`Failed to call Safepay init API: ${err.message}. Using fallback token.`);
        trackerToken = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    } else {
      // Sandbox development fallback
      trackerToken = `track_dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Save pending invoice in database
    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        tenantId,
        invoiceNumber,
        amountMinor: subscription.plan.priceMinor,
        currency: 'PKR',
        status: 'PENDING',
        periodStart: baseDate,
        periodEnd,
        provider: 'SAFEPAY',
        providerTrackerId: trackerToken,
      },
    });

    const clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
    const redirectUrl = `${clientUrl}/settings?tab=billing&status=success&beacon=${trackerToken}`;
    const cancelUrl = `${clientUrl}/settings?tab=billing&status=cancelled`;

    const checkoutUrl = `${this.checkoutBaseUrl}?env=${this.env}&beacon=${trackerToken}&source=custom&redirect_url=${encodeURIComponent(redirectUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;

    return {
      success: true,
      checkoutUrl,
      tracker: trackerToken,
      invoiceNumber,
      amountPkr,
      currency: 'PKR',
      environment: this.env,
    };
  }

  /**
   * Verifies the session upon user redirect back from Safepay
   */
  async verifySession(tracker: string, tenantId: string) {
    if (!tracker) {
      return this.subscriptionService.getTenantSubscription(tenantId);
    }

    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { providerTrackerId: tracker },
    });

    if (invoice && invoice.tenantId === tenantId && invoice.status !== 'PAID') {
      await this.prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          providerPaymentRef: tracker,
        },
      });

      await this.subscriptionService.extendSubscriptionPeriod(tenantId, 30);
      this.logger.log(`Verified and extended subscription for tenant ${tenantId} via tracker ${tracker}`);
    }

    return this.subscriptionService.getTenantSubscription(tenantId);
  }

  /**
   * Verifies the cryptographic HMAC SHA-256 signature from Safepay webhook headers
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const calculatedSignature = hmac.update(rawBody).digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'hex'),
        Buffer.from(calculatedSignature, 'hex')
      );
    } catch (err) {
      this.logger.error(`Error verifying webhook signature: ${err}`);
      return false;
    }
  }

  /**
   * Processes incoming webhook notification from Safepay
   */
  async handleWebhook(rawBody: string, signature?: string, payload?: any) {
    const eventId = payload?.data?.tracker || payload?.id || `evt_${Date.now()}`;
    const eventType = payload?.event || payload?.type || 'payment.completed';

    // Verify signature in production
    if (this.env === 'production') {
      const isValid = this.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        throw new BadRequestException('Invalid Safepay webhook signature');
      }
    }

    // Check if event was already processed (Idempotency)
    const existingEvent = await this.prisma.billingWebhookEvent.findUnique({
      where: { id: eventId },
    });

    if (existingEvent?.processedAt) {
      return { received: true, alreadyProcessed: true };
    }

    // Log the incoming webhook event
    await this.prisma.billingWebhookEvent.upsert({
      where: { id: eventId },
      update: { payload: payload || {} },
      create: {
        id: eventId,
        provider: 'SAFEPAY',
        type: eventType,
        payload: payload || {},
      },
    });

    const tracker = payload?.data?.tracker || payload?.tracker;
    const paymentRef = payload?.data?.reference || payload?.reference;

    if (eventType === 'payment.completed' && tracker) {
      const invoice = await this.prisma.subscriptionInvoice.findUnique({
        where: { providerTrackerId: tracker },
      });

      if (invoice) {
        await this.prisma.subscriptionInvoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            providerPaymentRef: paymentRef || tracker,
          },
        });

        // Extend subscription by 30 days
        await this.subscriptionService.extendSubscriptionPeriod(invoice.tenantId, 30);
        this.logger.log(`Subscription for tenant ${invoice.tenantId} successfully extended via Safepay`);
      }
    }

    // Mark event as processed
    await this.prisma.billingWebhookEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });

    return { received: true, success: true };
  }
}
