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
import { VoidSaleDto } from './dtos/void-sale.dto';
import { CreateReturnDto } from './dtos/create-return.dto';
import { QueryReturnsDto } from './dtos/query-returns.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * POST /api/v1/sales
   * Step 1.15 — Create a POS Sale transactionally (deducts stock FEFO, calculates tax/discounts, creates receipt)
   */
  @Post()
  @RequirePermissions(Permission.SALES_CREATE)
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
  @RequirePermissions(Permission.SALES_READ)
  async getRecentSales(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.salesService.getRecentSales(tenantId, limit ? Number(limit) : 20, storeId);
  }

  /**
   * POST /api/v1/sales/returns
   * Step 3.8 — Process sales return transactionally
   */
  @Post('returns')
  @RequirePermissions(Permission.SALES_CREATE)
  async createReturn(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.salesService.createReturn(tenantId, userId, dto);
  }

  /**
   * GET /api/v1/sales/returns
   * Query return transactions
   */
  @Get('returns')
  @RequirePermissions(Permission.SALES_READ)
  async getReturns(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryReturnsDto,
  ) {
    return this.salesService.getReturns(tenantId, query);
  }

  /**
   * GET /api/v1/sales/returns/:id
   * Get single return details
   */
  @Get('returns/:id')
  @RequirePermissions(Permission.SALES_READ)
  async getReturnById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') returnId: string,
  ) {
    return this.salesService.getReturnById(tenantId, returnId);
  }

  /**
   * GET /api/v1/sales/:id
   * Get single sale details with receipt items
   */
  @Get(':id')
  @RequirePermissions(Permission.SALES_READ)
  async getSaleById(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') saleId: string,
  ) {
    return this.salesService.getSaleById(tenantId, saleId);
  }

  /**
   * POST /api/v1/sales/:id/void
   * Step 1.19 — Void/cancel a sale, restore batch stock, and write audit log
   */
  @Post(':id/void')
  @RequirePermissions(Permission.SALES_VOID)
  async voidSale(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') saleId: string,
    @Body() dto: VoidSaleDto,
  ) {
    return this.salesService.voidSale(tenantId, userId, saleId, dto?.reason);
  }

  /**
   * POST /api/v1/sales/:id/send-digital-invoice
   * Step 3.13 — Send invoice to customer via WhatsApp/SMS
   */
  @Post(':id/send-digital-invoice')
  @RequirePermissions(Permission.SALES_READ)
  async sendDigitalInvoice(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') saleId: string,
    @Body('phone') phone?: string,
  ) {
    return this.salesService.sendDigitalInvoice(tenantId, userId, saleId, phone);
  }
}
