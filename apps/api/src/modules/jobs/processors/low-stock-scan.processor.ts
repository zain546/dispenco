import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LowStockScanProcessor {
  private readonly logger = new Logger(LowStockScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'scan-low-stock') {
      return this.handleLowStockScan();
    }
  }

  private async handleLowStockScan() {
    this.logger.log('Starting automated low-stock inventory scan...');

    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        batches: {
          select: { quantityRemaining: true },
        },
      },
    });

    let flaggedCount = 0;

    for (const product of products) {
      const totalStock = product.batches.reduce(
        (sum, batch) => sum + batch.quantityRemaining,
        0,
      );

      if (totalStock <= product.lowStockThreshold) {
        flaggedCount++;
        await this.notificationsService.createLowStockNotifications(
          product.tenantId,
          product.id,
          product.name,
          totalStock,
          product.lowStockThreshold,
        );

        // Step 3.15: Wire to real delivery if owner/staff has a phone on record
        try {
          const owner = await this.prisma.user.findFirst({
            where: {
              tenantId: product.tenantId,
              phone: { not: null },
            },
            select: { phone: true },
          });

          if (owner?.phone) {
            await this.notificationsService.sendMessage(
              product.tenantId,
              owner.phone,
              'LOW_STOCK_ALERT',
              {
                storeName: 'Pharmacy Dispensary',
                productName: product.name,
                currentStock: totalStock,
                threshold: product.lowStockThreshold,
              },
              'WHATSAPP',
            );
          }
        } catch (e: any) {
          this.logger.warn(`Could not dispatch external low-stock alert: ${e.message}`);
        }
      }
    }

    this.logger.log(`Completed low-stock scan. Processed ${products.length} products, flagged ${flaggedCount}.`);
    return { processed: products.length, flagged: flaggedCount };
  }
}
