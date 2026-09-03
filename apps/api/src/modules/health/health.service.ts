import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
  redis: {
    status: 'connected' | 'disconnected';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let isDbConnected = false;
    let latencyMs = 0;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      isDbConnected = true;
      latencyMs = Date.now() - startTime;
    } catch {
      isDbConnected = false;
    }

    const isRedisConnected = await this.jobsService.isHealthy();

    const result: HealthCheckResult = {
      status: isDbConnected && isRedisConnected ? 'ok' : 'degraded',
      service: 'dispenco-api',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        ...(isDbConnected && { latencyMs }),
      },
      redis: {
        status: isRedisConnected ? 'connected' : 'disconnected',
      },
    };

    if (!isDbConnected) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
