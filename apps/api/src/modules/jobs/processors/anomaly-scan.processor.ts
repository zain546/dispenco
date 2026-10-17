import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AnomalyDetectionService } from '../../reports/services/anomaly-detection.service';

@Injectable()
export class AnomalyScanProcessor {
  private readonly logger = new Logger(AnomalyScanProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
  ) {}

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'scan-anomalies') {
      return this.handleAnomalyScan();
    }
  }

  private async handleAnomalyScan() {
    this.logger.log(
      'Starting automated operational integrity & discrepancy scan across all tenants...',
    );

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    let totalFlagsCreated = 0;

    for (const tenant of tenants) {
      try {
        const result = await this.anomalyDetectionService.runScan(tenant.id);
        totalFlagsCreated += result.newFlagsCreated;
      } catch (err: any) {
        this.logger.error(
          `Failed scanning anomalies for tenant ${tenant.name} (${tenant.id}): ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Completed anomaly scan across ${tenants.length} tenants. ${totalFlagsCreated} new variance flags created.`,
    );

    return { scannedTenants: tenants.length, totalFlagsCreated };
  }
}
