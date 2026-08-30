import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiveStockDto } from './dtos/receive-stock.dto';
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
}
