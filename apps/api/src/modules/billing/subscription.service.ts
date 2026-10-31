import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds or auto-provisions a subscription and default plan for tenant
   */
  async getOrCreateSubscriptionRecord(tenantId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      let defaultPlan = await this.prisma.plan.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!defaultPlan) {
        defaultPlan = await this.prisma.plan.create({
          data: {
            code: 'STANDARD_MONTHLY',
            name: 'Standard Pharmacy Plan',
            priceMinor: 250000, // PKR 2,500 in paisa
            currency: 'PKR',
            intervalDays: 30,
            isActive: true,
          },
        });
      }

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          planId: defaultPlan.id,
          status: SubscriptionStatus.TRIALING,
          trialEndsAt,
        },
        include: {
          plan: true,
        },
      });
    }

    return subscription;
  }

  /**
   * Retrieves subscription status, plan details, and remaining time for tenant
   */
  async getTenantSubscription(tenantId: string) {
    const subscription = await this.getOrCreateSubscriptionRecord(tenantId);

    const now = new Date();
    const isTrial = subscription.status === SubscriptionStatus.TRIALING;
    const expirationDate = isTrial ? subscription.trialEndsAt : (subscription.currentPeriodEnd || subscription.trialEndsAt);
    const msRemaining = expirationDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = now.getTime() > expirationDate.getTime();

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      status: isExpired && subscription.status !== SubscriptionStatus.CANCELED ? SubscriptionStatus.EXPIRED : subscription.status,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        pricePkr: subscription.plan.priceMinor / 100,
        intervalDays: subscription.plan.intervalDays,
      },
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysRemaining,
      isTrial,
      isExpired,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      invoices: await this.prisma.subscriptionInvoice.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          amountMinor: true,
          currency: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          provider: true,
          paidAt: true,
          createdAt: true,
        },
      }).then(invs => invs.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        amount: i.amountMinor / 100,
        currency: i.currency,
        status: i.status,
        billingPeriodStart: i.periodStart.toISOString(),
        billingPeriodEnd: i.periodEnd.toISOString(),
        paidAt: i.paidAt ? i.paidAt.toISOString() : null,
        createdAt: i.createdAt.toISOString(),
      }))),
    };
  }

  /**
   * Extends subscription after successful payment
   */
  async extendSubscriptionPeriod(tenantId: string, days = 30) {
    const sub = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('Subscription record not found');
    }

    const now = new Date();
    // Base renewal off max(now, currentPeriodEnd or trialEndsAt) so early payers do not lose days
    const baseDate = sub.currentPeriodEnd && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : (sub.trialEndsAt > now ? sub.trialEndsAt : now);

    const newPeriodEnd = new Date(baseDate);
    newPeriodEnd.setDate(newPeriodEnd.getDate() + days);

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: baseDate,
        currentPeriodEnd: newPeriodEnd,
        graceEndsAt: null,
      },
      include: {
        plan: true,
      },
    });

    // Create a paid invoice record
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${randomSuffix}`;

    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: sub.id,
        tenantId,
        invoiceNumber,
        amountMinor: sub.plan.priceMinor,
        currency: 'PKR',
        status: 'PAID',
        periodStart: baseDate,
        periodEnd: newPeriodEnd,
        provider: 'SAFEPAY',
        paidAt: now,
      },
    });

    return updated;
  }
}

