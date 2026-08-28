import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

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

    const result: HealthCheckResult = {
      status: isDbConnected ? 'ok' : 'degraded',
      service: 'dispenco-api',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        ...(isDbConnected && { latencyMs }),
      },
    };

    if (!isDbConnected) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
