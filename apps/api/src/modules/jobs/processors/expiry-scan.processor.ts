import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ExpiryScanProcessor {
  private readonly logger = new Logger(ExpiryScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'scan-expiry') {
      return this.handleExpiryScan();
    }
  }

  private async handleExpiryScan() {
    this.logger.log('Starting automated inventory batch expiry scan...');

    const oneHundredEightyDaysFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const batches = await this.prisma.batch.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: {
          lte: oneHundredEightyDaysFromNow,
        },
      },
      include: {
        product: {
          select: { name: true },
        },
        store: {
          select: { tenantId: true },
        },
      },
    });

    let flaggedCount = 0;
    const now = Date.now();

    for (const batch of batches) {
      const daysRemaining = Math.ceil(
        (batch.expiryDate.getTime() - now) / (1000 * 60 * 60 * 24),
      );

      flaggedCount++;
      await this.notificationsService.createExpiryNotifications(
        batch.store.tenantId,
        batch.id,
        batch.product.name,
        batch.batchNumber,
        daysRemaining,
      );

      // Step 3.15: Wire critical near-expiry (<=30 days) or expired batches to real phone delivery
      if (daysRemaining <= 30) {
        try {
          const owner = await this.prisma.user.findFirst({
            where: {
              tenantId: batch.store.tenantId,
              phone: { not: null },
            },
            select: { phone: true },
          });

          if (owner?.phone) {
            await this.notificationsService.sendMessage(
              batch.store.tenantId,
              owner.phone,
              'EXPIRY_ALERT',
              {
                storeName: 'Pharmacy Store',
                productName: batch.product.name,
                batchNumber: batch.batchNumber,
                daysRemaining,
              },
              'WHATSAPP',
            );
          }
        } catch (e: any) {
          this.logger.warn(`Could not dispatch external expiry alert: ${e.message}`);
        }
      }
    }

    this.logger.log(`Completed expiry scan. Evaluated ${batches.length} batches, flagged ${flaggedCount}.`);
    return { processed: batches.length, flagged: flaggedCount };
  }
}
