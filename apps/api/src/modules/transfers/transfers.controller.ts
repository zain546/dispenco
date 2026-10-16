import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dtos/create-transfer.dto';
import { DispatchTransferDto } from './dtos/dispatch-transfer.dto';
import { ReceiveTransferDto } from './dtos/receive-transfer.dto';
import { QueryTransfersDto } from './dtos/query-transfers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('request')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  createTransferRequest(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.createTransferRequest(tenantId, userId, dto);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryTransfersDto,
  ) {
    return this.transfersService.findAllTransfers(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.transfersService.findOneTransfer(tenantId, id);
  }

  @Post(':id/dispatch')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  dispatchTransfer(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: DispatchTransferDto,
  ) {
    return this.transfersService.dispatchTransfer(tenantId, userId, id, dto);
  }

  @Post(':id/receive')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  receiveTransfer(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveTransferDto,
  ) {
    return this.transfersService.receiveTransfer(tenantId, userId, id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.INVENTORY_ADJUST)
  cancelTransfer(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.transfersService.cancelTransfer(tenantId, userId, id, reason);
  }
}
