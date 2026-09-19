import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetSalesReportDto, GroupByFrequency } from './dto/get-sales-report.dto';
import { GetOrgOverviewDto } from './dto/get-org-overview.dto';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Org-level summary aggregating analytics and side-by-side branch comparison across all stores
   */
  async getOrgOverview(tenantId: string, query: GetOrgOverviewDto) {
    let startDate: Date;
    if (query.startDate) {
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    } else {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default last 30 days
    }
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;
    if (query.endDate) {
      endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    } else {
      endDate = new Date();
    }
    endDate.setHours(23, 59, 59, 999);

    if (startDate.getTime() > endDate.getTime()) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // 1. Fetch all active stores for this tenant
    const stores = await this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch all completed sales within date range
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: SaleStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        saleItems: true,
      },
    });

    // 3. Fetch active batches per store for inventory health
    const batches = await this.prisma.batch.findMany({
      where: {
        tenantId,
        quantityRemaining: { gt: 0 },
      },
      select: {
        storeId: true,
        productId: true,
        quantityRemaining: true,
      },
    });

    // 4. Overall Org Totals
    let totalRevenue = 0;
    let totalItemsSold = 0;
    const totalTransactions = sales.length;

    sales.forEach((s) => {
      totalRevenue += Number(s.totalAmount);
      s.saleItems.forEach((si) => {
        totalItemsSold += si.quantity;
      });
    });

    const averageOrderValue =
      totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0;

    // 5. Per-Store Breakdown
    const storeBreakdowns = stores.map((store) => {
      const storeSales = sales.filter((s) => s.storeId === store.id);
      const storeBatches = batches.filter((b) => b.storeId === store.id);

      let storeRevenue = 0;
      let storeItemsSold = 0;

      storeSales.forEach((s) => {
        storeRevenue += Number(s.totalAmount);
        s.saleItems.forEach((si) => {
          storeItemsSold += si.quantity;
        });
      });

      const storeTransactions = storeSales.length;
      const storeAov =
        storeTransactions > 0
          ? Number((storeRevenue / storeTransactions).toFixed(2))
          : 0;

      const uniqueProductsStocked = new Set(storeBatches.map((b) => b.productId)).size;
      const totalUnitsInStock = storeBatches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      const revenueSharePercent =
        totalRevenue > 0 ? Number(((storeRevenue / totalRevenue) * 100).toFixed(1)) : 0;

      return {
        storeId: store.id,
        storeName: store.name,
        address: store.address,
        currency: store.currency,
        totalRevenue: Number(storeRevenue.toFixed(2)),
        totalTransactions: storeTransactions,
        totalItemsSold: storeItemsSold,
        averageOrderValue: storeAov,
        revenueSharePercent,
        activeBatchesCount: storeBatches.length,
        uniqueProductsStocked,
        totalUnitsInStock,
      };
    });

    return {
      success: true,
      data: {
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalTransactions,
          totalItemsSold,
          averageOrderValue,
          totalStoresCount: stores.length,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        stores: storeBreakdowns,
      },
    };
  }

  async getSalesReport(tenantId: string, query: GetSalesReportDto) {
    let startDate: Date;
    if (query.startDate) {
      startDate = new Date(query.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    } else {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default last 30 days
    }
    startDate.setHours(0, 0, 0, 0);

    let endDate: Date;
    if (query.endDate) {
      endDate = new Date(query.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    } else {
      endDate = new Date();
    }
    endDate.setHours(23, 59, 59, 999);

    if (startDate.getTime() > endDate.getTime()) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    const whereCondition: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.storeId && query.storeId !== 'all') {
      const store = await this.prisma.store.findFirst({
        where: { id: query.storeId, tenantId, isActive: true },
      });
      if (!store) {
        throw new NotFoundException(`Active store with ID "${query.storeId}" not found for this tenant`);
      }
      whereCondition.storeId = query.storeId;
    }

    // 1. Fetch sales in date range with line items & product info
    const sales = await this.prisma.sale.findMany({
      where: whereCondition,
      include: {
        saleItems: {
          include: {
            product: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Compute Summary Metrics
    const totalTransactions = sales.length;
    let totalRevenue = 0;
    let totalItemsSold = 0;

    sales.forEach((s) => {
      totalRevenue += Number(s.totalAmount);
      s.saleItems.forEach((item) => {
        totalItemsSold += item.quantity;
      });
    });

    const averageOrderValue =
      totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0;

    // 3. Group Sales Over Time (by Day/Week/Month)
    const salesOverTimeMap = new Map<string, { date: string; revenue: number; count: number }>();

    sales.forEach((s) => {
      const dateKey = this.formatDateGroup(s.createdAt, query.groupBy);
      const existing = salesOverTimeMap.get(dateKey) || {
        date: dateKey,
        revenue: 0,
        count: 0,
      };
      existing.revenue = Number((existing.revenue + Number(s.totalAmount)).toFixed(2));
      existing.count += 1;
      salesOverTimeMap.set(dateKey, existing);
    });

    const salesOverTime = Array.from(salesOverTimeMap.values());

    // 4. Aggregation for Top Selling Products
    const productStatsMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        category: string;
        totalQuantity: number;
        totalRevenue: number;
      }
    >();

    sales.forEach((s) => {
      s.saleItems.forEach((item) => {
        const pId = item.productId;
        const pName = item.product?.name || 'Unknown Product';
        const pCategory = item.product?.category || 'General';
        const itemRev = Number(item.unitPrice) * item.quantity - Number(item.discount);

        const existing = productStatsMap.get(pId) || {
          productId: pId,
          productName: pName,
          category: pCategory,
          totalQuantity: 0,
          totalRevenue: 0,
        };

        existing.totalQuantity += item.quantity;
        existing.totalRevenue = Number((existing.totalRevenue + itemRev).toFixed(2));
        productStatsMap.set(pId, existing);
      });
    });

    const allProductsStats = Array.from(productStatsMap.values());

    const topProductsByQuantity = [...allProductsStats]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const topProductsByRevenue = [...allProductsStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      success: true,
      data: {
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalTransactions,
          averageOrderValue,
          totalItemsSold,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        salesOverTime,
        topProductsByQuantity,
        topProductsByRevenue,
      },
    };
  }

  private formatDateGroup(date: Date, frequency?: GroupByFrequency): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    if (frequency === GroupByFrequency.MONTH) {
      return `${yyyy}-${mm}`;
    }

    if (frequency === GroupByFrequency.WEEK) {
      // Calculate week number
      const firstJan = new Date(date.getFullYear(), 0, 1);
      const dayOfYear = Math.floor(
        (date.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000),
      );
      const weekNum = Math.ceil((dayOfYear + firstJan.getDay() + 1) / 7);
      return `${yyyy}-W${String(weekNum).padStart(2, '0')}`;
    }

    // Default DAY
    return `${yyyy}-${mm}-${dd}`;
  }
}
