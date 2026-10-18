'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { productsApi } from '@/features/inventory/services/products-api';
import { reportsApi } from '@/features/reports/services/reports-api';
import { useStore } from '@/context/store-context';
import { formatCurrency, formatNumber } from '@/lib/format';

export function DashboardMetrics() {
  const { activeStoreId, isAllStores } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [todaySales, setTodaySales] = useState({ revenue: 0, count: 0 });
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    stockedCount: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        setIsLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];

        const [aggRes, salesRes] = await Promise.allSettled([
          productsApi.getInventoryAggregation(
            !isAllStores && activeStoreId ? { storeId: activeStoreId } : undefined
          ),
          reportsApi.getSalesReport({
            startDate: todayStr,
            endDate: todayStr,
            groupBy: 'day',
            ...(!isAllStores && activeStoreId ? { storeId: activeStoreId } : {}),
          }),
        ]);

        if (aggRes.status === 'fulfilled' && aggRes.value?.summary) {
          const s = aggRes.value.summary;
          setMetrics({
            totalProducts: s.totalCatalogItems || 0,
            stockedCount: s.stockedCount || 0,
            lowStockCount: s.lowStockCount || 0,
            expiringSoonCount: s.expiringSoonCount || 0,
          });
        }

        if (salesRes.status === 'fulfilled' && salesRes.value?.success && salesRes.value.data?.summary) {
          const sum = salesRes.value.data.summary;
          setTodaySales({
            revenue: sum.totalRevenue || 0,
            count: sum.totalTransactions || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [activeStoreId, isAllStores]);

  return (
    <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Today's Sales */}
      <Link href="/reports" className="shrink-0 w-[78vw] max-w-[280px] sm:w-auto sm:max-w-none snap-start block group">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(todaySales.revenue)}
          caption={todaySales.count === 0 ? 'No completed sales today yet' : `${formatNumber(todaySales.count)} completed receipts`}
          icon={DollarSign}
          variant="success"
          isLoading={isLoading}
          className="group-hover:border-success/50 transition-colors h-full"
        />
      </Link>

      {/* Low Stock Alerts */}
      <Link href="/inventory?tab=low_stock" className="shrink-0 w-[78vw] max-w-[280px] sm:w-auto sm:max-w-none snap-start block group">
        <StatCard
          label="Low Stock Alerts"
          value={formatNumber(metrics.lowStockCount)}
          caption={metrics.lowStockCount === 0 ? 'All inventory stock levels optimal' : 'Items requiring replenishment'}
          icon={AlertTriangle}
          variant={metrics.lowStockCount > 0 ? 'warning' : 'default'}
          isLoading={isLoading}
          className="group-hover:border-warning/50 transition-colors h-full"
        />
      </Link>

      {/* Expiring Soon */}
      <Link href="/inventory?tab=expiring" className="shrink-0 w-[78vw] max-w-[280px] sm:w-auto sm:max-w-none snap-start block group">
        <StatCard
          label="Expiring Batches"
          value={formatNumber(metrics.expiringSoonCount)}
          caption={metrics.expiringSoonCount === 0 ? 'No batches expiring within 180d' : 'Batches expiring within window'}
          icon={Clock}
          variant={metrics.expiringSoonCount > 0 ? 'destructive' : 'default'}
          isLoading={isLoading}
          className="group-hover:border-destructive/50 transition-colors h-full"
        />
      </Link>

      {/* Active Catalog */}
      <Link href="/inventory" className="shrink-0 w-[78vw] max-w-[280px] sm:w-auto sm:max-w-none snap-start block group">
        <StatCard
          label="Active Catalog"
          value={formatNumber(metrics.totalProducts)}
          caption={metrics.totalProducts === 0 ? 'No products registered' : `${formatNumber(metrics.stockedCount)} live products in store`}
          icon={PackageCheck}
          variant="default"
          isLoading={isLoading}
          className="group-hover:border-primary/50 transition-colors h-full"
        />
      </Link>
    </div>
  );
}
