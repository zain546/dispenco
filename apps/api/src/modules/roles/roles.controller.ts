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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * GET /api/v1/roles/permissions
   * List all system permissions and module categories
   */
  @Get('permissions')
  getPermissions() {
    return this.rolesService.getAvailablePermissions();
  }

  /**
   * GET /api/v1/roles
   * List all roles for authenticated tenant
   */
  @Get()
  async getRoles(@CurrentUser('tenantId') tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  /**
   * GET /api/v1/roles/:id
   * Get role details with permissions
   */
  @Get(':id')
  async getRole(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') roleId: string
  ) {
    return this.rolesService.findOne(tenantId, roleId);
  }

  /**
   * POST /api/v1/roles
   * Create a new custom role with permissions
   */
  @Post()
  @RequirePermissions(Permission.ROLES_MANAGE)
  async createRole(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateRoleDto
  ) {
    return this.rolesService.createRole(tenantId, dto);
  }

  /**
   * PATCH /api/v1/roles/:id
   * Update role name or permissions
   */
  @Patch(':id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  async updateRole(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto
  ) {
    return this.rolesService.updateRole(tenantId, roleId, dto);
  }

  /**
   * DELETE /api/v1/roles/:id
   * Delete a custom role
   */
  @Delete(':id')
  @RequirePermissions(Permission.ROLES_MANAGE)
  async deleteRole(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') roleId: string
  ) {
    return this.rolesService.deleteRole(tenantId, roleId);
  }
}
