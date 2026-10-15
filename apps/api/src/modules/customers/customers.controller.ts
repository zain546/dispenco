import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { CustomerQueryDto } from './dtos/customer-query.dto';
import { RecordKhataPaymentDto } from './dtos/record-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions(Permission.CUSTOMERS_READ)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customersService.findAll(tenantId, query);
  }

  @Get('search')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  search(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') q?: string,
  ) {
    return this.customersService.search(tenantId, q);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(tenantId, id);
  }

  @Get(':id/ledger')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  getLedger(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.getLedger(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(tenantId, id);
  }

  @Post(':id/payments')
  @RequirePermissions(Permission.CUSTOMERS_MANAGE)
  recordKhataPayment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') customerId: string,
    @Body() dto: RecordKhataPaymentDto,
  ) {
    return this.customersService.recordKhataPayment(tenantId, customerId, userId, dto);
  }
}
