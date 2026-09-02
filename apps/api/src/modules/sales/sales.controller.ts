import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dtos/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * POST /api/v1/sales
   * Step 1.15 — Create a POS Sale transactionally (deducts stock FEFO, calculates tax/discounts, creates receipt)
   */
  @Post()
  async createSale(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.createSale(tenantId, userId, dto);
  }

  /**
   * GET /api/v1/sales/recent
   * Get recent sales for the pharmacy tenant
   */
  @Get('recent')
  async getRecentSales(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.getRecentSales(tenantId, limit ? Number(limit) : 20);
  }

  /**
   * GET /api/v1/sales/:id
   * Get single sale details with receipt items
   */
  @Get(':id')
  async getSaleById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') saleId: string,
  ) {
    return this.salesService.getSaleById(tenantId, saleId);
  }
}
