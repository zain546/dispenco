import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLowStockNotifications(
    tenantId: string,
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existing = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        type: 'LOW_STOCK',
        message: {
          contains: productName,
        },
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    if (existing) {
      this.logger.debug(`Low-stock notification for product ${productName} (${productId}) already sent within 24h.`);
      return { skipped: true };
    }

    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    if (users.length === 0) return { skipped: true };

    const message = `Low Stock Alert: ${productName} has ${currentStock} units remaining (Threshold: ${threshold}).`;

    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        tenantId,
        userId: user.id,
        type: 'LOW_STOCK',
        message,
        read: false,
      })),
    });

    this.logger.log(`Created low stock alert for ${productName} for ${users.length} users.`);
    return { created: users.length };
  }

  async createExpiryNotifications(
    tenantId: string,
    batchId: string,
    productName: string,
    batchNumber: string,
    daysRemaining: number,
  ) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existing = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        type: 'EXPIRY',
        message: {
          contains: batchNumber,
        },
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    if (existing) {
      this.logger.debug(`Expiry notification for batch ${batchNumber} (${batchId}) already sent within 24h.`);
      return { skipped: true };
    }

    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    if (users.length === 0) return { skipped: true };

    const message = daysRemaining <= 0
      ? `EXPIRATION ALERT: ${productName} (Batch ${batchNumber}) has EXPIRED!`
      : `Expiry Warning: ${productName} (Batch ${batchNumber}) expires in ${daysRemaining} days.`;

    await this.prisma.notification.createMany({
      data: users.map((user) => ({
        tenantId,
        userId: user.id,
        type: 'EXPIRY',
        message,
        read: false,
      })),
    });

    this.logger.log(`Created expiry alert for batch ${batchNumber} for ${users.length} users.`);
    return { created: users.length };
  }

  async findAllForUser(tenantId: string, userId: string, unreadOnly?: boolean) {
    const where: any = { tenantId, userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await this.prisma.notification.count({
      where: { tenantId, userId, read: false },
    });

    return {
      success: true,
      data: notifications,
      unreadCount,
    };
  }

  async markAsRead(tenantId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return {
      success: true,
      data: updated,
      message: 'Notification marked as read',
    };
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, userId, read: false },
      data: { read: true },
    });

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}
