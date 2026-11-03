import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetSalesReportDto, GroupByFrequency } from './dto/get-sales-report.dto';
import { GetOrgOverviewDto } from './dto/get-org-overview.dto';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes accurate Cost of Goods Sold (COGS) for a sale line item,
   * automatically accounting for pack-level vs loose single-unit dispensing.
   */
  private computeItemCost(item: {
    quantity: number;
    unitPrice: unknown;
    batch?: { costPrice: unknown; sellPrice: unknown } | null;
    product?: { attributes?: unknown } | null;
  }): number {
    const qty = Number(item.quantity ?? 0);
    if (qty <= 0) return 0;

    const batchCost = Number(item.batch?.costPrice ?? 0);
    const batchSell = Number(item.batch?.sellPrice ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const attrs = (item.product?.attributes as Record<string, unknown>) || {};
    const packSize = Math.max(1, Number(attrs.packSize) || 1);

    if (batchCost <= 0) return 0;

    let effectiveUnitCost = batchCost;
    if (packSize > 1 && batchSell > 0) {
      const singleUnitSellPrice = batchSell / packSize;
      // Determine whether this line item was dispensed as loose units vs full packs
      if (Math.abs(unitPrice - singleUnitSellPrice) < Math.abs(unitPrice - batchSell)) {
        effectiveUnitCost = batchCost / packSize;
      }
    } else if (packSize > 1 && batchCost > unitPrice && batchCost / packSize <= unitPrice) {
      effectiveUnitCost = batchCost / packSize;
    }

    return Number((effectiveUnitCost * qty).toFixed(2));
  }

  private parseDateBoundary(dateStr: string | undefined, isEnd: boolean, defaultDaysAgo = 0): Date {
    let d: Date;
    if (dateStr) {
      const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
      if (ymdMatch) {
        const year = Number(ymdMatch[1]);
        const month = Number(ymdMatch[2]) - 1;
        const day = Number(ymdMatch[3]);
        d = isEnd
          ? new Date(year, month, day, 23, 59, 59, 999)
          : new Date(year, month, day, 0, 0, 0, 0);
        return d;
      }
      d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(`Invalid ${isEnd ? 'endDate' : 'startDate'} format`);
      }
    } else {
      d = new Date(Date.now() - defaultDaysAgo * 24 * 60 * 60 * 1000);
    }
    if (isEnd) {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setHours(0, 0, 0, 0);
    }
    return d;
  }

  /**
   * Org-level summary aggregating analytics and side-by-side branch comparison across all stores
   */
  async getOrgOverview(tenantId: string, query: GetOrgOverviewDto) {
    let startDate = this.parseDateBoundary(query.startDate, false, 30);
    let endDate = this.parseDateBoundary(query.endDate, true, 0);

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

    // 2. Fetch all completed sales within date range with returns accounted for
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
        returns: {
          select: { refundAmount: true },
        },
        saleItems: {
          include: {
            returnItems: {
              select: { quantity: true, refundAmount: true },
            },
            batch: {
              select: { costPrice: true, sellPrice: true },
            },
            product: {
              select: { attributes: true },
            },
          },
        },
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

    // 4. Overall Org Totals (Net of returns)
    let totalRevenue = 0;
    let grossRevenue = 0;
    let totalReturns = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalItemsSold = 0;
    let totalTransactions = 0;

    sales.forEach((s) => {
      const rawSaleRev = Number(s.totalAmount);
      const saleReturns = s.returns ? s.returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0) : 0;
      const netSaleRev = Math.max(0, Number((rawSaleRev - saleReturns).toFixed(2)));
      const isFullyReturned = saleReturns >= rawSaleRev && rawSaleRev > 0;

      grossRevenue += rawSaleRev;
      totalReturns += saleReturns;
      totalRevenue += netSaleRev;
      totalTax += Number(s.taxAmount || 0);

      if (!isFullyReturned) {
        totalTransactions += 1;
      }

      s.saleItems.forEach((si) => {
        const itemReturns = si.returnItems ? si.returnItems.reduce((sum, ri) => sum + ri.quantity, 0) : 0;
        const netQuantity = Math.max(0, si.quantity - itemReturns);
        totalItemsSold += netQuantity;
        totalCost += this.computeItemCost({ ...si, quantity: netQuantity });
      });
    });

    totalRevenue = Number(totalRevenue.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    const totalProfit = Number((totalRevenue - totalTax - totalCost).toFixed(2));
    const profitMargin =
      totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

    const averageOrderValue =
      totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0;

    // 5. Per-Store Breakdown
    const storeBreakdowns = stores.map((store) => {
      const storeSales = sales.filter((s) => s.storeId === store.id);
      const storeBatches = batches.filter((b) => b.storeId === store.id);

      let storeRevenue = 0;
      let storeCost = 0;
      let storeTax = 0;
      let storeItemsSold = 0;
      let storeTransactions = 0;

      storeSales.forEach((s) => {
        const rawRev = Number(s.totalAmount);
        const sReturns = s.returns ? s.returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0) : 0;
        const netRev = Math.max(0, Number((rawRev - sReturns).toFixed(2)));
        const isFullyRet = sReturns >= rawRev && rawRev > 0;

        storeRevenue += netRev;
        storeTax += Number(s.taxAmount || 0);

        if (!isFullyRet) {
          storeTransactions += 1;
        }

        s.saleItems.forEach((si) => {
          const itemReturns = si.returnItems ? si.returnItems.reduce((sum, ri) => sum + ri.quantity, 0) : 0;
          const netQty = Math.max(0, si.quantity - itemReturns);
          storeItemsSold += netQty;
          storeCost += this.computeItemCost({ ...si, quantity: netQty });
        });
      });

      const storeProfit = Number((storeRevenue - storeTax - storeCost).toFixed(2));
      const storeProfitMargin =
        storeRevenue > 0 ? Number(((storeProfit / storeRevenue) * 100).toFixed(1)) : 0;

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
        totalCost: Number(storeCost.toFixed(2)),
        totalProfit: storeProfit,
        profitMargin: storeProfitMargin,
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
          totalRevenue,
          grossRevenue: Number(grossRevenue.toFixed(2)),
          totalReturns: Number(totalReturns.toFixed(2)),
          totalCost,
          totalProfit,
          profitMargin,
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
    let startDate = this.parseDateBoundary(query.startDate, false, 30);
    let endDate = this.parseDateBoundary(query.endDate, true, 0);

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

    // 1. Fetch sales in date range with line items, returns, batch cost info, product info & payment details
    const sales = await this.prisma.sale.findMany({
      where: whereCondition,
      include: {
        returns: {
          select: { id: true, returnNumber: true, refundAmount: true, refundMethod: true, createdAt: true },
        },
        saleItems: {
          include: {
            returnItems: {
              select: { id: true, quantity: true, refundAmount: true },
            },
            product: {
              select: { id: true, name: true, category: true, unit: true, attributes: true },
            },
            batch: {
              select: { id: true, batchNumber: true, costPrice: true, sellPrice: true },
            },
          },
        },
        payments: {
          select: { method: true, amount: true, status: true },
        },
        user: {
          select: { id: true, name: true },
        },
        customer: {
          select: { id: true, name: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Compute Summary Metrics & Payment Breakdown (Net of returns)
    let totalTransactions = 0;
    let grossRevenue = 0;
    let totalReturns = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalItemsSold = 0;

    const paymentBreakdown = {
      cash: { count: 0, amount: 0 },
      digital: { count: 0, amount: 0 },
      credit: { count: 0, amount: 0 },
    };

    // 3. Group Sales Over Time (by Day/Week/Month)
    const salesOverTimeMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        cost: number;
        profit: number;
        marginPercent: number;
        count: number;
        itemsSold: number;
      }
    >();

    // 4. Aggregation for Top Selling Products
    const productStatsMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        category: string;
        totalQuantity: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        profitMargin: number;
      }
    >();

    // 5. Individual Transactions List for PDF Register Report
    const transactions: Array<{
      id: string;
      receiptNumber: string;
      createdAt: string;
      customerName: string;
      cashierName: string;
      storeName: string;
      doctorName?: string;
      paymentMethod: string;
      itemsCount: number;
      discountAmount: number;
      totalAmount: number;
      costAmount: number;
      profitAmount: number;
      profitMargin: number;
    }> = [];

    sales.forEach((s) => {
      const rawSaleRev = Number(s.totalAmount);
      const saleReturnsTotal = s.returns ? s.returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0) : 0;
      const netSaleRev = Math.max(0, Number((rawSaleRev - saleReturnsTotal).toFixed(2)));
      const isFullyReturned = saleReturnsTotal >= rawSaleRev && rawSaleRev > 0;

      const saleDisc = Number(s.discountAmount || 0);
      const saleTax = Number(s.taxAmount || 0);
      let saleCost = 0;
      let saleUnits = 0;

      // Subtotal of raw line items to apportion invoice-level discount
      const saleSubtotal = s.saleItems.reduce((acc, item) => {
        return acc + Math.max(0, Number(item.unitPrice) * item.quantity - Number(item.discount || 0));
      }, 0);

      s.saleItems.forEach((item) => {
        const itemReturns = item.returnItems ? item.returnItems.reduce((sum, ri) => sum + ri.quantity, 0) : 0;
        const netQuantity = Math.max(0, item.quantity - itemReturns);
        const itemRefund = item.returnItems ? item.returnItems.reduce((sum, ri) => sum + Number(ri.refundAmount || 0), 0) : 0;
        const rawItemRev = Number(item.unitPrice) * item.quantity - Number(item.discount || 0);
        const itemDiscShare = saleSubtotal > 0 ? (rawItemRev / saleSubtotal) * saleDisc : 0;
        const netItemRev = Math.max(0, Number((rawItemRev - itemDiscShare - itemRefund).toFixed(2)));

        const itemCost = this.computeItemCost({ ...item, quantity: netQuantity });
        const itemProfit = Number((netItemRev - itemCost).toFixed(2));

        saleCost += itemCost;
        saleUnits += netQuantity;

        // Update product stats only if net sold quantity > 0
        if (netQuantity > 0 || netItemRev > 0) {
          const pId = item.productId;
          const pName = item.product?.name || 'Unknown Product';
          const pCategory = item.product?.category || 'General';

          const existingProd = productStatsMap.get(pId) || {
            productId: pId,
            productName: pName,
            category: pCategory,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            profitMargin: 0,
          };

          existingProd.totalQuantity += netQuantity;
          existingProd.totalRevenue = Number((existingProd.totalRevenue + netItemRev).toFixed(2));
          existingProd.totalCost = Number((existingProd.totalCost + itemCost).toFixed(2));
          existingProd.totalProfit = Number((existingProd.totalProfit + itemProfit).toFixed(2));
          existingProd.profitMargin =
            existingProd.totalRevenue > 0
              ? Number(((existingProd.totalProfit / existingProd.totalRevenue) * 100).toFixed(1))
              : 0;
          productStatsMap.set(pId, existingProd);
        }
      });

      saleCost = Number(saleCost.toFixed(2));
      const saleProfit = Number((netSaleRev - saleTax - saleCost).toFixed(2));
      const saleMargin = netSaleRev > 0 ? Number(((saleProfit / netSaleRev) * 100).toFixed(1)) : 0;

      grossRevenue += rawSaleRev;
      totalReturns += saleReturnsTotal;
      totalRevenue += netSaleRev;
      totalCost += saleCost;
      totalDiscount += saleDisc;
      totalTax += saleTax;
      totalItemsSold += saleUnits;

      if (!isFullyReturned) {
        totalTransactions += 1;
      }

      // Payment method tracking (reconcile net cash/digital/credit)
      const primaryPaymentMethod = s.payments?.[0]?.method || 'CASH';
      if (!isFullyReturned) {
        if (primaryPaymentMethod === 'DIGITAL') {
          paymentBreakdown.digital.count += 1;
          paymentBreakdown.digital.amount = Number((paymentBreakdown.digital.amount + netSaleRev).toFixed(2));
        } else if (primaryPaymentMethod === 'CREDIT') {
          paymentBreakdown.credit.count += 1;
          paymentBreakdown.credit.amount = Number((paymentBreakdown.credit.amount + netSaleRev).toFixed(2));
        } else {
          paymentBreakdown.cash.count += 1;
          paymentBreakdown.cash.amount = Number((paymentBreakdown.cash.amount + netSaleRev).toFixed(2));
        }
      }

      // Update Sales Over Time (only days with positive activity)
      const dateKey = this.formatDateGroup(s.createdAt, query.groupBy);
      const existingDate = salesOverTimeMap.get(dateKey) || {
        date: dateKey,
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPercent: 0,
        count: 0,
        itemsSold: 0,
      };
      existingDate.revenue = Number((existingDate.revenue + netSaleRev).toFixed(2));
      existingDate.cost = Number((existingDate.cost + saleCost).toFixed(2));
      existingDate.profit = Number((existingDate.profit + saleProfit).toFixed(2));
      existingDate.marginPercent =
        existingDate.revenue > 0
          ? Number(((existingDate.profit / existingDate.revenue) * 100).toFixed(1))
          : 0;
      if (!isFullyReturned) {
        existingDate.count += 1;
      }
      existingDate.itemsSold += saleUnits;
      salesOverTimeMap.set(dateKey, existingDate);

      // Push transaction record
      transactions.push({
        id: s.id,
        receiptNumber: s.receiptNumber || s.id.slice(0, 8).toUpperCase(),
        createdAt: s.createdAt.toISOString(),
        customerName: s.customer?.name || 'Walk-in Customer',
        cashierName: s.user?.name || 'Pharmacy Staff',
        storeName: s.store?.name || 'Main Store',
        doctorName: (s as any).doctorName || 'Self',
        paymentMethod: isFullyReturned ? `RETURNED (${primaryPaymentMethod})` : primaryPaymentMethod,
        itemsCount: saleUnits,
        discountAmount: Number(saleDisc.toFixed(2)),
        totalAmount: Number(netSaleRev.toFixed(2)),
        costAmount: saleCost,
        profitAmount: saleProfit,
        profitMargin: saleMargin,
      });
    });

    totalRevenue = Number(totalRevenue.toFixed(2));
    totalCost = Number(totalCost.toFixed(2));
    const totalProfit = Number((totalRevenue - totalTax - totalCost).toFixed(2));
    const profitMargin =
      totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const averageOrderValue =
      totalTransactions > 0 ? Number((totalRevenue / totalTransactions).toFixed(2)) : 0;

    const salesOverTime = Array.from(salesOverTimeMap.values());
    const allProductsStats = Array.from(productStatsMap.values());

    const topProductsByQuantity = [...allProductsStats]
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    const topProductsByRevenue = [...allProductsStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      success: true,
      data: {
        summary: {
          totalRevenue,
          grossRevenue: Number(grossRevenue.toFixed(2)),
          totalReturns: Number(totalReturns.toFixed(2)),
          totalCost,
          totalProfit,
          profitMargin,
          totalDiscount: Number(totalDiscount.toFixed(2)),
          totalTax: Number(totalTax.toFixed(2)),
          totalTransactions,
          averageOrderValue,
          totalItemsSold,
          paymentBreakdown,
          dateRange: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
        salesOverTime,
        topProductsByQuantity,
        topProductsByRevenue,
        soldProducts: topProductsByQuantity,
        transactions: transactions.reverse().slice(0, 500),
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
