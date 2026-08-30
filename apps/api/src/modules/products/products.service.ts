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
    const mergedAttributes: Record<string, unknown> = {
      ...((dto.attributes as Record<string, unknown>) || {}),
      ...(dto.rackNumber ? { rackNumber: dto.rackNumber.trim() } : {}),
      ...(dto.vendorName ? { vendorName: dto.vendorName.trim() } : {}),
      ...(dto.mfgDate ? { mfgDate: dto.mfgDate.trim() } : {}),
      ...(dto.purchaseInvoiceNumber ? { purchaseInvoiceNumber: dto.purchaseInvoiceNumber.trim() } : {}),
      ...(dto.purchaseInvoiceDate ? { purchaseInvoiceDate: dto.purchaseInvoiceDate.trim() } : {}),
    };

    if (Object.keys(mergedAttributes).length > 0) {
      const validation = validateProductAttributes(dto.category, mergedAttributes);
      if (!validation.success) {
        console.error('Category Attributes Validation Error:', JSON.stringify(validation.error.flatten()));
        throw new BadRequestException({
          message: 'Invalid product category attributes',
          errors: validation.error.flatten(),
        });
      }
    }

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
          attributes: (mergedAttributes as Prisma.InputJsonValue) || {},
        },
      });

      // 2. If initial stock & batch info are provided, create the initial Batch
      if (
        dto.initialStockQuantity !== undefined &&
        dto.initialStockQuantity > 0 &&
        dto.costPrice !== undefined &&
        dto.sellPrice !== undefined &&
        dto.expiryDate
      ) {
        // Find or fallback to primary store for tenant
        let store = await tx.store.findFirst({
          where: { tenantId },
        });

        if (!store) {
          store = await tx.store.create({
            data: {
              tenantId,
              name: 'Main Pharmacy Store',
            },
          });
        }

        const generatedBatchNumber =
          dto.batchNumber?.trim() ||
          `BN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        await tx.batch.create({
          data: {
            tenantId,
            storeId: store.id,
            productId: createdProduct.id,
            batchNumber: generatedBatchNumber,
            expiryDate: new Date(dto.expiryDate),
            costPrice: new Prisma.Decimal(dto.costPrice),
            sellPrice: new Prisma.Decimal(dto.sellPrice),
            quantityReceived: dto.initialStockQuantity,
            quantityRemaining: dto.initialStockQuantity,
          },
        });
      }

      return createdProduct;
    });

    return this.getProductById(tenantId, product.id);
  }

  /**
   * Query products with pagination, search, category filter, and low stock status
   */
  async getProducts(tenantId: string, query: QueryProductsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { genericName: { contains: query.search, mode: 'insensitive' } },
              { barcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          batches: {
            where: { quantityRemaining: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          },
        },
      }),
    ]);

    const items = products.map((product) => {
      const totalStock = product.batches.reduce(
        (sum, batch) => sum + batch.quantityRemaining,
        0
      );
      const isLowStock = totalStock <= product.lowStockThreshold;
      const latestBatch = product.batches[0] || null;

      return {
        ...product,
        totalStock,
        isLowStock,
        latestCostPrice: latestBatch ? Number(latestBatch.costPrice) : null,
        latestSellPrice: latestBatch ? Number(latestBatch.sellPrice) : null,
        nearestExpiryDate: latestBatch ? latestBatch.expiryDate : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Alias for getProducts
   */
  async findAllProducts(tenantId: string, query: QueryProductsDto) {
    return this.getProducts(tenantId, query);
  }

  /**
   * Get a single product by ID with stock batches
   */
  async getProductById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const totalStock = product.batches.reduce(
      (sum, batch) => sum + batch.quantityRemaining,
      0
    );
    const isLowStock = totalStock <= product.lowStockThreshold;
    const latestBatch = product.batches.find((b) => b.quantityRemaining > 0) || product.batches[0] || null;

    return {
      ...product,
      totalStock,
      isLowStock,
      latestCostPrice: latestBatch ? Number(latestBatch.costPrice) : null,
      latestSellPrice: latestBatch ? Number(latestBatch.sellPrice) : null,
      nearestExpiryDate: latestBatch ? latestBatch.expiryDate : null,
    };
  }

  /**
   * Alias for getProductById
   */
  async findOneProduct(tenantId: string, id: string) {
    return this.getProductById(tenantId, id);
  }

  /**
   * Update catalog product details
   */
  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const existingProduct = await this.getProductById(tenantId, id);

    const existingAttrs = (existingProduct.attributes as Record<string, unknown>) || {};
    const mergedAttributes: Record<string, unknown> = {
      ...existingAttrs,
      ...((dto.attributes as Record<string, unknown>) || {}),
      ...(dto.rackNumber !== undefined ? { rackNumber: dto.rackNumber?.trim() || null } : {}),
      ...(dto.vendorName !== undefined ? { vendorName: dto.vendorName?.trim() || null } : {}),
      ...(dto.mfgDate !== undefined ? { mfgDate: dto.mfgDate?.trim() || null } : {}),
      ...(dto.purchaseInvoiceNumber !== undefined ? { purchaseInvoiceNumber: dto.purchaseInvoiceNumber?.trim() || null } : {}),
      ...(dto.purchaseInvoiceDate !== undefined ? { purchaseInvoiceDate: dto.purchaseInvoiceDate?.trim() || null } : {}),
    };

    const category = dto.category?.trim() || existingProduct.category || 'GENERAL_ITEM';
    const validation = validateProductAttributes(category, mergedAttributes);

    if (!validation.success) {
      throw new BadRequestException({
        message: 'Invalid product category attributes',
        errors: validation.error.flatten(),
      });
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.genericName !== undefined ? { genericName: dto.genericName?.trim() || null } : {}),
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.unit ? { unit: dto.unit.trim() } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode?.trim() || null } : {}),
        ...(dto.images ? { images: dto.images } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode?.trim() || null } : {}),
        ...(dto.isControlledSubstance !== undefined ? { isControlledSubstance: dto.isControlledSubstance } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.lowStockThreshold !== undefined ? { lowStockThreshold: dto.lowStockThreshold } : {}),
        attributes: (mergedAttributes as Prisma.InputJsonValue) || {},
      },
    });

    return this.getProductById(tenantId, updatedProduct.id);
  }

  /**
   * Soft delete / deactivate a product
   */
  async deleteProduct(tenantId: string, id: string) {
    await this.getProductById(tenantId, id);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Product deactivated successfully',
    };
  }
}
