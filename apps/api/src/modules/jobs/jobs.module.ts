import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_SCHEDULER, QUEUE_NOTIFICATIONS } from './jobs.constants';
import { SchedulerProcessor } from './processors/scheduler.processor';
import { LowStockScanProcessor } from './processors/low-stock-scan.processor';
import { ExpiryScanProcessor } from './processors/expiry-scan.processor';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    BullModule.registerQueue({
      name: QUEUE_SCHEDULER,
    }),
    BullModule.registerQueue({
      name: QUEUE_NOTIFICATIONS,
    }),
  ],
  providers: [
    SchedulerProcessor,
    LowStockScanProcessor,
    ExpiryScanProcessor,
    JobsService,
  ],
  exports: [BullModule, JobsService],
})
export class JobsModule {}
