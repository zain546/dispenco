import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_SCHEDULER, QUEUE_NOTIFICATIONS } from './jobs.constants';

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUE_SCHEDULER) private readonly schedulerQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATIONS) private readonly notificationsQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('Enqueuing verification no-op job on scheduler queue...');
      const job = await this.schedulerQueue.add(
        'noop',
        { test: true },
        { removeOnComplete: true, attempts: 1 },
      );
      this.logger.log(`No-op test job enqueued successfully with ID: ${job.id}`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue no-op test job: ${err.message}`);
    }
  }

  async enqueueSchedulerJob(name: string, data: any, opts?: any) {
    return this.schedulerQueue.add(name, data, opts);
  }

  async enqueueNotificationJob(name: string, data: any, opts?: any) {
    return this.notificationsQueue.add(name, data, opts);
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.schedulerQueue.getJobCounts();
      return true;
    } catch (err) {
      this.logger.error(`BullMQ Redis healthcheck error: ${err}`);
      return false;
    }
  }
}
