import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { BulkPricePushDto } from './dtos/bulk-price-push.dto';
import { BroadcastSettingDto } from './dtos/broadcast-setting.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async createStore(tenantId: string, dto: CreateStoreDto) {
    const store = await this.prisma.store.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        currency: dto.currency || 'PKR',
        taxRate: dto.taxRate ?? 0,
        receiptFooter: dto.receiptFooter,
        expiryAlertDays: dto.expiryAlertDays,
      },
    });

    return {
      success: true,
      data: store,
      message: 'Store created successfully',
    };
  }

  async findAllStores(tenantId: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: stores,
      total: stores.length,
    };
  }

  async findOneStore(tenantId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.tenantId !== tenantId) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    return {
      success: true,
      data: store,
    };
  }

  async updateStore(tenantId: string, storeId: string, dto: UpdateStoreDto) {
    await this.findOneStore(tenantId, storeId); // Verify store existence & tenant scoping

    const dataToUpdate: Prisma.StoreUpdateInput = {};

    if (dto.name !== undefined) dataToUpdate.name = dto.name;
    if (dto.address !== undefined) dataToUpdate.address = dto.address;
    if (dto.currency !== undefined) dataToUpdate.currency = dto.currency;
    if (dto.taxRate !== undefined) dataToUpdate.taxRate = dto.taxRate;
    if (dto.receiptFooter !== undefined) dataToUpdate.receiptFooter = dto.receiptFooter;
    if (dto.expiryAlertDays !== undefined) dataToUpdate.expiryAlertDays = dto.expiryAlertDays;
    if (dto.isActive !== undefined) dataToUpdate.isActive = dto.isActive;

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: dataToUpdate,
    });

    return {
      success: true,
      data: updatedStore,
      message: 'Store updated successfully',
    };
  }

  async softDeleteStore(tenantId: string, storeId: string) {
    await this.findOneStore(tenantId, storeId);

    const softDeleted = await this.prisma.store.update({
      where: { id: storeId },
      data: { isActive: false },
    });

    return {
      success: true,
      data: softDeleted,
      message: 'Store deactivated successfully',
    };
  }

  /**
   * Enterprise Multi-Store Chain Overview
   * Consolidated KPIs, branch performance comparison, and transfer status
   */
  async getChainOverview(tenantId: string) {
    const stores = await this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const storeSummaries = await Promise.all(
      stores.map(async (store) => {
        const [salesTodayAgg, salesMonthAgg, batches, pendingTransfers] = await Promise.all([
          this.prisma.sale.aggregate({
            where: {
              tenantId,
              storeId: store.id,
              status: 'COMPLETED',
              createdAt: { gte: startOfToday },
            },
            _count: { id: true },
            _sum: { totalAmount: true },
          }),
          this.prisma.sale.aggregate({
            where: {
              tenantId,
              storeId: store.id,
              status: 'COMPLETED',
              createdAt: { gte: startOfMonth },
            },
            _count: { id: true },
            _sum: { totalAmount: true },
          }),
          this.prisma.batch.findMany({
            where: {
              tenantId,
              storeId: store.id,
              quantityRemaining: { gt: 0 },
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  lowStockThreshold: true,
                },
              },
            },
          }),
          this.prisma.stockTransfer.count({
            where: {
              tenantId,
              OR: [{ sourceStoreId: store.id }, { targetStoreId: store.id }],
              status: { in: [TransferStatus.REQUESTED, TransferStatus.DISPATCHED] },
            },
          }),
        ]);

        const salesToday = Number(salesTodayAgg._sum.totalAmount || 0);
        const salesCountToday = salesTodayAgg._count.id || 0;
        const salesMonth = Number(salesMonthAgg._sum.totalAmount || 0);
        const salesCountMonth = salesMonthAgg._count.id || 0;

        let inventoryCostValue = 0;
        let retailValue = 0;
        let lowStockCount = 0;
        let totalUnitsInStock = 0;

        for (const batch of batches) {
          const qty = batch.quantityRemaining;
          totalUnitsInStock += qty;
          inventoryCostValue += Number(batch.costPrice) * qty;
          retailValue += Number(batch.sellPrice) * qty;
          if (qty <= (batch.product.lowStockThreshold || 10)) {
            lowStockCount++;
          }
        }

        return {
          id: store.id,
          name: store.name,
          address: store.address,
          currency: store.currency,
          taxRate: Number(store.taxRate),
          receiptFooter: store.receiptFooter,
          expiryAlertDays: store.expiryAlertDays || 60,
          salesToday,
          salesCountToday,
          salesMonth,
          salesCountMonth,
          activeBatchesCount: batches.length,
          totalUnitsInStock,
          inventoryCostValue: Math.round(inventoryCostValue * 100) / 100,
          retailValue: Math.round(retailValue * 100) / 100,
          lowStockCount,
          pendingTransfers,
        };
      })
    );

    // Consolidated totals across all stores
    const consolidated = storeSummaries.reduce(
      (acc, s) => {
        acc.totalSalesToday += s.salesToday;
        acc.totalSalesMonth += s.salesMonth;
        acc.totalInventoryCostValue += s.inventoryCostValue;
        acc.totalRetailValue += s.retailValue;
        acc.totalLowStockCount += s.lowStockCount;
        acc.totalPendingTransfers += s.pendingTransfers;
        return acc;
      },
      {
        totalSalesToday: 0,
        totalSalesMonth: 0,
        totalInventoryCostValue: 0,
        totalRetailValue: 0,
        totalLowStockCount: 0,
        totalPendingTransfers: 0,
      }
    );

    return {
      success: true,
      data: {
        totalStoresCount: stores.length,
        consolidated: {
          totalSalesToday: Math.round(consolidated.totalSalesToday * 100) / 100,
          totalSalesMonth: Math.round(consolidated.totalSalesMonth * 100) / 100,
          totalInventoryCostValue: Math.round(consolidated.totalInventoryCostValue * 100) / 100,
          totalRetailValue: Math.round(consolidated.totalRetailValue * 100) / 100,
          totalLowStockCount: consolidated.totalLowStockCount,
          totalPendingTransfers: consolidated.totalPendingTransfers,
        },
        stores: storeSummaries,
      },
    };
  }

  /**
   * Enterprise Bulk Price Push across stores
   * Pushes fixed selling price or percentage adjustment across target branches
   */
  async bulkPricePush(tenantId: string, dto: import('./dtos/bulk-price-push.dto').BulkPricePushDto) {
    // 1. Determine target stores
    let targetStores = await this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    if (dto.targetStoreIds && dto.targetStoreIds.length > 0) {
      targetStores = targetStores.filter((s) => dto.targetStoreIds!.includes(s.id));
    }

    if (targetStores.length === 0) {
      throw new BadRequestException('No valid active stores found for price push');
    }

    const storeIds = targetStores.map((s) => s.id);

    // 2. Build batch filter
    const batchWhere: Prisma.BatchWhereInput = {
      tenantId,
      storeId: { in: storeIds },
    };

    if (dto.productId) {
      batchWhere.productId = dto.productId;
    }

    if (dto.category) {
      batchWhere.product = { category: dto.category };
    }

    let updatedBatchesCount = 0;

    // 3. Apply updates
    if (dto.newSellPrice !== undefined) {
      const result = await this.prisma.batch.updateMany({
        where: batchWhere,
        data: { sellPrice: dto.newSellPrice },
      });
      updatedBatchesCount = result.count;
    } else if (dto.percentageAdjustment !== undefined) {
      const batches = await this.prisma.batch.findMany({
        where: batchWhere,
        select: { id: true, sellPrice: true },
      });

      const multiplier = 1 + dto.percentageAdjustment / 100;
      await this.prisma.$transaction(
        batches.map((b) =>
          this.prisma.batch.update({
            where: { id: b.id },
            data: {
              sellPrice: Math.max(0, Math.round(Number(b.sellPrice) * multiplier * 100) / 100),
            },
          })
        )
      );
      updatedBatchesCount = batches.length;
    } else {
      throw new BadRequestException('Must provide either newSellPrice or percentageAdjustment');
    }

    return {
      success: true,
      data: {
        updatedBatchesCount,
        affectedStoresCount: storeIds.length,
        storeNames: targetStores.map((s) => s.name),
        reason: dto.reason || 'Central enterprise price update',
      },
      message: `Successfully pushed price update to ${updatedBatchesCount} batches across ${storeIds.length} store branch(es).`,
    };
  }

  /**
   * Enterprise Broadcast Settings across stores
   * Pushes tax rates, receipt footers, and expiry alerts across target branches
   */
  async broadcastSetting(tenantId: string, dto: import('./dtos/broadcast-setting.dto').BroadcastSettingDto) {
    let targetStores = await this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    });

    if (dto.targetStoreIds && dto.targetStoreIds.length > 0) {
      targetStores = targetStores.filter((s) => dto.targetStoreIds!.includes(s.id));
    }

    if (targetStores.length === 0) {
      throw new BadRequestException('No active store branches selected');
    }

    const storeIds = targetStores.map((s) => s.id);
    const updateData: Prisma.StoreUpdateInput = {};

    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.receiptFooter !== undefined) updateData.receiptFooter = dto.receiptFooter;
    if (dto.expiryAlertDays !== undefined) updateData.expiryAlertDays = dto.expiryAlertDays;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No settings provided to broadcast');
    }

    const result = await this.prisma.store.updateMany({
      where: {
        tenantId,
        id: { in: storeIds },
      },
      data: updateData,
    });

    return {
      success: true,
      data: {
        updatedStoresCount: result.count,
        storeNames: targetStores.map((s) => s.name),
      },
      message: `Broadcasted settings to ${result.count} store branch(es) successfully.`,
    };
  }
}

