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
 
    // Operational telemetry is logged to processor logger only, preserving Compliance AuditLog for regulatory events
    this.logger.debug(
      `Outbound ${channel} message dispatched for ${recipientPhone}: messageId=${result?.messageId || 'unknown'}, status=${result?.status || 'dispatched'}`
    );

    return result;
  }
}
