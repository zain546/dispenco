import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto } from './dtos/receive-stock.dto';
import { UpdateBatchDto } from './dtos/update-batch.dto';
import { AdjustStockDto } from './dtos/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * POST /api/v1/inventory/receive
   * Receive incoming stock shipment batch for an existing medicine
   */
  @Post('receive')
  async receiveStock(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ReceiveStockDto,
  ) {
    return this.inventoryService.receiveStock(tenantId, dto);
  }

  /**
   * GET /api/v1/inventory/barcode/:barcode
   * Step 1.13 — Lookup product and active FEFO-ordered batches by barcode
   */
  @Get('barcode/:barcode')
  async lookupByBarcode(
    @CurrentUser('tenantId') tenantId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.inventoryService.lookupByBarcode(tenantId, barcode);
  }

  /**
   * GET /api/v1/inventory/products/:productId/batches
   * Get FEFO-ordered batches for a product
   */
  @Get('products/:productId/batches')
  async getProductBatches(
    @CurrentUser('tenantId') tenantId: string,
    @Param('productId') productId: string,
  ) {
    return this.inventoryService.getProductBatches(tenantId, productId);
  }

  /**
   * PATCH /api/v1/inventory/batches/:batchId
   * Update details of a specific batch (batchNumber, expiryDate, prices, quantityRemaining)
   */
  @Patch('batches/:batchId')
  async updateBatch(
    @CurrentUser('tenantId') tenantId: string,
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.inventoryService.updateBatch(tenantId, batchId, dto);
  }

  /**
   * POST /api/v1/inventory/select-fefo-batches
   * Calculate FEFO batch deduction plan for sale checkout
   */
  @Post('select-fefo-batches')
  async selectFefoBatches(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: { productId: string; quantityNeeded: number; storeId?: string; allowExpired?: boolean },
  ) {
    return this.inventoryService.selectBatchesForSale(
      tenantId,
      dto.productId,
      dto.quantityNeeded,
      dto.storeId,
      dto.allowExpired,
    );
  }

  /**
   * POST /api/v1/inventory/batches/:batchId/adjust
   * Step 1.11 — Manual stock adjustment (damage, recount, loss, writeoff)
   * Writes an immutable AuditLog paper trail entry.
   */
  @Post('batches/:batchId/adjust')
  async adjustBatchStock(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('batchId') batchId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustBatchStock(tenantId, userId, batchId, dto);
  }

  /**
   * GET /api/v1/inventory/aggregation
   * GET /api/v1/inventory
   * Step 1.10 — Inventory aggregation per store / product across active batches
   */
  @Get('aggregation')
  async getInventoryAggregation(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('expiringSoonOnly') expiringSoonOnly?: string,
    @Query('expiryAlertDays') expiryAlertDays?: string,
    @Query('lowStockThreshold') lowStockThreshold?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getInventoryAggregation(tenantId, {
      storeId,
      lowStockOnly: lowStockOnly === 'true',
      expiringSoonOnly: expiringSoonOnly === 'true',
      expiryAlertDays: expiryAlertDays ? Number(expiryAlertDays) : undefined,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
      search,
    });
  }

  @Get()
  async getInventoryOverview(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('expiringSoonOnly') expiringSoonOnly?: string,
    @Query('expiryAlertDays') expiryAlertDays?: string,
    @Query('lowStockThreshold') lowStockThreshold?: string,
    @Query('search') search?: string,
  ) {
    return this.getInventoryAggregation(
      tenantId,
      storeId,
      lowStockOnly,
      expiringSoonOnly,
      expiryAlertDays,
      lowStockThreshold,
      search,
    );
  }
}



