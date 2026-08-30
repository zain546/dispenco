import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto } from './dtos/receive-stock.dto';
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
}
