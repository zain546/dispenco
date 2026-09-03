import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dtos/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dtos/receive-purchase-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @RequirePermissions(Permission.PURCHASES_CREATE)
  createOrder(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.createOrder(tenantId, dto);
  }

  @Post(':id/receive')
  @RequirePermissions(Permission.PURCHASES_CREATE)
  receiveOrder(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.purchasesService.receiveOrder(tenantId, id, dto);
  }

  @Get()
  @RequirePermissions(Permission.PURCHASES_READ)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
  ) {
    return this.purchasesService.findAll(tenantId, storeId, status);
  }

  @Get(':id')
  @RequirePermissions(Permission.PURCHASES_READ)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(tenantId, id);
  }
}
