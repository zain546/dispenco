import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetSalesReportDto } from './dto/get-sales-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions(Permission.REPORTS_READ)
  getSalesReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetSalesReportDto,
  ) {
    return this.reportsService.getSalesReport(tenantId, query);
  }
}
