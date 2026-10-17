import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsCopilotService } from './services/analytics-copilot.service';
import { AuditExportService } from './services/audit-export.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    AnalyticsCopilotService,
    AuditExportService,
    AnomalyDetectionService,
  ],
  exports: [
    ReportsService,
    AnalyticsCopilotService,
    AuditExportService,
    AnomalyDetectionService,
  ],
})
export class ReportsModule {}
