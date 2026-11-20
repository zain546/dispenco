'use client';

import React, { useMemo } from 'react';
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
import { useInventoryAggregation } from '@/features/inventory/hooks/use-inventory-queries';
import { useStore } from '@/context/store-context';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export function UrgentAttentionPanel() {
  const { activeStoreId, isAllStores, isStoreReady } = useStore();
  const storeIdParam = !isAllStores && activeStoreId ? activeStoreId : undefined;

  const { data: aggData, isLoading: loading } = useInventoryAggregation(
    storeIdParam ? { storeId: storeIdParam } : undefined,
    { enabled: isStoreReady }
  );

  const data = useMemo(() => {
    return {
      lowStockCount: aggData?.summary?.lowStockCount || 0,
      expiringSoonCount: aggData?.summary?.expiringSoonCount || 0,
      outOfStockCount: aggData?.summary?.outOfStockCount || 0,
      totalCatalogItems: aggData?.summary?.totalCatalogItems || 0,
    };
  }, [aggData]);

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
    <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-3 sm:p-4 pb-2.5 sm:pb-3 border-b border-border/70 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-7 rounded-lg bg-muted/80 text-foreground flex items-center justify-center shrink-0 border border-border/60">
            <AlertTriangle className={cn("size-3.5", hasUrgentIssues ? "text-warning" : "text-muted-foreground")} />
          </div>
          <CardTitle className="text-xs sm:text-sm font-semibold text-foreground leading-none truncate">
            Stock Alerts
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("size-1.5 rounded-full", hasUrgentIssues ? "bg-warning" : "bg-success")} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {hasUrgentIssues ? 'Action Required' : 'Optimal'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 divide-y divide-border/50">
        {/* Critical Out of Stock Alert (if any) */}
        {data.outOfStockCount > 0 && (
          <Link
            href="/inventory?tab=unstocked"
            className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-destructive/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="size-2 rounded-full bg-destructive shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-xs text-foreground group-hover:text-destructive transition-colors">
                  {formatNumber(data.outOfStockCount)} Critical Stockout{data.outOfStockCount === 1 ? '' : 's'}
                </p>
                <p className="text-micro text-muted-foreground mt-0.5 truncate">
                  Zero units in store. Restock required.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-destructive/40 text-destructive bg-destructive/5 font-medium">
                Restock
              </Badge>
              <ChevronRight className="size-3 text-muted-foreground group-hover:text-destructive transition-colors" />
            </div>
          </Link>
        )}

        {/* Low Stock Alert */}
        <Link
          href="/inventory?tab=low_stock"
          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn("size-2 rounded-full shrink-0", data.lowStockCount > 0 ? "bg-warning" : "bg-muted-foreground/30")} />
            <div className="min-w-0">
              <p className="font-medium text-xs text-foreground group-hover:text-foreground transition-colors">
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
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/40 text-warning bg-warning/5 font-medium">
                {data.lowStockCount}
              </Badge>
            ) : (
              <span className="text-micro text-muted-foreground">Safe</span>
            )}
            <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>

        {/* Expiring Soon Alert */}
        <Link
          href="/inventory?tab=expiring"
          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn("size-2 rounded-full shrink-0", data.expiringSoonCount > 0 ? "bg-primary/80" : "bg-muted-foreground/30")} />
            <div className="min-w-0">
              <p className="font-medium text-xs text-foreground group-hover:text-foreground transition-colors">
                {data.expiringSoonCount === 0
                  ? 'No near-expiry inventory'
                  : `${formatNumber(data.expiringSoonCount)} ${data.expiringSoonCount === 1 ? 'Batch' : 'Batches'} Expiring Soon`}
              </p>
              <p className="text-micro text-muted-foreground mt-0.5 truncate">
                {data.expiringSoonCount === 0
                  ? 'All batches are within safe expiry dates'
                  : 'Sell these expiring batches first'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.expiringSoonCount > 0 ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary bg-primary/5 font-medium">
                {data.expiringSoonCount}
              </Badge>
            ) : (
              <span className="text-micro text-muted-foreground">Optimal</span>
            )}
            <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
