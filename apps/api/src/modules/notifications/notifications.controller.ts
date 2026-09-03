import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JobsService } from '../jobs/jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async triggerLowStockScan() {
    const job = await this.jobsService.triggerLowStockScan();
    return {
      success: true,
      message: 'Low stock scan job enqueued',
      jobId: job.id,
    };
  }

  @Post('scan-expiry')
  async triggerExpiryScan() {
    const job = await this.jobsService.triggerExpiryScan();
    return {
      success: true,
      message: 'Expiry scan job enqueued',
      jobId: job.id,
    };
  }
}
