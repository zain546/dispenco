'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { productsApi } from '@/features/inventory/services/products-api';
import { useStore } from '@/context/store-context';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UrgentAttentionPanel() {
  const { activeStoreId, isAllStores } = useStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    lowStockCount: number;
    expiringSoonCount: number;
    outOfStockCount: number;
    totalCatalogItems: number;
  }>({
    lowStockCount: 0,
    expiringSoonCount: 0,
    outOfStockCount: 0,
    totalCatalogItems: 0,
  });

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        const res = await productsApi.getInventoryAggregation(
          !isAllStores && activeStoreId ? { storeId: activeStoreId } : undefined
        );
        if (res?.summary) {
          setData({
            lowStockCount: res.summary.lowStockCount || 0,
            expiringSoonCount: res.summary.expiringSoonCount || 0,
            outOfStockCount: res.summary.outOfStockCount || 0,
            totalCatalogItems: res.summary.totalCatalogItems || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load urgent attention metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [activeStoreId, isAllStores]);

  if (loading) {
    return (
      <Card className="border-border/70 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasUrgentIssues =
    data.outOfStockCount > 0 || data.lowStockCount > 0 || data.expiringSoonCount > 0;

  return (
    <Card className="border-border/70 shadow-2xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "size-8 rounded-lg flex items-center justify-center shrink-0",
            hasUrgentIssues ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
          )}>
            <AlertTriangle className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold text-foreground leading-none truncate">
            Stock Alerts
          </CardTitle>
        </div>
        <Badge
          variant={hasUrgentIssues ? 'warning' : 'success'}
          className="text-micro font-medium shrink-0"
        >
          {hasUrgentIssues ? 'Action Required' : 'Optimal'}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 flex-1 divide-y divide-border/40">
        {/* Critical Out of Stock Alert (if any) */}
        {data.outOfStockCount > 0 && (
          <Link
            href="/inventory?tab=unstocked"
            className="p-3.5 flex items-center justify-between gap-3 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-destructive">
                  {formatNumber(data.outOfStockCount)} Critical Stockout{data.outOfStockCount === 1 ? '' : 's'}
                </p>
                <p className="text-micro text-destructive/80 mt-0.5 truncate">
                  Zero units in store. Restock required.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="destructive" className="text-micro px-2 py-0.5 font-bold">
                Restock
              </Badge>
              <ChevronRight className="size-3.5 text-destructive/60 group-hover:text-destructive transition-colors" />
            </div>
          </Link>
        )}

        {/* Low Stock Alert */}
        <Link
          href="/inventory?tab=low_stock"
          className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "size-9 rounded-xl flex items-center justify-center shrink-0",
              data.lowStockCount > 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
            )}>
              <TrendingDown className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                {data.lowStockCount === 0
                  ? 'All items stocked safely'
                  : `${formatNumber(data.lowStockCount)} Item${data.lowStockCount === 1 ? '' : 's'} Below Threshold`}
              </p>
              <p className="text-micro text-muted-foreground mt-0.5 truncate">
                {data.lowStockCount === 0
                  ? 'All stock levels healthy'
                  : 'Fast-depleting items requiring replenishment'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.lowStockCount > 0 ? (
              <Badge variant="warning" className="text-micro px-1.5 py-0.5 font-bold">
                {data.lowStockCount}
              </Badge>
            ) : (
              <span className="text-micro text-muted-foreground">Safe</span>
            )}
            <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          </div>
        </Link>

        {/* Expiring Soon Alert */}
        <Link
          href="/inventory?tab=expiring"
          className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "size-9 rounded-xl flex items-center justify-center shrink-0",
              data.expiringSoonCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Clock className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                {data.expiringSoonCount === 0
                  ? 'No near-expiry inventory'
                  : `${formatNumber(data.expiringSoonCount)} Lots Expiring Soon`}
              </p>
              <p className="text-micro text-muted-foreground mt-0.5 truncate">
                {data.expiringSoonCount === 0
                  ? 'Batches expire well beyond alert window'
                  : 'Prioritize via FEFO dispensing'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.expiringSoonCount > 0 ? (
              <Badge variant="secondary" className="text-micro px-1.5 py-0.5 font-bold">
                {data.expiringSoonCount}
              </Badge>
            ) : (
              <span className="text-micro text-muted-foreground">Optimal</span>
            )}
            <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
