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
      <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`size-4 ${hasUrgentIssues ? 'text-warning' : 'text-success'}`}
          />
          <CardTitle className="text-sm font-bold text-foreground">
            Inventory Risk & Expiry Alerts
          </CardTitle>
        </div>
        <Badge
          variant={hasUrgentIssues ? 'warning' : 'success'}
          className="text-micro font-medium"
        >
          {hasUrgentIssues ? 'Action Required' : 'Optimal'}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-2.5 flex-1">
        {/* Critical Out of Stock Alert (if any) */}
        {data.outOfStockCount > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-2 transition-all">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-md bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-destructive">
                  {formatNumber(data.outOfStockCount)} Critical Stockout{data.outOfStockCount === 1 ? '' : 's'}
                </p>
                <p className="text-micro text-destructive/80 mt-0.5 truncate">
                  Zero units in stock. Patients cannot be dispensed these medicines.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="destructive" className="h-7 text-xs px-2.5 shrink-0 gap-1 font-medium">
              <Link href="/inventory?tab=unstocked">
                <span>Restock</span>
                <ChevronRight className="size-3" />
              </Link>
            </Button>
          </div>
        )}

        {/* Low Stock Alert */}
        <div className="p-3 rounded-lg bg-card border border-border/70 flex items-center justify-between gap-2 hover:border-warning/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-md bg-warning/15 text-warning flex items-center justify-center shrink-0">
              <TrendingDown className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-foreground">
                {data.lowStockCount === 0
                  ? 'All items stocked safely'
                  : `${formatNumber(data.lowStockCount)} Item${data.lowStockCount === 1 ? '' : 's'} Below Threshold`}
              </p>
              <p className="text-micro text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {data.lowStockCount === 0
                  ? 'No critical stockouts or low inventory detected in this branch.'
                  : 'Fast-depleting catalog items requiring inventory replenishment.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5 shrink-0 gap-1 font-medium">
            <Link href="/inventory?tab=low_stock">
              <span>Inspect</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>

        {/* Expiring Soon Alert */}
        <div className="p-3 rounded-lg bg-card border border-border/70 flex items-center justify-between gap-2 hover:border-primary/50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-foreground">
                {data.expiringSoonCount === 0
                  ? 'No near-expiry inventory'
                  : `${formatNumber(data.expiringSoonCount)} Batch Lot${data.expiringSoonCount === 1 ? '' : 's'} Expiring Soon`}
              </p>
              <p className="text-micro text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {data.expiringSoonCount === 0
                  ? 'All stock batches expire well beyond the alert threshold.'
                  : 'Prioritize via FEFO counter dispensing or supplier return.'}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5 shrink-0 gap-1 font-medium">
            <Link href="/inventory?tab=expiring">
              <span>View FEFO</span>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>

        {/* Clean System Banner when everything is optimal */}
        {!hasUrgentIssues && (
          <div className="p-2.5 rounded-lg bg-success/5 border border-success/20 flex items-center gap-2 text-micro text-success">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Branch stock health is optimal. FEFO rotation rules active.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
