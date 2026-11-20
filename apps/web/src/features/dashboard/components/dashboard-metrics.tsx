'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/stat-card';
import { useInventoryAggregation } from '@/features/inventory/hooks/use-inventory-queries';
import { reportsApi } from '@/features/reports/services/reports-api';
import { queryKeys } from '@/lib/query-keys';
import { useStore } from '@/context/store-context';
import { formatCurrency, formatNumber } from '@/lib/format';

export function DashboardMetrics() {
  const { activeStoreId, isAllStores, isStoreReady } = useStore();
  const storeIdParam = !isAllStores && activeStoreId ? activeStoreId : undefined;

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: aggData, isLoading: isAggLoading } = useInventoryAggregation(
    storeIdParam ? { storeId: storeIdParam } : undefined,
    { enabled: isStoreReady }
  );

  const { data: salesReport, isLoading: isSalesLoading } = useQuery({
    queryKey: queryKeys.reports.sales(storeIdParam, { startDate: todayStr, endDate: todayStr, groupBy: 'day' }),
    queryFn: () =>
      reportsApi.getSalesReport({
        startDate: todayStr,
        endDate: todayStr,
        groupBy: 'day',
        ...(storeIdParam ? { storeId: storeIdParam } : {}),
      }),
    enabled: isStoreReady,
    staleTime: 60 * 1000,
  });

  const isLoading = isAggLoading || isSalesLoading;

  const metrics = useMemo(() => {
    const s = aggData?.summary;
    return {
      totalProducts: s?.totalCatalogItems || 0,
      stockedCount: s?.stockedCount || 0,
      lowStockCount: s?.lowStockCount || 0,
      expiringSoonCount: s?.expiringSoonCount || 0,
      totalPurchaseCost: s?.totalPurchaseCost || 0,
      totalRetailValue: s?.totalRetailValue || 0,
    };
  }, [aggData]);

  const todaySales = useMemo(() => {
    const sum = salesReport?.data?.summary;
    const rev = sum?.totalRevenue || 0;
    const cost = sum?.totalCost || 0;
    const profit = sum?.totalProfit !== undefined ? sum.totalProfit : rev - cost;
    const margin =
      sum?.profitMargin !== undefined
        ? sum.profitMargin
        : rev > 0
          ? Number(((profit / rev) * 100).toFixed(1))
          : 0;
    return {
      revenue: rev,
      profit,
      cost,
      margin,
      count: sum?.totalTransactions || 0,
    };
  }, [salesReport]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
      {/* Today's Sales */}
      <Link href="/reports" className="flex flex-col group">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(todaySales.revenue)}
          caption={todaySales.count === 0 ? 'No sales recorded yet' : `${formatNumber(todaySales.count)} completed receipts`}
          icon={DollarSign}
          variant="default"
          isLoading={isLoading}
          className="h-full flex-1"
        />
      </Link>

      {/* Today's Profit */}
      <Link href="/reports" className="flex flex-col group">
        <StatCard
          label="Today's Profit"
          value={formatCurrency(todaySales.profit)}
          caption={
            todaySales.count === 0
              ? 'Net profit after batch cost'
              : `${todaySales.margin.toFixed(1)}% margin • Cost: ${formatCurrency(todaySales.cost)}`
          }
          icon={TrendingUp}
          variant={todaySales.profit >= 0 ? 'default' : 'destructive'}
          isLoading={isLoading}
          className="h-full flex-1"
        />
      </Link>

      {/* Low Stock Alerts */}
      <Link href="/inventory?tab=low_stock" className="flex flex-col group">
        <StatCard
          label="Low Stock"
          value={formatNumber(metrics.lowStockCount)}
          caption={metrics.lowStockCount === 0 ? 'All levels safe' : 'Replenishment needed'}
          icon={AlertTriangle}
          variant={metrics.lowStockCount > 0 ? 'warning' : 'default'}
          isLoading={isLoading}
          className="h-full flex-1"
        />
      </Link>

      {/* Expiring Soon */}
      <Link href="/inventory?tab=expiring" className="flex flex-col group">
        <StatCard
          label="Near Expiry"
          value={formatNumber(metrics.expiringSoonCount)}
          caption={metrics.expiringSoonCount === 0 ? 'Within safe window' : 'Expiring within 180d'}
          icon={Clock}
          variant={metrics.expiringSoonCount > 0 ? 'destructive' : 'default'}
          isLoading={isLoading}
          className="h-full flex-1"
        />
      </Link>

      {/* Active Catalog & Inventory Valuation */}
      <Link href="/inventory" className="col-span-2 sm:col-span-1 flex flex-col group">
        <StatCard
          label="Active Catalog"
          value={formatNumber(metrics.totalProducts)}
          caption={
            metrics.totalPurchaseCost > 0
              ? `Cost val: ${formatCurrency(metrics.totalPurchaseCost)}`
              : `${formatNumber(metrics.stockedCount)} stocked in store`
          }
          icon={PackageCheck}
          variant="default"
          isLoading={isLoading}
          className="h-full flex-1"
        />
      </Link>
    </div>
  );
}
