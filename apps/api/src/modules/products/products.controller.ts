import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { QueryProductsDto } from './dtos/query-products.dto';
import { ParseCsvImportDto, ConfirmCsvImportDto } from './dtos/import-csv.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@dispenco/types';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('import/parse')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  parseCsvImport(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ParseCsvImportDto,
  ) {
    return this.productsService.parseCsvImport(
      tenantId,
      dto.csvContent,
      dto.columnMapping,
    );
  }

  @Post('import/confirm')
  @RequirePermissions(Permission.INVENTORY_CREATE)
  confirmCsvImport(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ConfirmCsvImportDto,
  ) {
    return this.productsService.confirmCsvImport(tenantId, dto.products);
  }

  @Post()
  @RequirePermissions(Permission.INVENTORY_CREATE)
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() createProductDto: CreateProductDto
  ) {
    return this.productsService.createProduct(tenantId, createProductDto);
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_READ)
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: QueryProductsDto
  ) {
    return this.productsService.findAllProducts(tenantId, query);
  }

  @Get('barcode/:barcode')
  @RequirePermissions(Permission.INVENTORY_READ)
  findByBarcode(
    @CurrentUser('tenantId') tenantId: string,
    @Param('barcode') barcode: string
  ) {
    return this.productsService.lookupByBarcode(tenantId, barcode);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_READ)
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.productsService.findOneProduct(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.INVENTORY_UPDATE)
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.updateProduct(tenantId, id, updateProductDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.INVENTORY_DELETE)
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string
  ) {
    return this.productsService.deleteProduct(tenantId, id);
  }
}
