import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@dispenco/types';
import { NotificationsService } from './notifications.service';
import { JobsService } from '../jobs/jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAllForUser(
      tenantId,
      userId,
      unreadOnly === 'true',
    );
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, userId, id);
  }

  @Patch('read-all')
  markAllAsRead(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Post('scan-low-stock')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.INVENTORY_READ)
  async triggerLowStockScan(@CurrentUser('tenantId') tenantId: string) {
    const job = await this.jobsService.triggerLowStockScan(tenantId);
    return {
      success: true,
      message: 'Low stock scan job enqueued',
      jobId: job.id,
    };
  }

  @Post('scan-expiry')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.INVENTORY_READ)
  async triggerExpiryScan(@CurrentUser('tenantId') tenantId: string) {
    const job = await this.jobsService.triggerExpiryScan(tenantId);
    return {
      success: true,
      message: 'Expiry scan job enqueued',
      jobId: job.id,
    };
  }
}
