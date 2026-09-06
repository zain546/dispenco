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
import * as Papa from 'papaparse';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new product and optional initial stock batch in a single flow
   */
  async createProduct(tenantId: string, dto: CreateProductDto) {
    const cleanBarcode = dto.barcode?.trim() || null;
    if (cleanBarcode) {
      const existingWithBarcode = await this.prisma.product.findFirst({
        where: { tenantId, barcode: cleanBarcode },
      });
      if (existingWithBarcode) {
        throw new BadRequestException(
          `A product with barcode "${cleanBarcode}" already exists in your inventory ("${existingWithBarcode.name}")`
        );
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
          barcode: cleanBarcode,
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

    // If stock status filter is provided, fetch all matching products to apply computed stock filters
    const isFilteredByStatus = !!query.stockStatus && query.stockStatus !== 'ALL';

    const [totalRaw, rawProducts] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        ...(isFilteredByStatus ? {} : { skip, take: limit }),
        orderBy: { createdAt: 'desc' },
        include: {
          batches: {
            orderBy: { expiryDate: 'asc' },
          },
        },
      }),
    ]);

    const now = new Date();
    const hundredEightyDaysFromNow = new Date();
    hundredEightyDaysFromNow.setDate(now.getDate() + 180);

    const allMapped = rawProducts.map((product) => {
      const activeStockBatches = product.batches.filter((b) => b.quantityRemaining > 0);
      const totalStock = product.batches.reduce(
        (sum, batch) => sum + batch.quantityRemaining,
        0
      );
      const isLowStock = totalStock <= product.lowStockThreshold;
      const latestBatch = activeStockBatches[0] || product.batches[0] || null;

      const batchCount = product.batches.length;
      const expiredBatchCount = product.batches.filter((b) => new Date(b.expiryDate) <= now).length;
      const nearExpiryBatchCount = product.batches.filter((b) => {
        const exp = new Date(b.expiryDate);
        return exp > now && exp <= hundredEightyDaysFromNow;
      }).length;

      return {
        ...product,
        totalStock,
        isLowStock,
        batchCount,
        expiredBatchCount,
        nearExpiryBatchCount,
        latestCostPrice: latestBatch ? Number(latestBatch.costPrice) : null,
        latestSellPrice: latestBatch ? Number(latestBatch.sellPrice) : null,
        nearestExpiryDate: latestBatch ? latestBatch.expiryDate : null,
      };
    });

    let filteredItems = allMapped;
    if (isFilteredByStatus && query.stockStatus) {
      const status = query.stockStatus.toUpperCase();
      if (status === 'LOW') {
        filteredItems = allMapped.filter((p) => p.totalStock > 0 && p.totalStock <= p.lowStockThreshold);
      } else if (status === 'OUT') {
        filteredItems = allMapped.filter((p) => p.totalStock === 0);
      } else if (status === 'EXPIRED') {
        filteredItems = allMapped.filter((p) => p.expiredBatchCount > 0);
      } else if (status === 'NEAR_EXPIRY') {
        filteredItems = allMapped.filter((p) => p.nearExpiryBatchCount > 0);
      }
    }

    const total = isFilteredByStatus ? filteredItems.length : totalRaw;
    const paginatedItems = isFilteredByStatus
      ? filteredItems.slice(skip, skip + limit)
      : filteredItems;

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: paginatedItems,
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

    const cleanBarcode = dto.barcode !== undefined ? (dto.barcode?.trim() || null) : undefined;
    if (cleanBarcode && cleanBarcode !== existingProduct.barcode) {
      const existingWithBarcode = await this.prisma.product.findFirst({
        where: { tenantId, barcode: cleanBarcode, id: { not: id } },
      });
      if (existingWithBarcode) {
        throw new BadRequestException(
          `A product with barcode "${cleanBarcode}" already exists in your inventory ("${existingWithBarcode.name}")`
        );
      }
    }

    const existingAttrs = (existingProduct.attributes as Record<string, unknown>) || {};
    const mergedAttributes: Record<string, unknown> = {
      ...existingAttrs,
      ...((dto.attributes as Record<string, unknown>) || {}),
      ...(dto.isPriority !== undefined ? { isPriority: dto.isPriority } : {}),
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
        ...(dto.barcode !== undefined ? { barcode: cleanBarcode } : {}),
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
   * Lookup product and active FEFO-ordered batches by barcode
   */
  async lookupByBarcode(tenantId: string, barcode: string) {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      throw new BadRequestException('Barcode parameter is required');
    }

    const product = await this.prisma.product.findFirst({
      where: { tenantId, barcode: cleanBarcode },
      include: {
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`No product found with barcode "${cleanBarcode}"`);
    }

    const now = new Date();
    const formattedBatches = product.batches.map((batch) => {
      const expiry = new Date(batch.expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate.toISOString(),
        costPrice: Number(batch.costPrice),
        sellPrice: Number(batch.sellPrice),
        quantityReceived: batch.quantityReceived,
        quantityRemaining: batch.quantityRemaining,
        daysUntilExpiry,
        isExpired: daysUntilExpiry <= 0,
        isNearExpiry: daysUntilExpiry > 0 && daysUntilExpiry <= 180,
        createdAt: batch.createdAt.toISOString(),
      };
    });

    const totalStock = formattedBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    const isLowStock = totalStock <= product.lowStockThreshold;
    const latestBatch = formattedBatches[0] || null;

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        genericName: product.genericName,
        category: product.category,
        unit: product.unit,
        barcode: product.barcode,
        images: product.images,
        taxCode: product.taxCode,
        isControlledSubstance: product.isControlledSubstance,
        isActive: product.isActive,
        lowStockThreshold: product.lowStockThreshold,
        attributes: product.attributes,
        totalStock,
        isLowStock,
        latestCostPrice: latestBatch ? latestBatch.costPrice : null,
        latestSellPrice: latestBatch ? latestBatch.sellPrice : null,
        nearestExpiryDate: latestBatch ? latestBatch.expiryDate : null,
      },
      batches: formattedBatches,
    };
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

  /**
   * Parse CSV content and validate rows for catalog import preview
   */
  async parseCsvImport(
    tenantId: string,
    csvContent: string,
    columnMapping?: Record<string, string>,
  ) {
    if (!csvContent || !csvContent.trim()) {
      throw new BadRequestException('CSV file content is empty');
    }

    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new BadRequestException(`Failed to parse CSV file: ${parsed.errors[0]?.message}`);
    }

    const headers = parsed.meta.fields || [];

    const getFieldValue = (row: Record<string, string>, targetField: string): string => {
      if (columnMapping && columnMapping[targetField]) {
        const mappedHeader = columnMapping[targetField];
        if (row[mappedHeader] !== undefined) {
          return row[mappedHeader]?.trim() || '';
        }
      }

      const targetLower = targetField.toLowerCase();
      const matchedKey = Object.keys(row).find((key) => {
        const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (targetLower === 'name') return keyLower.includes('name') || keyLower.includes('title') || keyLower.includes('item') || keyLower.includes('medicine');
        if (targetLower === 'unitprice') return keyLower.includes('unitprice') || keyLower.includes('sellprice') || keyLower.includes('mrp') || keyLower.includes('price');
        if (targetLower === 'costprice') return keyLower.includes('costprice') || keyLower.includes('purchaseprice') || keyLower.includes('cost');
        if (targetLower === 'category') return keyLower.includes('category') || keyLower.includes('type') || keyLower.includes('group');
        if (targetLower === 'sku') return keyLower === 'sku' || keyLower.includes('code');
        if (targetLower === 'barcode') return keyLower.includes('barcode') || keyLower.includes('upc') || keyLower.includes('ean');
        if (targetLower === 'initialstock') return keyLower.includes('stock') || keyLower.includes('qty') || keyLower.includes('quantity');
        if (targetLower === 'batchnumber') return keyLower.includes('batch') || keyLower.includes('lot');
        if (targetLower === 'expirydate') return keyLower.includes('exp') || keyLower.includes('expiry');
        return keyLower === targetLower;
      });

      return matchedKey ? (row[matchedKey]?.trim() || '') : '';
    };

    const existingProducts = await this.prisma.product.findMany({
      where: { tenantId },
      select: { barcode: true, name: true },
    });
    const existingBarcodes = new Set(
      existingProducts.map((p) => p.barcode).filter(Boolean) as string[],
    );

    const rowsPreview: Array<{
      rowNumber: number;
      status: 'VALID' | 'INVALID';
      data: {
        name: string;
        genericName?: string;
        category: string;
        unit: string;
        unitPrice: number;
        costPrice?: number;
        sku?: string;
        barcode?: string;
        initialStockQuantity?: number;
        batchNumber?: string;
        expiryDate?: string;
        isPriority?: boolean;
      };
      errors: string[];
    }> = [];

    const seenBarcodesInFile = new Set<string>();
    let validCount = 0;
    let invalidCount = 0;

    parsed.data.forEach((row, index) => {
      const rowNumber = index + 1;
      const errors: string[] = [];

      const rawName = getFieldValue(row, 'name');
      const rawCategory = getFieldValue(row, 'category');
      const rawUnitPrice = getFieldValue(row, 'unitprice');
      const rawCostPrice = getFieldValue(row, 'costprice');
      const rawBarcode = getFieldValue(row, 'barcode');
      const rawStock = getFieldValue(row, 'initialstock');
      const rawBatch = getFieldValue(row, 'batchnumber');
      const rawExpiry = getFieldValue(row, 'expirydate');
      const rawUnit = getFieldValue(row, 'unit');

      if (!rawName || rawName.length < 2) {
        errors.push('Product name is required (minimum 2 characters)');
      }

      const unitPrice = Number(rawUnitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push('Unit price must be a valid positive number');
      }

      let costPrice: number | undefined = undefined;
      if (rawCostPrice) {
        const parsedCost = Number(rawCostPrice);
        if (!isNaN(parsedCost) && parsedCost >= 0) {
          costPrice = parsedCost;
        }
      }

      if (rawBarcode) {
        if (existingBarcodes.has(rawBarcode)) {
          errors.push(`Barcode "${rawBarcode}" already exists in database`);
        } else if (seenBarcodesInFile.has(rawBarcode)) {
          errors.push(`Duplicate barcode "${rawBarcode}" found within file`);
        } else {
          seenBarcodesInFile.add(rawBarcode);
        }
      }

      const initialStock = rawStock ? Number(rawStock) : 0;
      if (rawStock && (isNaN(initialStock) || initialStock < 0)) {
        errors.push('Initial stock quantity must be a non-negative number');
      }

      const category = rawCategory
        ? rawCategory.toUpperCase().replace(/\s+/g, '_')
        : 'GENERAL_ITEM';

      const unit = rawUnit || 'PACK';

      const status = errors.length === 0 ? 'VALID' : 'INVALID';
      if (status === 'VALID') validCount++;
      else invalidCount++;

      rowsPreview.push({
        rowNumber,
        status,
        data: {
          name: rawName || `Row ${rowNumber}`,
          category,
          unit,
          unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
          ...(costPrice !== undefined ? { costPrice } : {}),
          ...(rawBarcode ? { barcode: rawBarcode } : {}),
          ...(initialStock > 0 ? { initialStockQuantity: initialStock } : {}),
          ...(rawBatch ? { batchNumber: rawBatch } : {}),
          ...(rawExpiry ? { expiryDate: rawExpiry } : {}),
          isPriority: true,
        },
        errors,
      });
    });

    return {
      success: true,
      summary: {
        totalRows: parsed.data.length,
        validRows: validCount,
        invalidRows: invalidCount,
        headers,
      },
      preview: rowsPreview,
    };
  }

  /**
   * Confirm import of validated products
   */
  async confirmCsvImport(
    tenantId: string,
    productsToImport: Array<{
      name: string;
      genericName?: string;
      category?: string;
      unit?: string;
      unitPrice: number;
      costPrice?: number;
      barcode?: string;
      initialStockQuantity?: number;
      batchNumber?: string;
      expiryDate?: string;
      isPriority?: boolean;
    }>,
  ) {
    if (!productsToImport || productsToImport.length === 0) {
      throw new BadRequestException('No items provided for import confirmation');
    }

    let store = await this.prisma.store.findFirst({
      where: { tenantId },
    });

    if (!store) {
      store = await this.prisma.store.create({
        data: { tenantId, name: 'Main Pharmacy Store' },
      });
    }

    const createdProducts = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of productsToImport) {
        const cleanBarcode = item.barcode?.trim() || null;

        const product = await tx.product.create({
          data: {
            tenantId,
            name: item.name.trim(),
            genericName: item.genericName?.trim() || null,
            category: item.category || 'GENERAL_ITEM',
            unit: item.unit || 'PACK',
            barcode: cleanBarcode,
            isActive: true,
            lowStockThreshold: 10,
            attributes: { isPriority: item.isPriority ?? true },
          },
        });

        if (item.initialStockQuantity && item.initialStockQuantity > 0) {
          const costPrice = item.costPrice ?? item.unitPrice * 0.8;
          const expiry = item.expiryDate
            ? new Date(item.expiryDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          await tx.batch.create({
            data: {
              tenantId,
              storeId: store.id,
              productId: product.id,
              batchNumber:
                item.batchNumber ||
                `IMP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              expiryDate: expiry,
              costPrice: new Prisma.Decimal(costPrice),
              sellPrice: new Prisma.Decimal(item.unitPrice),
              quantityReceived: item.initialStockQuantity,
              quantityRemaining: item.initialStockQuantity,
            },
          });
        }

        results.push(product);
      }

      return results;
    });

    return {
      success: true,
      message: `Successfully imported ${createdProducts.length} products into inventory`,
      importedCount: createdProducts.length,
    };
  }
}
