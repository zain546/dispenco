'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { productsApi } from '@/features/inventory/services/products-api';
import { Sparkles, ArrowRight, PackagePlus, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export function CatalogCompletionWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalCatalogItems: number;
    stockedCount: number;
    unstockedCount: number;
    priorityUnstockedCount: number;
    completionPercentage: number;
  } | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await productsApi.getInventoryAggregation();
        if (data && data.summary) {
          setStats({
            totalCatalogItems: data.summary.totalCatalogItems || 0,
            stockedCount: data.summary.stockedCount || 0,
            unstockedCount: data.summary.unstockedCount || 0,
            priorityUnstockedCount: data.summary.priorityUnstockedCount || 0,
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

  if (loading) {
    return (
      <Card className="border-border/60 shadow-2xs">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalCatalogItems === 0) {
    return null; // Dashboard empty state handles 0 catalog items
  }

  const isFullyStocked = stats.unstockedCount === 0;

  return (
    <Card className={`border-border/60 shadow-2xs overflow-hidden ${isFullyStocked ? 'bg-gradient-to-r from-emerald-500/5 via-card to-card border-emerald-500/30' : 'bg-gradient-to-r from-amber-500/5 via-card to-card border-amber-500/30'}`}>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className={`size-4 ${isFullyStocked ? 'text-emerald-500' : 'text-amber-500'}`} />
            <CardTitle className="text-base font-semibold text-foreground">
              Inventory Onboarding & Catalog Readiness
            </CardTitle>
            <Badge variant={isFullyStocked ? 'secondary' : 'outline'} className={isFullyStocked ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold' : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-semibold'}>
              {stats.completionPercentage}% Stocked
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {isFullyStocked
              ? 'Great job! All products in your store catalog have active stock batches.'
              : `${stats.unstockedCount} of ${stats.totalCatalogItems} catalog medicines are pending stock batch intake.`}
          </CardDescription>
        </div>

        {stats.unstockedCount > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {stats.priorityUnstockedCount > 0 && (
              <Button asChild variant="default" size="sm" className="h-8 text-xs font-medium gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                <Link href="/inventory?tab=unstocked&priorityOnly=true">
                  <Zap className="size-3.5" />
                  Stock {stats.priorityUnstockedCount} Priority Items First
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
              <Link href="/inventory?tab=unstocked">
                <PackagePlus className="size-3.5 text-primary" />
                Complete Catalog ({stats.unstockedCount})
              </Link>
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground flex items-center gap-1.5">
              {isFullyStocked ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" /> Catalog Readiness Score
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5 text-amber-500" /> Store Readiness Progress ({stats.stockedCount} / {stats.totalCatalogItems} Products Live)
                </>
              )}
            </span>
            <span className="font-bold text-foreground">{stats.completionPercentage}%</span>
          </div>
          <Progress value={stats.completionPercentage} className="h-2" />
        </div>

        {!isFullyStocked && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/50">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">
                ⚡ Pro-tip: Prioritize fast-moving items first
              </p>
              <p className="text-muted-foreground text-[11px]">
                You can receive stock shipments for individual unstocked products or create purchase orders to populate remaining inventory.
              </p>
            </div>
            <Link
              href="/inventory?tab=unstocked"
              className="text-primary hover:underline font-semibold flex items-center gap-1 text-xs shrink-0"
            >
              Start guided setup <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
