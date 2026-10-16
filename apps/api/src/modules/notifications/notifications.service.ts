import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingProvider } from './providers/messaging.provider';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingProvider: MessagingProvider,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

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

  /**
   * Step 3.14 — Messaging gateway integration
   * Sends an outbound notification via WhatsApp or SMS using BullMQ background queue,
   * with retry logic and formatted templates.
   */
  async sendMessage(
    tenantId: string,
    phone: string,
    template: 'INVOICE_RECEIPT' | 'KHATA_REMINDER' | 'LOW_STOCK_ALERT' | 'EXPIRY_ALERT' | 'RETURN_RECEIPT' | 'CUSTOM',
    params: Record<string, any>,
    channel: 'WHATSAPP' | 'SMS' = 'WHATSAPP',
  ) {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('A valid recipient phone number is required');
    }

    const messageText = this.buildMessageText(template, params);

    // Queue in BullMQ for background dispatch with retry-on-failure
    await this.jobsService.queueOutboundMessage({
      tenantId,
      recipientPhone: phone.trim(),
      channel,
      messageText,
      mediaUrl: params.mediaUrl,
      metadata: { template, ...params },
    });

    const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
      messageText,
    )}`;

    return {
      success: true,
      channel,
      recipient: phone.trim(),
      messageText,
      directWhatsAppUrl,
      status: 'QUEUED',
      message: `${channel} message has been queued for delivery.`,
    };
  }

  /**
   * Step 3.13 — Digital invoice delivery
   * Sends digital invoice link and summary via WhatsApp/SMS to customer phone
   */
  async sendSaleInvoice(tenantId: string, saleId: string, recipientPhone?: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        customer: true,
        store: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale transaction with ID "${saleId}" not found`);
    }

    const phone = recipientPhone || sale.customer?.phone;
    if (!phone) {
      throw new BadRequestException(
        'No phone number available for customer. Please provide a phone number to send digital invoice.',
      );
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invoiceUrl = `${frontendBaseUrl}/pos/receipt/${sale.id}`;

    return this.sendMessage(
      tenantId,
      phone,
      'INVOICE_RECEIPT',
      {
        customerName: sale.customer?.name || 'Valued Customer',
        storeName: sale.store.name,
        receiptNumber: sale.receiptNumber,
        currency: sale.store.currency,
        totalAmount: Number(sale.totalAmount).toFixed(2),
        invoiceUrl,
      },
      'WHATSAPP',
    );
  }

  /**
   * Template formatter for pharmacy outbound messages
   */
  private buildMessageText(
    template: 'INVOICE_RECEIPT' | 'KHATA_REMINDER' | 'LOW_STOCK_ALERT' | 'EXPIRY_ALERT' | 'RETURN_RECEIPT' | 'CUSTOM',
    params: Record<string, any>,
  ): string {
    switch (template) {
      case 'INVOICE_RECEIPT':
        return (
          `*${params.storeName || 'Pharmacy'} - Digital Tax Receipt*\n\n` +
          `Dear ${params.customerName || 'Customer'},\n` +
          `Thank you for choosing ${params.storeName || 'us'}! Your purchase invoice is ready:\n\n` +
          `📄 *Invoice #:* ${params.receiptNumber}\n` +
          `💰 *Total Amount:* ${params.currency || 'PKR'} ${params.totalAmount}\n\n` +
          `🔗 *View / Print Full Tax Invoice:*\n${params.invoiceUrl}\n\n` +
          `_We wish you good health!_`
        );

      case 'KHATA_REMINDER':
        return (
          `*${params.storeName || 'Pharmacy'} - Khata Balance Reminder*\n\n` +
          `Dear ${params.customerName},\n` +
          `This is a gentle reminder regarding your outstanding credit ledger balance:\n\n` +
          `💳 *Current Outstanding Balance:* ${params.currency || 'PKR'} ${params.creditBalance}\n\n` +
          `Please visit our counter at your convenience or contact us for balance settlement. Thank you for your continued trust!`
        );

      case 'LOW_STOCK_ALERT':
        return (
          `🚨 *[DISPENCO ALERT] Low Inventory Warning*\n` +
          `Store: ${params.storeName}\n` +
          `Medicine: *${params.productName}*\n` +
          `Remaining Units: ${params.currentStock} (Low Threshold: ${params.threshold})\n` +
          `Action: Please arrange supplier purchase reorder.`
        );

      case 'EXPIRY_ALERT':
        return (
          `⚠️ *[DISPENCO ALERT] Batch Expiry Warning*\n` +
          `Store: ${params.storeName}\n` +
          `Medicine: *${params.productName}*\n` +
          `Batch: ${params.batchNumber}\n` +
          `Status: ${Number(params.daysRemaining) <= 0 ? 'HAS EXPIRED!' : `Expires in ${params.daysRemaining} days`}\n` +
          `Action: Please review shelf stock immediately.`
        );

      case 'RETURN_RECEIPT':
        return (
          `*${params.storeName || 'Pharmacy'} - Return Voucher*\n\n` +
          `Dear ${params.customerName || 'Customer'},\n` +
          `Your return for invoice #${params.receiptNumber} has been processed:\n\n` +
          `🔄 *Return Memo #:* ${params.returnNumber}\n` +
          `💵 *Refund Issued:* ${params.currency || 'PKR'} ${params.refundAmount} (${params.refundMethod})\n\n` +
          `Thank you for shopping with us.`
        );

      case 'CUSTOM':
      default:
        return params.message || 'Notification from pharmacy.';
    }
  }
}
