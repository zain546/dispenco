'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryAggregation } from '@/features/inventory/hooks/use-inventory-queries';
import { useStore } from '@/context/store-context';
import { formatNumber } from '@/lib/format';
import { Boxes, ArrowRight, X } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'dispenco_dismiss_catalog_readiness_widget';

export function CatalogCompletionWidget() {
  const [dismissed, setDismissed] = useState(false);
  const { activeStoreId, isAllStores, isStoreReady } = useStore();
  const storeIdParam = !isAllStores && activeStoreId ? activeStoreId : undefined;

  useEffect(() => {
    // Check if previously dismissed by the user
    try {
      if (localStorage.getItem(DISMISS_STORAGE_KEY) === 'true') {
        setDismissed(true);
      }
    } catch {
      // ignore localStorage errors in private browsing
    }
  }, []);

  const { data, isLoading: loading } = useInventoryAggregation(
    storeIdParam ? { storeId: storeIdParam } : undefined,
    { enabled: isStoreReady && !dismissed }
  );

  const stats = useMemo(() => {
    if (!data?.summary) return null;
    return {
      totalCatalogItems: data.summary.totalCatalogItems || 0,
      stockedCount: data.summary.stockedCount || 0,
      unstockedCount: data.summary.unstockedCount || 0,
      priorityUnstockedCount: data.summary.priorityUnstockedCount || 0,
      completionPercentage: data.summary.completionPercentage || 0,
    };
  }, [data]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  if (loading) {
    return (
      <Card className="border-border/60 shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Auto-hide when store catalog is 100% stocked or empty
  if (!stats || stats.totalCatalogItems === 0 || stats.unstockedCount === 0) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-3 sm:p-4 pb-2.5 sm:pb-3 flex flex-row items-center justify-between gap-2 border-b border-border/70">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-7 rounded-lg bg-muted/80 text-foreground flex items-center justify-center shrink-0 border border-border/60">
            <Boxes className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-xs sm:text-sm font-semibold text-foreground leading-none truncate">
              Catalog Readiness
            </CardTitle>
            <p className="text-micro text-muted-foreground mt-0.5 truncate">
              {formatNumber(stats.stockedCount)} of {formatNumber(stats.totalCatalogItems)} active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[11px] font-semibold tabular-nums text-foreground border-border/60 px-1.5 py-0">
            {stats.completionPercentage}%
          </Badge>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
            title="Dismiss widget"
            aria-label="Dismiss widget"
          >
            <X className="size-3" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Sleek Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={stats.completionPercentage} className="h-1 bg-muted/60" />
          <div className="flex items-center justify-between text-micro text-muted-foreground">
            <span>{formatNumber(stats.unstockedCount)} pending intake</span>
            <span className="font-medium text-foreground">{stats.completionPercentage}% stocked</span>
          </div>
        </div>

        {/* Clean full-width action button */}
        <Button asChild variant="outline" size="sm" className="w-full h-8.5 text-xs font-medium justify-between group border-border/60 hover:bg-muted/30">
          <Link href="/inventory?tab=unstocked">
            <span>Receive Missing Stock ({formatNumber(stats.unstockedCount)})</span>
            <ArrowRight className="size-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
