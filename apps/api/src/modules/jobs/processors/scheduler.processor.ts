import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_SCHEDULER } from '../jobs.constants';

@Processor(QUEUE_SCHEDULER)
export class SchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(SchedulerProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job '${job.name}' (ID: ${job.id})`);

    switch (job.name) {
      case 'noop':
        this.logger.log('No-op verification job executed successfully');
        return { status: 'completed', timestamp: new Date().toISOString() };

      default:
        this.logger.warn(`Unhandled job name '${job.name}' on scheduler queue`);
        return { status: 'unhandled' };
    }
  }
}
