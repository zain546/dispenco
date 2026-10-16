import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsCopilotService } from './services/analytics-copilot.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, AnalyticsCopilotService],
  exports: [ReportsService, AnalyticsCopilotService],
})
export class ReportsModule {}
