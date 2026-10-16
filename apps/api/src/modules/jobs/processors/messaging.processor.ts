import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE_NOTIFICATIONS } from '../jobs.constants';
import { MessagingProvider } from '../../notifications/providers/messaging.provider';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(QUEUE_NOTIFICATIONS)
@Injectable()
export class MessagingProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagingProcessor.name);

  constructor(
    private readonly messagingProvider: MessagingProvider,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'send-message') {
      return this.handleSendMessage(job);
    }
  }

  private async handleSendMessage(job: Job<any>) {
    const { tenantId, recipientPhone, channel, messageText, mediaUrl, metadata } = job.data;
    this.logger.log(`Processing outbound ${channel} message for ${recipientPhone}...`);

    let result;
    if (channel === 'SMS') {
      result = await this.messagingProvider.sendSms(recipientPhone, messageText);
    } else {
      result = await this.messagingProvider.sendWhatsApp(recipientPhone, messageText, mediaUrl);
    }

    // Log to AuditLog if tenantId provided
    if (tenantId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            action: 'OUTBOUND_MESSAGE_DISPATCHED',
            entityType: 'Notification',
            entityId: result.messageId,
            metadata: {
              channel,
              recipient: recipientPhone,
              status: result.status,
              success: result.success,
              metadata: metadata || {},
            },
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to log audit entry for message ${result.messageId}: ${err.message}`);
      }
    }

    return result;
  }
}
