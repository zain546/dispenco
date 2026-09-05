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

    // 2. Locate or create default Store for Tenant
    let store = await this.prisma.store.findFirst({
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
  async getProductBatches(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const batches = await this.prisma.batch.findMany({
      where: { productId, tenantId },
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
        isNearExpiry: daysUntilExpiry > 0 && daysUntilExpiry <= 60,
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

    const now = new Date();

    // Query active batches with stock remaining > 0, ordered by expiry date ASC (FEFO)
    const batches = await db.batch.findMany({
      where: {
        tenantId,
        productId,
        ...(storeId ? { storeId } : {}),
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
      lowStockOnly?: boolean;
      expiringSoonOnly?: boolean;
      priorityOnly?: boolean;
      unstockedOnly?: boolean;
      expiryAlertDays?: number;
      lowStockThreshold?: number;
      search?: string;
    },
  ) {
    const expiryWindowDays = Number(query.expiryAlertDays) || 90;
    const defaultLowThreshold = Number(query.lowStockThreshold) || 20;

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
            ...(query.storeId ? { storeId: query.storeId } : {}),
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
      };
    });

    // Filter if lowStockOnly, expiringSoonOnly, priorityOnly or unstockedOnly specified
    let filtered = aggregated;
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
  async lookupByBarcode(tenantId: string, barcode: string) {
    const cleanBarcode = barcode?.trim();
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
        isNearExpiry: daysUntilExpiry > 0 && daysUntilExpiry <= 60,
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
}



