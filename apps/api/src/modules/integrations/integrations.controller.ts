import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Permission, ALL_PUBLIC_API_SCOPES } from '@dispenco/types';
import { IntegrationsService } from './integrations.service';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Request } from 'express';

@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('api-keys')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async listKeys(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.listApiKeys(user.tenantId);
  }

  @Post('api-keys')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async createKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto
  ) {
    return this.integrationsService.createApiKey(
      user.tenantId,
      user.userId,
      dto
    );
  }

  @Patch('api-keys/:id/toggle')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async toggleKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.integrationsService.toggleApiKey(
      user.tenantId,
      user.userId,
      id
    );
  }

  @Delete('api-keys/:id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async deleteKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string
  ) {
    return this.integrationsService.deleteApiKey(
      user.tenantId,
      user.userId,
      id
    );
  }

  @Get('scopes')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  getScopes() {
    return ALL_PUBLIC_API_SCOPES;
  }

  @Get('spec')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  getSpec(@Req() req: Request) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;
    return this.integrationsService.getOpenApiSpec(baseUrl);
  }
}
