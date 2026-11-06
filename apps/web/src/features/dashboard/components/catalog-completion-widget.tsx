'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { productsApi } from '@/features/inventory/services/products-api';
import { formatNumber } from '@/lib/format';
import { Boxes, ArrowRight, X } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'dispenco_dismiss_catalog_readiness_widget';

export function CatalogCompletionWidget() {
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [stats, setStats] = useState<{
    totalCatalogItems: number;
    stockedCount: number;
    unstockedCount: number;
    completionPercentage: number;
  } | null>(null);

  useEffect(() => {
    // Check if previously dismissed by the user
    try {
      if (localStorage.getItem(DISMISS_STORAGE_KEY) === 'true') {
        setDismissed(true);
        setLoading(false);
        return;
      }
    } catch {
      // ignore localStorage errors in private browsing
    }

    async function loadStats() {
      try {
        setLoading(true);
        const data = await productsApi.getInventoryAggregation();
        if (data && data.summary) {
          setStats({
            totalCatalogItems: data.summary.totalCatalogItems || 0,
            stockedCount: data.summary.stockedCount || 0,
            unstockedCount: data.summary.unstockedCount || 0,
            completionPercentage: data.summary.completionPercentage || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load catalog completion stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

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
    <Card className="border-border/70 shadow-2xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 pb-3 flex flex-row items-center justify-between gap-2 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Boxes className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground leading-none truncate">
              Catalog Readiness
            </CardTitle>
            <p className="text-micro text-muted-foreground mt-1 truncate">
              {formatNumber(stats.stockedCount)} of {formatNumber(stats.totalCatalogItems)} medicines active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-micro font-semibold tabular-nums text-foreground">
            {stats.completionPercentage}%
          </Badge>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Dismiss widget"
            aria-label="Dismiss widget"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Sleek Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={stats.completionPercentage} className="h-1.5" />
          <div className="flex items-center justify-between text-micro text-muted-foreground">
            <span>{formatNumber(stats.unstockedCount)} pending stock intake</span>
            <span className="font-medium text-foreground">{stats.completionPercentage}% stocked</span>
          </div>
        </div>

        {/* Clean full-width action button */}
        <Button asChild variant="outline" size="sm" className="w-full h-8 text-xs font-medium justify-between group">
          <Link href="/inventory?tab=unstocked">
            <span>Receive Missing Stock ({formatNumber(stats.unstockedCount)})</span>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
