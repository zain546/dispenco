import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MessagingProvider } from './providers/messaging.provider';
import { EmailProvider } from './providers/email.provider';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, MessagingProvider, EmailProvider],
  exports: [NotificationsService, MessagingProvider, EmailProvider],
})
export class NotificationsModule {}
