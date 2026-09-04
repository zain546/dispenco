import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetSalesReportDto } from './dto/get-sales-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSalesReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetSalesReportDto,
  ) {
    return this.reportsService.getSalesReport(tenantId, query);
  }
}
