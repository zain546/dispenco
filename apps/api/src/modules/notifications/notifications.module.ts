import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MessagingProvider } from './providers/messaging.provider';
import { EmailProvider } from './providers/email.provider';
import { EmailTemplatesService } from './services/email-templates.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, MessagingProvider, EmailProvider, EmailTemplatesService],
  exports: [NotificationsService, MessagingProvider, EmailProvider, EmailTemplatesService],
})
export class NotificationsModule {}
