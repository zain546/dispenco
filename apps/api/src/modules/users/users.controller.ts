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
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * List all staff members for authenticated tenant
   */
  @Get()
  @RequirePermissions(Permission.STAFF_MANAGE)
  async getUsers(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  /**
   * GET /api/v1/users/:id
   * Get single staff member by ID
   */
  @Get(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  async getUser(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') userId: string
  ) {
    return this.usersService.findOne(tenantId, userId);
  }

  /**
   * POST /api/v1/users
   * Invite / register a new staff team member
   */
  @Post()
  @RequirePermissions(Permission.STAFF_MANAGE)
  async createUser(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateUserDto
  ) {
    return this.usersService.createUser(tenantId, dto);
  }

  /**
   * PATCH /api/v1/users/:id
   * Update staff member profile, role, or active status
   */
  @Patch(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  async updateUser(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') currentUserId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.usersService.updateUser(tenantId, userId, currentUserId, dto);
  }

  /**
   * DELETE /api/v1/users/:id
   * Deactivate staff member
   */
  @Delete(':id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  async deleteUser(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') currentUserId: string,
    @Param('id') userId: string
  ) {
    return this.usersService.deleteUser(tenantId, userId, currentUserId);
  }
}
