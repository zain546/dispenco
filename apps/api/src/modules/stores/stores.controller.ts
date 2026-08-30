import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@dispenco/types';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStoreDto
  ) {
    return this.storesService.createStore(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.storesService.findAllStores(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.storesService.findOneStore(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto
  ) {
    return this.storesService.updateStore(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.storesService.softDeleteStore(user.tenantId, id);
  }
}
