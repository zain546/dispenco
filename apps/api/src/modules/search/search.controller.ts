import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/v1/search/health
   * Check search engine health status
   */
  @Get('health')
  @RequirePermissions(Permission.INVENTORY_READ)
  getHealth() {
    return {
      status: 'ok',
      engine: 'meilisearch',
      available: this.searchService.isEngineAvailable,
    };
  }

  /**
   * POST /api/v1/search/sync
   * Re-sync catalog products into Meilisearch index
   */
  @Post('sync')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  async syncCatalog(@CurrentUser('tenantId') tenantId: string) {
    return this.searchService.syncAllProducts(tenantId);
  }

  /**
   * GET /api/v1/search/products
   * Smart typo-tolerant and synonym fuzzy search
   */
  @Get('products')
  @RequirePermissions(Permission.INVENTORY_READ)
  async searchProducts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchProductIds(tenantId, query || '', {
      category,
      limit: limit ? Number(limit) : 50,
    });
  }
}
