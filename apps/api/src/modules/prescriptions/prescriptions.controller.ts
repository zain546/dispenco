import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionOcrService } from './services/prescription-ocr.service';
import { CreatePrescriptionDto } from './dtos/create-prescription.dto';
import {
  UpdatePrescriptionDto,
  DispensePrescriptionDto,
} from './dtos/update-prescription.dto';
import { ScanPrescriptionOcrDto } from './dtos/scan-prescription-ocr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';
import { PrescriptionStatus } from '@prisma/client';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly prescriptionOcrService: PrescriptionOcrService,
  ) {}

  /**
   * POST /api/v1/prescriptions
   * Create a confirmed prescription record
   */
  @Post()
  @RequirePermissions(Permission.SALES_CREATE)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(tenantId, dto);
  }

  /**
   * POST /api/v1/prescriptions/ocr-scan
   * OCR assist for doctor's prescription slip / image
   */
  @Post('ocr-scan')
  @RequirePermissions(Permission.SALES_CREATE)
  scanOcr(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ScanPrescriptionOcrDto,
  ) {
    return this.prescriptionOcrService.scanPrescription(tenantId, dto);
  }

  /**
   * GET /api/v1/prescriptions
   * List prescriptions with filters
   */
  @Get()
  @RequirePermissions(Permission.SALES_READ)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('status') status?: PrescriptionStatus,
    @Query('search') search?: string,
    @Query('isControlledOnly') isControlledOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prescriptionsService.findAll(tenantId, {
      storeId,
      status,
      search,
      isControlledOnly: isControlledOnly === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * GET /api/v1/prescriptions/:id
   * Single prescription details with linked sale
   */
  @Get(':id')
  @RequirePermissions(Permission.SALES_READ)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.findOne(tenantId, id);
  }

  /**
   * PATCH /api/v1/prescriptions/:id
   * Update prescription details
   */
  @Patch(':id')
  @RequirePermissions(Permission.SALES_CREATE)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.update(tenantId, id, dto);
  }

  /**
   * POST /api/v1/prescriptions/:id/dispense
   * Dispense medicines against prescription and optionally link to a sale
   */
  @Post(':id/dispense')
  @RequirePermissions(Permission.SALES_CREATE)
  dispense(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: DispensePrescriptionDto,
  ) {
    return this.prescriptionsService.dispense(tenantId, id, dto);
  }
}
