import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AnalyticsCopilotService } from './services/analytics-copilot.service';
import { GetSalesReportDto } from './dto/get-sales-report.dto';
import { GetOrgOverviewDto } from './dto/get-org-overview.dto';
import { CopilotQueryDto } from './dto/copilot-query.dto';
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
}
