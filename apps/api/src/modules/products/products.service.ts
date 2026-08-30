import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { QueryProductsDto } from './dtos/query-products.dto';
import { validateProductAttributes } from '@dispenco/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new product scoped to a tenant
   */
  async createProduct(tenantId: string, dto: CreateProductDto) {
    if (dto.attributes) {
      const validation = validateProductAttributes(dto.category, dto.attributes);
      if (!validation.success) {
        throw new BadRequestException({
          message: 'Invalid product category attributes',
          errors: validation.error.format(),
        });
      }
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        genericName: dto.genericName?.trim() || null,
        category: dto.category.trim(),
        unit: dto.unit.trim(),
        barcode: dto.barcode?.trim() || null,
        images: dto.images || [],
        taxCode: dto.taxCode?.trim() || null,
        isControlledSubstance: dto.isControlledSubstance ?? false,
        isActive: dto.isActive ?? true,
        lowStockThreshold: dto.lowStockThreshold ?? 10,
        attributes: (dto.attributes as Prisma.InputJsonValue) || {},
      },
    });

    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  /**
   * List products for a tenant with search, filtering, and pagination
   */
  async findAllProducts(tenantId: string, query: QueryProductsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.isControlledSubstance !== undefined) {
      where.isControlledSubstance = query.isControlledSubstance;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim() !== '') {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { genericName: { contains: searchTerm, mode: 'insensitive' } },
        { barcode: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Find a single product by ID
   */
  async findOneProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return {
      success: true,
      data: product,
    };
  }

  /**
   * Update an existing product
   */
  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOneProduct(tenantId, id);

    const categoryToValidate = dto.category || existing.data.category;

    if (dto.attributes && categoryToValidate) {
      const validation = validateProductAttributes(categoryToValidate, dto.attributes);
      if (!validation.success) {
        throw new BadRequestException({
          message: 'Invalid product category attributes',
          errors: validation.error.format(),
        });
      }
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.genericName !== undefined && { genericName: dto.genericName ? dto.genericName.trim() : null }),
      ...(dto.category !== undefined && { category: dto.category.trim() }),
      ...(dto.unit !== undefined && { unit: dto.unit.trim() }),
      ...(dto.barcode !== undefined && { barcode: dto.barcode ? dto.barcode.trim() : null }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.taxCode !== undefined && { taxCode: dto.taxCode ? dto.taxCode.trim() : null }),
      ...(dto.isControlledSubstance !== undefined && { isControlledSubstance: dto.isControlledSubstance }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.lowStockThreshold !== undefined && { lowStockThreshold: dto.lowStockThreshold }),
      ...(dto.attributes !== undefined && { attributes: dto.attributes as Prisma.InputJsonValue }),
    };

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    };
  }

  /**
   * Soft-delete or archive a product by setting isActive to false
   */
  async deleteProduct(tenantId: string, id: string) {
    await this.findOneProduct(tenantId, id);

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Product archived successfully',
      data: updatedProduct,
    };
  }
}
