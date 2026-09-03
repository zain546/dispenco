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
      await this.schedulerQueue.add(
        'noop',
        { test: true },
        { removeOnComplete: true, attempts: 1 },
      );

      this.logger.log('Scheduling hourly low-stock scan job...');
      await (this.schedulerQueue.add as any)(
        'scan-low-stock',
        { source: 'scheduled' },
        {
          repeat: {
            pattern: '0 * * * *',
          },
          jobId: 'hourly-low-stock-scan',
          removeOnComplete: 100,
        },
      );
      this.logger.log('Hourly low-stock scan job registered successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to register BullMQ jobs: ${err.message}`);
    }
  }

  async triggerLowStockScan() {
    return this.schedulerQueue.add(
      'scan-low-stock',
      { source: 'manual-trigger', timestamp: new Date().toISOString() },
      { removeOnComplete: true },
    );
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
