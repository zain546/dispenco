import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TaxRatesService } from './tax-rates.service';
import { CreateTaxRateDto } from './dtos/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dtos/update-tax-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@Controller('tax-rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxRatesController {
  constructor(private readonly taxRatesService: TaxRatesService) {}

  @Post()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateTaxRateDto
  ) {
    return this.taxRatesService.create(tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.taxRatesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.taxRatesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaxRateDto
  ) {
    return this.taxRatesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.taxRatesService.remove(tenantId, id);
  }
}
