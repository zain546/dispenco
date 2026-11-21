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
      return this.handleLowStockScan(job.data?.tenantId);
    }
  }

  private async handleLowStockScan(tenantId?: string) {
    this.logger.log(
      tenantId
        ? `Starting low-stock inventory scan for tenant ${tenantId}...`
        : 'Starting automated low-stock inventory scan across all tenants...',
    );

    const tenants = tenantId
      ? [{ id: tenantId }]
      : await this.prisma.tenant.findMany({ select: { id: true } });

    let totalProcessed = 0;
    let totalFlagged = 0;
    const tenantOwnerPhoneMap = new Map<string, string | null>();

    for (const tenant of tenants) {
      const products = await this.prisma.product.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        include: {
          batches: {
            where: { quantityRemaining: { gt: 0 } },
            select: { quantityRemaining: true },
          },
        },
      });

      totalProcessed += products.length;

      for (const product of products) {
        const totalStock = product.batches.reduce(
          (sum, batch) => sum + batch.quantityRemaining,
          0,
        );

        if (totalStock <= product.lowStockThreshold) {
          totalFlagged++;
          await this.notificationsService.createLowStockNotifications(
            product.tenantId,
            product.id,
            product.name,
            totalStock,
            product.lowStockThreshold,
          );

          // Cached owner phone lookup per tenant to avoid repeated DB roundtrips in loop
          try {
            if (!tenantOwnerPhoneMap.has(product.tenantId)) {
              const owner = await this.prisma.user.findFirst({
                where: {
                  tenantId: product.tenantId,
                  phone: { not: null },
                },
                select: { phone: true },
              });
              tenantOwnerPhoneMap.set(product.tenantId, owner?.phone || null);
            }

            const phone = tenantOwnerPhoneMap.get(product.tenantId);
            if (phone) {
              await this.notificationsService.sendMessage(
                product.tenantId,
                phone,
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
    }

    this.logger.log(`Completed low-stock scan. Processed ${totalProcessed} products, flagged ${totalFlagged}.`);
    return { processed: totalProcessed, flagged: totalFlagged };
  }
}
