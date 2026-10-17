import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PublicApiScope } from '@dispenco/types';
import { IntegrationsService } from './integrations.service';
import {
  PublicInventoryQueryDto,
  PublicBatchesQueryDto,
  PublicSalesQueryDto,
  PublicFinancialSummaryQueryDto,
} from './dtos/public-query.dtos';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeyScopeGuard } from './guards/api-key-scope.guard';
import { ApiKeyRateLimitGuard } from './guards/api-key-rate-limit.guard';
import { RequirePublicScope } from './decorators/require-public-scope.decorator';
import { CurrentApiKey, AuthenticatedApiKey } from './decorators/current-api-key.decorator';
import { Request } from 'express';

@Controller('public/v1')
export class PublicApiController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  // ==========================================
  // UNPROTECTED DISCOVERY & DOCS
  // ==========================================

  @Get('docs')
  getDocumentation(@Req() req: Request) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;
    return this.integrationsService.getOpenApiSpec(baseUrl);
  }

  // ==========================================
  // PROTECTED INTEGRATION ENDPOINTS
  // ==========================================

  @Get('ping')
  @UseGuards(ApiKeyAuthGuard, ApiKeyRateLimitGuard)
  async ping(@CurrentApiKey() apiKey: AuthenticatedApiKey) {
    return {
      status: 'authenticated',
      keyName: apiKey.name,
      tenantId: apiKey.tenantId,
      grantedScopes: apiKey.permissions,
      rateLimitPerMinute: apiKey.rateLimit,
      serverTime: new Date().toISOString(),
    };
  }

  @Get('inventory')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.INVENTORY_READ)
  async getInventory(
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Query() query: PublicInventoryQueryDto
  ) {
    return this.integrationsService.getPublicInventory(apiKey.tenantId, query);
  }

  @Get('inventory/batches')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.INVENTORY_READ)
  async getBatches(
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Query() query: PublicBatchesQueryDto
  ) {
    return this.integrationsService.getPublicBatches(apiKey.tenantId, query);
  }

  @Get('sales')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.SALES_READ)
  async getSales(
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Query() query: PublicSalesQueryDto
  ) {
    return this.integrationsService.getPublicSales(apiKey.tenantId, query);
  }

  @Get('sales/ledger')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.SALES_READ)
  async getSalesLedger(
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Query() query: PublicSalesQueryDto
  ) {
    return this.integrationsService.getPublicSalesLedger(apiKey.tenantId, query);
  }

  @Get('reports/summary')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.REPORTS_READ)
  async getFinancialSummary(
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Query() query: PublicFinancialSummaryQueryDto
  ) {
    return this.integrationsService.getPublicFinancialSummary(apiKey.tenantId, query);
  }

  @Get('suppliers')
  @UseGuards(ApiKeyAuthGuard, ApiKeyScopeGuard, ApiKeyRateLimitGuard)
  @RequirePublicScope(PublicApiScope.SUPPLIERS_READ)
  async getSuppliers(@CurrentApiKey() apiKey: AuthenticatedApiKey) {
    return this.integrationsService.getPublicSuppliers(apiKey.tenantId);
  }
}
