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
   * Create a new product and optional initial stock batch in a single flow
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

    const mergedAttributes: Record<string, unknown> = {
      ...((dto.attributes as Record<string, unknown>) || {}),
      ...(dto.rackNumber ? { rackNumber: dto.rackNumber.trim() } : {}),
      ...(dto.vendorName ? { vendorName: dto.vendorName.trim() } : {}),
      ...(dto.mfgDate ? { mfgDate: dto.mfgDate.trim() } : {}),
      ...(dto.purchaseInvoiceNumber ? { purchaseInvoiceNumber: dto.purchaseInvoiceNumber.trim() } : {}),
      ...(dto.purchaseInvoiceDate ? { purchaseInvoiceDate: dto.purchaseInvoiceDate.trim() } : {}),
    };

    const product = await this.prisma.$transaction(async (tx) => {
      // 1. Create product catalog entry
      const createdProduct = await tx.product.create({
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
          attributes: mergedAttributes as Prisma.InputJsonValue,
        },
      });

      // 2. If initial stock quantity, prices, or expiry are provided, create initial Batch
      const hasInitialStock =
        (dto.initialStockQuantity !== undefined && dto.initialStockQuantity > 0) ||
        dto.expiryDate ||
        dto.costPrice !== undefined ||
        dto.sellPrice !== undefined;

      if (hasInitialStock) {
        // Find or create default store for this tenant
        let store = await tx.store.findFirst({
          where: { tenantId },
        });

        if (!store) {
          store = await tx.store.create({
            data: {
              tenantId,
              name: 'Main Store',
            },
          });
        }

        const batchNo =
          dto.batchNumber && dto.batchNumber.trim() !== ''
            ? dto.batchNumber.trim()
            : `B-${Math.floor(100000 + Math.random() * 900000)}`;

        const expiry = dto.expiryDate
          ? new Date(dto.expiryDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // default 1 yr

        await tx.batch.create({
          data: {
            tenantId,
            storeId: store.id,
            productId: createdProduct.id,
            batchNumber: batchNo,
            expiryDate: expiry,
            costPrice: new Prisma.Decimal(dto.costPrice || 0),
            sellPrice: new Prisma.Decimal(dto.sellPrice || 0),
            quantityReceived: dto.initialStockQuantity || 0,
            quantityRemaining: dto.initialStockQuantity || 0,
          },
        });
      }

      return createdProduct;
    });

    return {
      success: true,
      message: 'Product catalog & initial stock entry created successfully',
      data: product,
    };
  }

  /**
   * List products for a tenant with search, filtering, pagination, and stock aggregates
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
        include: {
          batches: {
            select: {
              quantityRemaining: true,
              costPrice: true,
              sellPrice: true,
              expiryDate: true,
              batchNumber: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Map products to include computed total stock quantity and latest selling price
    const mappedProducts = products.map((prod) => {
      const totalStock = prod.batches.reduce(
        (sum, b) => sum + b.quantityRemaining,
        0,
      );
      const latestBatch = prod.batches[0];
      return {
        ...prod,
        totalStock,
        latestSellPrice: latestBatch ? Number(latestBatch.sellPrice) : null,
        latestCostPrice: latestBatch ? Number(latestBatch.costPrice) : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: mappedProducts,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Find a single product by ID including batches
   */
  async findOneProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const totalStock = product.batches.reduce(
      (sum, b) => sum + b.quantityRemaining,
      0,
    );

    return {
      success: true,
      data: {
        ...product,
        totalStock,
      },
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
