import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { AnalyticsCopilotService } from './services/analytics-copilot.service';
import { AuditExportService } from './services/audit-export.service';
import { GetSalesReportDto } from './dto/get-sales-report.dto';
import { GetOrgOverviewDto } from './dto/get-org-overview.dto';
import { CopilotQueryDto } from './dto/copilot-query.dto';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly copilotService: AnalyticsCopilotService,
    private readonly auditExportService: AuditExportService,
  ) {}

  @Get('sales')
  @RequirePermissions(Permission.REPORTS_READ)
  getSalesReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetSalesReportDto,
  ) {
    return this.reportsService.getSalesReport(tenantId, query);
  }

  @Get('org-overview')
  @RequirePermissions(Permission.REPORTS_READ)
  getOrgOverview(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetOrgOverviewDto,
  ) {
    return this.reportsService.getOrgOverview(tenantId, query);
  }

  /**
   * POST /api/v1/reports/copilot/query
   * Step 4.5 — Natural-Language Analytics Copilot
   */
  @Post('copilot/query')
  @RequirePermissions(Permission.REPORTS_READ)
  processCopilotQuery(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CopilotQueryDto,
  ) {
    return this.copilotService.processQuery(tenantId, dto);
  }

  /**
   * GET /api/v1/reports/audit-logs
   * Step 5.3 — Audit-Log & Compliance Reporting
   */
  @Get('audit-logs')
  @RequirePermissions(Permission.REPORTS_READ)
  getAuditLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetAuditLogsDto,
  ) {
    return this.auditExportService.getAuditLogs(tenantId, query);
  }

  /**
   * GET /api/v1/reports/audit-logs/summary
   */
  @Get('audit-logs/summary')
  @RequirePermissions(Permission.REPORTS_READ)
  getAuditSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetAuditLogsDto,
  ) {
    return this.auditExportService.getAuditSummary(tenantId, query);
  }

  /**
   * GET /api/v1/reports/audit-logs/export/csv
   */
  @Get('audit-logs/export/csv')
  @RequirePermissions(Permission.REPORTS_EXPORT)
  async exportAuditCsv(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetAuditLogsDto,
    @Res() res: Response,
  ) {
    const csvContent = await this.auditExportService.generateAuditCsv(
      tenantId,
      query
    );
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dispenco-audit-report-${dateStr}.csv"`
    );
    return res.send(csvContent);
  }
}
