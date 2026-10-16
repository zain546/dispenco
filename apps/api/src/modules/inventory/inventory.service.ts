import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiveStockDto } from './dtos/receive-stock.dto';
import { UpdateBatchDto } from './dtos/update-batch.dto';
import { AdjustStockDto } from './dtos/adjust-stock.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Receive a new stock shipment batch for an existing product
   */
  async receiveStock(tenantId: string, dto: ReceiveStockDto) {
    // 1. Verify Product exists for Tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
    }

    // 2. Locate target Store for Tenant
    let store: { id: string; name: string } | null = null;
    if (dto.storeId) {
      store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${dto.storeId}" not found for this tenant`);
      }
    } else {
      store = await this.prisma.store.findFirst({
        where: { tenantId, isActive: true },
      });
      if (!store) {
        store = await this.prisma.store.create({
          data: {
            tenantId,
            name: 'Main Pharmacy Store',
          },
        });
      }
    }

    // 3. Format/generate batch number
    const generatedBatchNumber =
      dto.batchNumber?.trim() ||
      `BN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const expiryDate = new Date(dto.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      throw new BadRequestException('Invalid expiry date format');
    }

    // 4. Create Batch & update metadata inside transaction
    const newBatch = await this.prisma.$transaction(async (tx) => {
      // Create batch record
      const createdBatch = await tx.batch.create({
        data: {
          tenantId,
          storeId: store.id,
          productId: product.id,
          batchNumber: generatedBatchNumber,
          expiryDate,
          costPrice: new Prisma.Decimal(dto.costPrice),
          sellPrice: new Prisma.Decimal(dto.sellPrice),
          quantityReceived: dto.quantity,
          quantityRemaining: dto.quantity,
        },
      });

      // Optionally update product metadata if rack/vendor info provided
      const existingAttrs = (product.attributes as Record<string, unknown>) || {};
      const updatedAttrs = {
        ...existingAttrs,
        ...(dto.rackNumber?.trim() ? { rackNumber: dto.rackNumber.trim() } : {}),
        ...(dto.vendorName?.trim() ? { vendorName: dto.vendorName.trim() } : {}),
        ...(dto.mfgDate?.trim() ? { mfgDate: dto.mfgDate.trim() } : {}),
        ...(dto.purchaseInvoiceNumber?.trim()
          ? { purchaseInvoiceNumber: dto.purchaseInvoiceNumber.trim() }
          : {}),
        ...(dto.purchaseInvoiceDate?.trim()
          ? { purchaseInvoiceDate: dto.purchaseInvoiceDate.trim() }
          : {}),
      };

      await tx.product.update({
        where: { id: product.id },
        data: {
          attributes: updatedAttrs as Prisma.InputJsonValue,
        },
      });

      return createdBatch;
    });

    // 5. Fetch updated product stock overview
    const allBatches = await this.prisma.batch.findMany({
      where: { productId: product.id, quantityRemaining: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
    });

    const totalStock = allBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);

    return {
      success: true,
      message: `Received ${dto.quantity} units for "${product.name}" under Batch ${newBatch.batchNumber}`,
      batch: {
        id: newBatch.id,
        batchNumber: newBatch.batchNumber,
        quantityReceived: newBatch.quantityReceived,
        quantityRemaining: newBatch.quantityRemaining,
        costPrice: Number(newBatch.costPrice),
        sellPrice: Number(newBatch.sellPrice),
        expiryDate: newBatch.expiryDate.toISOString(),
      },
      product: {
        id: product.id,
        name: product.name,
        totalStock,
      },
    };
  }

  /**
   * Get FEFO-ordered active batches for a product
   */
  async getProductBatches(tenantId: string, productId: string, storeId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${effectiveStoreId}" not found for this tenant`);
      }
    }

    const batches = await this.prisma.batch.findMany({
      where: {
        productId,
        tenantId,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      orderBy: { expiryDate: 'asc' },
    });

    const now = new Date();
    const productAttrs = (product.attributes as Record<string, unknown>) || {};

    const formattedBatches = batches.map((batch) => {
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
        vendorName: (productAttrs.vendorName as string) || null,
        mfgDate: (productAttrs.mfgDate as string) || null,
        purchaseInvoiceNumber: (productAttrs.purchaseInvoiceNumber as string) || null,
        purchaseInvoiceDate: (productAttrs.purchaseInvoiceDate as string) || null,
        rackNumber: (productAttrs.rackNumber as string) || null,
      };
    });

    const totalStock = formattedBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);

    return {
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        totalStock,
      },
      batches: formattedBatches,
    };
  }

  /**
   * Update specific batch details (Batch #, Expiry Date, Price, Quantities, Vendor, Invoice, Rack)
   */
  async updateBatch(tenantId: string, batchId: string, dto: UpdateBatchDto) {
    const existingBatch = await this.prisma.batch.findFirst({
      where: { id: batchId, tenantId },
      include: { product: true },
    });

    if (!existingBatch) {
      throw new NotFoundException(`Stock batch with ID "${batchId}" not found`);
    }

    let expiryDate = existingBatch.expiryDate;
    if (dto.expiryDate) {
      const parsedDate = new Date(dto.expiryDate);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Invalid expiry date format');
      }
      expiryDate = parsedDate;
    }

    const updatedBatch = await this.prisma.batch.update({
      where: { id: batchId },
      data: {
        ...(dto.batchNumber ? { batchNumber: dto.batchNumber.trim() } : {}),
        ...(dto.expiryDate ? { expiryDate } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: new Prisma.Decimal(dto.costPrice) } : {}),
        ...(dto.sellPrice !== undefined ? { sellPrice: new Prisma.Decimal(dto.sellPrice) } : {}),
        ...(dto.quantityRemaining !== undefined
          ? { quantityRemaining: dto.quantityRemaining }
          : {}),
        ...(dto.quantityReceived !== undefined
          ? { quantityReceived: dto.quantityReceived }
          : {}),
      },
    });

    // Update product attributes if procurement / location fields provided
    const existingAttrs = (existingBatch.product.attributes as Record<string, unknown>) || {};
    const updatedAttrs = {
      ...existingAttrs,
      ...(dto.vendorName !== undefined ? { vendorName: dto.vendorName.trim() || null } : {}),
      ...(dto.mfgDate !== undefined ? { mfgDate: dto.mfgDate.trim() || null } : {}),
      ...(dto.purchaseInvoiceNumber !== undefined
        ? { purchaseInvoiceNumber: dto.purchaseInvoiceNumber.trim() || null }
        : {}),
      ...(dto.purchaseInvoiceDate !== undefined
        ? { purchaseInvoiceDate: dto.purchaseInvoiceDate.trim() || null }
        : {}),
      ...(dto.rackNumber !== undefined ? { rackNumber: dto.rackNumber.trim() || null } : {}),
    };

    await this.prisma.product.update({
      where: { id: existingBatch.productId },
      data: {
        attributes: updatedAttrs as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      message: `Batch ${updatedBatch.batchNumber} updated successfully`,
      batch: {
        id: updatedBatch.id,
        batchNumber: updatedBatch.batchNumber,
        expiryDate: updatedBatch.expiryDate.toISOString(),
        costPrice: Number(updatedBatch.costPrice),
        sellPrice: Number(updatedBatch.sellPrice),
        quantityReceived: updatedBatch.quantityReceived,
        quantityRemaining: updatedBatch.quantityRemaining,
        vendorName: (updatedAttrs.vendorName as string) || null,
        mfgDate: (updatedAttrs.mfgDate as string) || null,
        purchaseInvoiceNumber: (updatedAttrs.purchaseInvoiceNumber as string) || null,
        purchaseInvoiceDate: (updatedAttrs.purchaseInvoiceDate as string) || null,
        rackNumber: (updatedAttrs.rackNumber as string) || null,
      },
    };
  }

  /**
   * FEFO Stock Selection Logic: Select batches to deduct from for a sale
   * Always prefers earliest expiring active non-expired stock first.
   * Throws BadRequestException if available stock is insufficient.
   */
  async selectBatchesForSale(
    tenantId: string,
    productId: string,
    quantityNeeded: number,
    storeId?: string,
    allowExpired: boolean = false,
    tx?: Prisma.TransactionClient,
  ) {
    if (!quantityNeeded || quantityNeeded <= 0) {
      throw new BadRequestException('Requested quantity must be greater than zero');
    }

    const db = tx || this.prisma;

    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    let targetStoreId = storeId && storeId !== 'all' ? storeId : undefined;
    if (targetStoreId) {
      const store = await db.store.findFirst({
        where: { id: targetStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${targetStoreId}" not found for this tenant`);
      }
    } else {
      const primaryStore = await db.store.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!primaryStore) {
        throw new NotFoundException('No active store found for this tenant to allocate batches from');
      }
      targetStoreId = primaryStore.id;
    }

    const now = new Date();

    // Query active batches with stock remaining > 0, ordered by expiry date ASC (FEFO)
    const batches = await db.batch.findMany({
      where: {
        tenantId,
        productId,
        storeId: targetStoreId,
        quantityRemaining: { gt: 0 },
        ...(!allowExpired ? { expiryDate: { gt: now } } : {}),
      },
      orderBy: { expiryDate: 'asc' },
    });

    const totalAvailable = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);

    if (totalAvailable < quantityNeeded) {
      throw new BadRequestException(
        `Insufficient available stock for medicine "${product.name}". Requested: ${quantityNeeded} ${product.unit}(s), Available non-expired stock: ${totalAvailable} ${product.unit}(s).`,
      );
    }

    let remainingToDeduct = quantityNeeded;
    const allocations: Array<{
      batchId: string;
      batchNumber: string;
      expiryDate: Date;
      costPrice: number;
      sellPrice: number;
      quantityToDeduct: number;
      quantityRemainingBefore: number;
      quantityRemainingAfter: number;
    }> = [];

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = Math.min(batch.quantityRemaining, remainingToDeduct);
      const remainingAfter = batch.quantityRemaining - deductAmount;

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        costPrice: Number(batch.costPrice),
        sellPrice: Number(batch.sellPrice),
        quantityToDeduct: deductAmount,
        quantityRemainingBefore: batch.quantityRemaining,
        quantityRemainingAfter: remainingAfter,
      });

      remainingToDeduct -= deductAmount;
    }

    return {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      totalQuantityRequested: quantityNeeded,
      totalQuantityAllocated: quantityNeeded - remainingToDeduct,
      allocations,
    };
  }

  /**
   * Step 1.11 — Manual Stock Adjustment
   * Lets staff correct batch stock counts (damage, loss, recount, expired writeoff)
   * Creates an immutable AuditLog entry recording who made the change, when, and why.
   */
  async adjustBatchStock(
    tenantId: string,
    userId: string | undefined,
    batchId: string,
    dto: AdjustStockDto,
  ) {
    const existingBatch = await this.prisma.batch.findFirst({
      where: { id: batchId, tenantId },
      include: { product: true },
    });

    if (!existingBatch) {
      throw new NotFoundException(`Stock batch with ID "${batchId}" not found`);
    }

    const oldQuantity = existingBatch.quantityRemaining;
    const newQuantity = dto.newQuantity;
    const difference = newQuantity - oldQuantity;

    if (difference === 0) {
      return {
        success: true,
        message: 'No stock adjustment needed (quantity unchanged)',
        batch: {
          id: existingBatch.id,
          batchNumber: existingBatch.batchNumber,
          quantityRemaining: existingBatch.quantityRemaining,
        },
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update batch quantity
      const updatedBatch = await tx.batch.update({
        where: { id: batchId },
        data: {
          quantityRemaining: newQuantity,
        },
      });

      // 2. Create AuditLog paper trail entry
      const auditLog = await (tx as any).auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: 'MANUAL_STOCK_ADJUSTMENT',
          entityType: 'Batch',
          entityId: batchId,
          metadata: {
            batchNumber: existingBatch.batchNumber,
            productId: existingBatch.productId,
            productName: existingBatch.product.name,
            unit: existingBatch.product.unit,
            oldQuantity,
            newQuantity,
            difference,
            reason: dto.reason,
            notes: dto.notes?.trim() || null,
            adjustedAt: new Date().toISOString(),
          },
        },
      });

      return { updatedBatch, auditLog };
    });

    return {
      success: true,
      message: `Batch ${result.updatedBatch.batchNumber} stock adjusted from ${oldQuantity} to ${newQuantity} (${difference > 0 ? '+' : ''}${difference} units). Reason: ${dto.reason}`,
      batch: {
        id: result.updatedBatch.id,
        batchNumber: result.updatedBatch.batchNumber,
        oldQuantity,
        newQuantity: result.updatedBatch.quantityRemaining,
        difference,
      },
      auditLogId: result.auditLog.id,
    };
  }

  /**
   * Step 1.10 — Inventory Aggregation & Exception Dashboard Data
   * Computes real-time stock levels per store/product across batches.
   * Supports filtering for lowStockOnly and expiringSoonOnly exceptions.
   */
  async getInventoryAggregation(
    tenantId: string,
    query: {
      storeId?: string;
      inStockOnly?: boolean;
      lowStockOnly?: boolean;
      expiringSoonOnly?: boolean;
      priorityOnly?: boolean;
      unstockedOnly?: boolean;
      expiryAlertDays?: number;
      lowStockThreshold?: number;
      search?: string;
    },
  ) {
    const expiryWindowDays = Number(query.expiryAlertDays) || 180;
    const defaultLowThreshold = Number(query.lowStockThreshold) || 20;

    const effectiveStoreId = query.storeId && query.storeId !== 'all' ? query.storeId : undefined;
    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${effectiveStoreId}" not found for this tenant`);
      }
    }

    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { genericName: { contains: query.search, mode: 'insensitive' } },
                { barcode: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        batches: {
          where: {
            ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
            quantityRemaining: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const cutoffDate = new Date(now.getTime() + expiryWindowDays * 24 * 60 * 60 * 1000);

    const aggregated = products.map((prod) => {
      const totalStock = prod.batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const earliestBatch = prod.batches[0] || null;

      let daysUntilEarliestExpiry: number | null = null;
      if (earliestBatch) {
        const diffMs = new Date(earliestBatch.expiryDate).getTime() - now.getTime();
        daysUntilEarliestExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      const threshold = prod.lowStockThreshold || defaultLowThreshold;
      const isOutofStock = totalStock <= 0;
      const isLowStock = totalStock > 0 && totalStock <= threshold;
      const isExpiringSoon =
        earliestBatch !== null &&
        new Date(earliestBatch.expiryDate) <= cutoffDate;
      const isPriority = Boolean((prod.attributes as Record<string, unknown>)?.isPriority);
      const attrs = (prod.attributes as Record<string, unknown>) || {};
      const vendorName = (attrs.vendorName as string) || (earliestBatch ? ((earliestBatch as Record<string, unknown>)?.vendorName as string) : null) || null;
      const manufacturer = (attrs.manufacturer as string) || null;

      return {
        id: prod.id,
        name: prod.name,
        genericName: prod.genericName || null,
        category: prod.category,
        unit: prod.unit,
        barcode: prod.barcode || null,
        lowStockThreshold: threshold,
        totalStock,
        batchCount: prod.batches.length,
        earliestBatchNumber: earliestBatch ? earliestBatch.batchNumber : null,
        earliestExpiryDate: earliestBatch ? earliestBatch.expiryDate.toISOString() : null,
        daysUntilEarliestExpiry,
        isOutofStock,
        isLowStock,
        isExpiringSoon,
        isPriority,
        vendorName,
        manufacturer,
      };
    });

    // Filter if inStockOnly, lowStockOnly, expiringSoonOnly, priorityOnly or unstockedOnly specified
    let filtered = aggregated;
    if (query.inStockOnly) {
      filtered = filtered.filter((p) => p.totalStock > 0);
    }
    if (query.lowStockOnly) {
      filtered = filtered.filter((p) => p.isLowStock || p.isOutofStock);
    }
    if (query.expiringSoonOnly) {
      filtered = filtered.filter((p) => p.isExpiringSoon);
    }
    if (query.priorityOnly) {
      filtered = filtered.filter((p) => p.isPriority);
    }
    if ((query as any).unstockedOnly) {
      filtered = filtered.filter((p) => p.totalStock === 0 || p.batchCount === 0);
    }

    const totalCatalogItems = aggregated.length;
    const stockedCount = aggregated.filter((p) => p.totalStock > 0).length;
    const unstockedCount = totalCatalogItems - stockedCount;
    const priorityUnstockedCount = aggregated.filter(
      (p) => p.isPriority && (p.totalStock === 0 || p.batchCount === 0),
    ).length;
    const completionPercentage =
      totalCatalogItems > 0 ? Math.round((stockedCount / totalCatalogItems) * 100) : 100;

    return {
      totalProducts: filtered.length,
      summary: {
        totalCatalogItems,
        stockedCount,
        unstockedCount,
        priorityUnstockedCount,
        completionPercentage,
        outOfStockCount: aggregated.filter((p) => p.isOutofStock).length,
        lowStockCount: aggregated.filter((p) => p.isLowStock).length,
        expiringSoonCount: aggregated.filter((p) => p.isExpiringSoon).length,
        priorityCount: aggregated.filter((p) => p.isPriority).length,
      },
      products: filtered,
    };
  }

  /**
   * Step 1.13 — Lookup product and active FEFO-ordered batches by barcode
   */
  async lookupByBarcode(tenantId: string, barcode: string, storeId?: string) {
    const cleanBarcode = barcode?.trim();
    if (!cleanBarcode) {
      throw new BadRequestException('Barcode parameter is required');
    }

    const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${effectiveStoreId}" not found for this tenant`);
      }
    }

    const product = await this.prisma.product.findFirst({
      where: { tenantId, barcode: cleanBarcode },
      include: {
        batches: {
          where: {
            ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
            quantityRemaining: { gt: 0 },
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`No product found matching barcode "${cleanBarcode}"`);
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
   * Step 4.1 — Expiry-Risk Forecasting
   * Compares active batch quantities against average daily sales velocity to predict
   * unsold stock at expiry date, financial capital at risk, and actionable intervention priority.
   */
  async getExpiryRiskForecast(
    tenantId: string,
    options?: {
      storeId?: string;
      timeframeDays?: number;
      riskFilter?: string;
      search?: string;
      limit?: number;
    },
  ) {
    const effectiveStoreId = options?.storeId && options?.storeId !== 'all' ? options.storeId : undefined;
    const timeframeDays = Math.max(7, Math.min(180, Number(options?.timeframeDays) || 30));
    const search = options?.search?.trim()?.toLowerCase();
    const riskFilter = options?.riskFilter?.toUpperCase();
    const limit = Math.max(1, Math.min(500, Number(options?.limit) || 100));

    // 1. Fetch active batches with quantityRemaining > 0
    const batches = await this.prisma.batch.findMany({
      where: {
        tenantId,
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
        quantityRemaining: { gt: 0 },
        ...(search
          ? {
              OR: [
                { batchNumber: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } },
                { product: { genericName: { contains: search, mode: 'insensitive' } } },
                { product: { barcode: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            genericName: true,
            category: true,
            unit: true,
            barcode: true,
            lowStockThreshold: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (batches.length === 0) {
      return {
        timeframeDays,
        summary: {
          totalBatchesAnalyzed: 0,
          totalUnitsAtRisk: 0,
          totalCapitalAtRisk: 0,
          totalRetailPotentialLoss: 0,
          criticalBatchesCount: 0,
          highRiskBatchesCount: 0,
          moderateRiskBatchesCount: 0,
          tightWindowCount: 0,
          stagnantBatchesCount: 0,
          safeBatchesCount: 0,
        },
        batches: [],
      };
    }

    // 2. Collect unique productIds to aggregate sales velocity in a single query
    const productIds = Array.from(new Set(batches.map((b) => b.productId)));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const salesAggregation = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        sale: {
          tenantId,
          ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
          status: { not: 'VOIDED' },
          createdAt: { gte: cutoffDate },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const salesMap = new Map<string, number>();
    for (const item of salesAggregation) {
      salesMap.set(item.productId, item._sum.quantity || 0);
    }

    const now = new Date();
    const analyzedBatches = batches.map((batch) => {
      const expiry = new Date(batch.expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isExpired = daysUntilExpiry <= 0;

      const totalUnitsSold = salesMap.get(batch.productId) || 0;
      const rawVelocity = totalUnitsSold / timeframeDays;
      const dailySalesVelocity = Math.round(rawVelocity * 100) / 100; // 2 decimal places

      const costPrice = Number(batch.costPrice);
      const sellPrice = Number(batch.sellPrice);

      let estimatedDaysToDeplete: number | null = null;
      let depletionDate: string | null = null;
      let projectedSoldBeforeExpiry = 0;
      let projectedUnsoldQuantity = batch.quantityRemaining;
      let riskScore = 0;
      let riskLevel:
        | 'EXPIRED'
        | 'CRITICAL_UNSOLD'
        | 'CRITICAL_NO_SALES'
        | 'HIGH_RISK'
        | 'MODERATE_RISK'
        | 'TIGHT_WINDOW'
        | 'STAGNANT'
        | 'SAFE' = 'SAFE';
      let actionRecommendation:
        | 'IMMEDIATE_QUARANTINE_OR_WRITEOFF'
        | 'AGGRESSIVE_MARKDOWN_NOW'
        | 'MARKDOWN_OR_VENDOR_RETURN'
        | 'APPLY_DISCOUNT_OR_BUNDLE'
        | 'PRIORITIZE_POS_PLACEMENT'
        | 'PUSH_PROMOTION_OR_TRANSFER'
        | 'MONITOR_VELOCITY'
        | 'MONITOR_SALES_TREND'
        | 'ON_TRACK_NO_ACTION' = 'ON_TRACK_NO_ACTION';
      let actionSummary = '';

      if (isExpired) {
        riskScore = 100;
        riskLevel = 'EXPIRED';
        projectedSoldBeforeExpiry = 0;
        projectedUnsoldQuantity = batch.quantityRemaining;
        actionRecommendation = 'IMMEDIATE_QUARANTINE_OR_WRITEOFF';
        actionSummary = `Expired ${Math.abs(daysUntilExpiry)} days ago. Quarantined for write-off or supplier claim.`;
      } else if (dailySalesVelocity === 0) {
        projectedSoldBeforeExpiry = 0;
        projectedUnsoldQuantity = batch.quantityRemaining;
        if (daysUntilExpiry <= 90) {
          riskScore = 95;
          riskLevel = 'CRITICAL_NO_SALES';
          actionRecommendation = 'MARKDOWN_OR_VENDOR_RETURN';
          actionSummary = `Zero sales in ${timeframeDays}d with only ${daysUntilExpiry}d left. Immediate return or 50%+ discount needed.`;
        } else if (daysUntilExpiry <= 180) {
          riskScore = 80;
          riskLevel = 'HIGH_RISK';
          actionRecommendation = 'PUSH_PROMOTION_OR_TRANSFER';
          actionSummary = `Zero sales in ${timeframeDays}d. Initiate counter promotion or transfer to higher footfall store.`;
        } else {
          riskScore = 50;
          riskLevel = 'STAGNANT';
          actionRecommendation = 'MONITOR_VELOCITY';
          actionSummary = `Zero sales in ${timeframeDays}d, but ${daysUntilExpiry}d shelf life remains. Monitor for movement.`;
        }
      } else {
        // dailySalesVelocity > 0
        estimatedDaysToDeplete = Math.ceil(batch.quantityRemaining / dailySalesVelocity);
        const depDate = new Date();
        depDate.setDate(depDate.getDate() + estimatedDaysToDeplete);
        depletionDate = depDate.toISOString();

        projectedSoldBeforeExpiry = Math.min(
          batch.quantityRemaining,
          Math.floor(dailySalesVelocity * Math.max(0, daysUntilExpiry)),
        );
        projectedUnsoldQuantity = Math.max(0, batch.quantityRemaining - projectedSoldBeforeExpiry);
        const unsoldRatio = projectedUnsoldQuantity / batch.quantityRemaining;

        if (projectedUnsoldQuantity > 0) {
          // Will not sell out before expiry
          if (daysUntilExpiry <= 60) {
            riskScore = Math.min(99, Math.round(75 + unsoldRatio * 24));
            riskLevel = 'CRITICAL_UNSOLD';
            actionRecommendation = 'AGGRESSIVE_MARKDOWN_NOW';
            actionSummary = `Will expire with ~${projectedUnsoldQuantity} unsold units (${Math.round(unsoldRatio * 100)}% of stock). Urgent markdown required.`;
          } else if (daysUntilExpiry <= 120) {
            riskScore = Math.min(90, Math.round(60 + unsoldRatio * 30));
            riskLevel = 'HIGH_RISK';
            actionRecommendation = 'APPLY_DISCOUNT_OR_BUNDLE';
            actionSummary = `Depletion rate is too slow. Expected ~${projectedUnsoldQuantity} units unsold at expiry. Apply 20-30% discount.`;
          } else {
            riskScore = Math.min(75, Math.round(40 + unsoldRatio * 35));
            riskLevel = 'MODERATE_RISK';
            actionRecommendation = 'PRIORITIZE_POS_PLACEMENT';
            actionSummary = `Projected ~${projectedUnsoldQuantity} units unsold. Prioritize POS front-counter placement or bundle.`;
          }
        } else {
          // Will sell out before expiry
          const safetyBufferDays = daysUntilExpiry - estimatedDaysToDeplete;
          if (safetyBufferDays <= 15) {
            riskScore = 35;
            riskLevel = 'TIGHT_WINDOW';
            actionRecommendation = 'MONITOR_SALES_TREND';
            actionSummary = `Sells out ${safetyBufferDays}d before expiry. Minor dip in velocity could risk waste.`;
          } else {
            riskScore = Math.max(5, Math.min(25, 30 - Math.round(safetyBufferDays / 10)));
            riskLevel = 'SAFE';
            actionRecommendation = 'ON_TRACK_NO_ACTION';
            actionSummary = `Healthy turnover: sells out ~${safetyBufferDays} days prior to expiry date.`;
          }
        }
      }

      const projectedLossAmount = Math.round(projectedUnsoldQuantity * costPrice * 100) / 100;
      const projectedRetailLossAmount = Math.round(projectedUnsoldQuantity * sellPrice * 100) / 100;

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        storeId: batch.storeId,
        storeName: batch.store.name,
        productId: batch.productId,
        productName: batch.product.name,
        genericName: batch.product.genericName,
        category: batch.product.category,
        unit: batch.product.unit,
        barcode: batch.product.barcode,
        costPrice,
        sellPrice,
        quantityReceived: batch.quantityReceived,
        quantityRemaining: batch.quantityRemaining,
        expiryDate: batch.expiryDate.toISOString(),
        daysUntilExpiry,
        isExpired,
        dailySalesVelocity,
        totalUnitsSoldInTimeframe: totalUnitsSold,
        timeframeDays,
        estimatedDaysToDeplete,
        depletionDate,
        projectedSoldBeforeExpiry,
        projectedUnsoldQuantity,
        projectedLossAmount,
        projectedRetailLossAmount,
        riskScore,
        riskLevel,
        actionRecommendation,
        actionSummary,
      };
    });

    // Compute Summary across all active batches analyzed
    const summary = {
      totalBatchesAnalyzed: analyzedBatches.length,
      totalUnitsAtRisk: analyzedBatches
        .filter((b) => b.riskLevel !== 'SAFE')
        .reduce((sum, b) => sum + b.projectedUnsoldQuantity, 0),
      totalCapitalAtRisk: Math.round(
        analyzedBatches
          .filter((b) => b.riskLevel !== 'SAFE')
          .reduce((sum, b) => sum + b.projectedLossAmount, 0) * 100,
      ) / 100,
      totalRetailPotentialLoss: Math.round(
        analyzedBatches
          .filter((b) => b.riskLevel !== 'SAFE')
          .reduce((sum, b) => sum + b.projectedRetailLossAmount, 0) * 100,
      ) / 100,
      criticalBatchesCount: analyzedBatches.filter(
        (b) => b.riskLevel === 'CRITICAL_UNSOLD' || b.riskLevel === 'CRITICAL_NO_SALES' || b.riskLevel === 'EXPIRED',
      ).length,
      highRiskBatchesCount: analyzedBatches.filter((b) => b.riskLevel === 'HIGH_RISK').length,
      moderateRiskBatchesCount: analyzedBatches.filter((b) => b.riskLevel === 'MODERATE_RISK').length,
      tightWindowCount: analyzedBatches.filter((b) => b.riskLevel === 'TIGHT_WINDOW').length,
      stagnantBatchesCount: analyzedBatches.filter((b) => b.riskLevel === 'STAGNANT').length,
      safeBatchesCount: analyzedBatches.filter((b) => b.riskLevel === 'SAFE').length,
    };

    // Filter by risk tier if requested
    let filtered = analyzedBatches;
    if (riskFilter && riskFilter !== 'ALL') {
      if (riskFilter === 'CRITICAL') {
        filtered = filtered.filter(
          (b) => b.riskLevel === 'CRITICAL_UNSOLD' || b.riskLevel === 'CRITICAL_NO_SALES' || b.riskLevel === 'EXPIRED',
        );
      } else if (riskFilter === 'HIGH' || riskFilter === 'HIGH_RISK') {
        filtered = filtered.filter((b) => b.riskLevel === 'HIGH_RISK');
      } else if (riskFilter === 'MODERATE' || riskFilter === 'MODERATE_RISK') {
        filtered = filtered.filter((b) => b.riskLevel === 'MODERATE_RISK' || b.riskLevel === 'TIGHT_WINDOW');
      } else if (riskFilter === 'SAFE') {
        filtered = filtered.filter((b) => b.riskLevel === 'SAFE');
      } else if (riskFilter === 'STAGNANT') {
        filtered = filtered.filter((b) => b.riskLevel === 'STAGNANT' || b.dailySalesVelocity === 0);
      } else if (riskFilter === 'AT_RISK') {
        filtered = filtered.filter((b) => b.riskLevel !== 'SAFE');
      }
    }

    // Sort by riskScore DESC (highest risk first), then daysUntilExpiry ASC
    filtered.sort((a, b) => {
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    return {
      timeframeDays,
      summary,
      batches: filtered.slice(0, limit),
    };
  }
}



