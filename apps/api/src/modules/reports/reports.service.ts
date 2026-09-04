import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetSalesReportDto, GroupByFrequency } from './dto/get-sales-report.dto';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(tenantId: string, query: GetSalesReportDto) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default last 30 days
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Standardize endDate to end of day
    endDate.setHours(23, 59, 59, 999);

    const whereCondition: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (query.storeId) {
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
