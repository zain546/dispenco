import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_SCHEDULER, QUEUE_NOTIFICATIONS } from './jobs.constants';
import { SchedulerProcessor } from './processors/scheduler.processor';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_SCHEDULER,
    }),
    BullModule.registerQueue({
      name: QUEUE_NOTIFICATIONS,
    }),
  ],
  providers: [SchedulerProcessor, JobsService],
  exports: [BullModule, JobsService],
})
export class JobsModule {}
