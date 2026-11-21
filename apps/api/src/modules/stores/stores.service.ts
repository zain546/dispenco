import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, TransferStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CreateStoreDto } from './dtos/create-store.dto';
import { UpdateStoreDto } from './dtos/update-store.dto';
import { BulkPricePushDto } from './dtos/bulk-price-push.dto';
import { BroadcastSettingDto } from './dtos/broadcast-setting.dto';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

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

    await this.invalidateStoreCaches(tenantId);

    return {
      success: true,
      data: store,
      message: 'Store created successfully',
    };
  }

  private async invalidateStoreCaches(tenantId: string) {
    await Promise.all([
      this.cache.invalidateTenantConfig(tenantId, 'stores'),
      this.cache.del(`chain:overview:${tenantId}`),
    ]);
  }

  async findAllStores(tenantId: string) {
    return this.cache.wrap(`cfg:${tenantId}:stores:all`, 900, async () => {
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
    });
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

    await this.invalidateStoreCaches(tenantId);

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

    await this.invalidateStoreCaches(tenantId);

    return {
      success: true,
      data: softDeleted,
      message: 'Store deactivated successfully',
    };
  }

  /**
   * Enterprise Multi-Store Chain Overview
   * Consolidated KPIs, branch performance comparison, and transfer status.
   * Uses tenant-level aggregations and 60-second Redis caching to eliminate N*4 connection fan-out.
   */
  async getChainOverview(tenantId: string) {
    return this.cache.wrap(`chain:overview:${tenantId}`, 60, async () => {
      const stores = await this.prisma.store.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (stores.length === 0) {
        return {
          success: true,
          data: {
            totalStoresCount: 0,
            consolidated: {
              totalSalesToday: 0,
              totalSalesMonth: 0,
              totalInventoryCostValue: 0,
              totalRetailValue: 0,
              totalLowStockCount: 0,
              totalPendingTransfers: 0,
            },
            stores: [],
          },
        };
      }

      const storeIds = stores.map((s) => s.id);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Execute 4 consolidated tenant-wide queries in parallel instead of 4 queries per store
      const [salesTodayByStore, salesMonthByStore, activeBatches, pendingTransfers] = await Promise.all([
        this.prisma.sale.groupBy({
          by: ['storeId'],
          where: {
            tenantId,
            storeId: { in: storeIds },
            status: 'COMPLETED',
            createdAt: { gte: startOfToday },
          },
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.sale.groupBy({
          by: ['storeId'],
          where: {
            tenantId,
            storeId: { in: storeIds },
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth },
          },
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.batch.findMany({
          where: {
            tenantId,
            storeId: { in: storeIds },
            quantityRemaining: { gt: 0 },
          },
          select: {
            storeId: true,
            quantityRemaining: true,
            costPrice: true,
            sellPrice: true,
            product: {
              select: {
                lowStockThreshold: true,
              },
            },
          },
        }),
        this.prisma.stockTransfer.findMany({
          where: {
            tenantId,
            status: { in: [TransferStatus.REQUESTED, TransferStatus.DISPATCHED] },
            OR: [
              { sourceStoreId: { in: storeIds } },
              { targetStoreId: { in: storeIds } },
            ],
          },
          select: {
            sourceStoreId: true,
            targetStoreId: true,
          },
        }),
      ]);

      // Index sales aggregations by storeId
      const todaySalesMap = new Map(
        salesTodayByStore.map((r) => [r.storeId, { total: Number(r._sum.totalAmount || 0), count: r._count.id || 0 }]),
      );
      const monthSalesMap = new Map(
        salesMonthByStore.map((r) => [r.storeId, { total: Number(r._sum.totalAmount || 0), count: r._count.id || 0 }]),
      );

      // Group batches and compute inventory metrics per store
      interface StoreInventoryMetrics {
        count: number;
        units: number;
        cost: number;
        retail: number;
        lowStock: number;
      }
      const inventoryByStore = new Map<string, StoreInventoryMetrics>();
      for (const batch of activeBatches) {
        let entry = inventoryByStore.get(batch.storeId);
        if (!entry) {
          entry = { count: 0, units: 0, cost: 0, retail: 0, lowStock: 0 };
          inventoryByStore.set(batch.storeId, entry);
        }
        const qty = batch.quantityRemaining;
        entry.count++;
        entry.units += qty;
        entry.cost += Number(batch.costPrice) * qty;
        entry.retail += Number(batch.sellPrice) * qty;
        if (qty <= (batch.product?.lowStockThreshold ?? 10)) {
          entry.lowStock++;
        }
      }

      // Group pending transfers by storeId
      const transferCountByStore = new Map<string, number>();
      for (const t of pendingTransfers) {
        transferCountByStore.set(t.sourceStoreId, (transferCountByStore.get(t.sourceStoreId) || 0) + 1);
        if (t.targetStoreId !== t.sourceStoreId) {
          transferCountByStore.set(t.targetStoreId, (transferCountByStore.get(t.targetStoreId) || 0) + 1);
        }
      }

      const storeSummaries = stores.map((store) => {
        const todaySales = todaySalesMap.get(store.id) || { total: 0, count: 0 };
        const monthSales = monthSalesMap.get(store.id) || { total: 0, count: 0 };
        const inv = inventoryByStore.get(store.id) || { count: 0, units: 0, cost: 0, retail: 0, lowStock: 0 };
        const pendingCount = transferCountByStore.get(store.id) || 0;

        return {
          id: store.id,
          name: store.name,
          address: store.address,
          currency: store.currency,
          taxRate: Number(store.taxRate),
          receiptFooter: store.receiptFooter,
          expiryAlertDays: store.expiryAlertDays || 60,
          salesToday: todaySales.total,
          salesCountToday: todaySales.count,
          salesMonth: monthSales.total,
          salesCountMonth: monthSales.count,
          activeBatchesCount: inv.count,
          totalUnitsInStock: inv.units,
          inventoryCostValue: Math.round(inv.cost * 100) / 100,
          retailValue: Math.round(inv.retail * 100) / 100,
          lowStockCount: inv.lowStock,
          pendingTransfers: pendingCount,
        };
      });

      // Consolidated totals across all stores
      const consolidated = storeSummaries.reduce(
        (acc, s) => {
          acc.totalSalesToday += s.salesToday;
          acc.totalSalesMonth += s.salesMonth;
          acc.totalInventoryCostValue += s.inventoryCostValue;
          acc.totalRetailValue += s.retailValue;
          acc.totalLowStockCount += s.lowStockCount;
          return acc;
        },
        {
          totalSalesToday: 0,
          totalSalesMonth: 0,
          totalInventoryCostValue: 0,
          totalRetailValue: 0,
          totalLowStockCount: 0,
          totalPendingTransfers: pendingTransfers.length,
        },
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
    });
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

    // 2. Build batch filter (only active non-depleted stock batches)
    const batchWhere: Prisma.BatchWhereInput = {
      tenantId,
      storeId: { in: storeIds },
      quantityRemaining: { gt: 0 },
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
      const results = await this.prisma.$transaction(
        batches.map((b) =>
          this.prisma.batch.updateMany({
            where: { id: b.id, quantityRemaining: { gt: 0 } },
            data: {
              sellPrice: Math.max(0, Math.round(Number(b.sellPrice) * multiplier * 100) / 100),
            },
          }),
        ),
      );
      updatedBatchesCount = results.reduce((sum, r) => sum + r.count, 0);
    } else {
      throw new BadRequestException('Must provide either newSellPrice or percentageAdjustment');
    }

    // Invalidate inventory and chain overview caches for affected stores
    await Promise.all([
      ...storeIds.map((sId) => this.cache.invalidateStoreInventory(tenantId, sId)),
      this.cache.del(`chain:overview:${tenantId}`),
    ]);

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

    await Promise.all([
      this.cache.invalidateTenantConfig(tenantId, 'stores'),
      this.cache.del(`chain:overview:${tenantId}`),
    ]);

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

