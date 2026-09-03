'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  PackageCheck,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { productsApi } from '@/features/inventory/services/products-api';

export function DashboardMetrics() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        setIsLoading(true);
        const res = await productsApi.getProducts();
        if (res) {
          const products = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          
          let lowStock = 0;
          let expiringSoon = 0;

          products.forEach((p: any) => {
            if (p.isLowStock || (p.totalStock !== undefined && p.totalStock <= (p.lowStockThreshold || 0))) {
              lowStock++;
            }
            if (p.nearExpiryBatchCount && p.nearExpiryBatchCount > 0) {
              expiringSoon += p.nearExpiryBatchCount;
            }
          });

          setMetrics({
            totalProducts: products.length,
            lowStockCount: lowStock,
            expiringSoonCount: expiringSoon,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today's Sales Widget */}
      <Card className="relative overflow-hidden border-border/60 hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Sales
          </CardTitle>
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground">
                PKR 0.00
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                  0 Sales
                </Badge>
                <span>No completed sales today yet</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts Widget */}
      <Link href="/inventory?tab=low_stock" className="block group">
        <Card className="relative overflow-hidden border-border/60 group-hover:border-amber-500/50 group-hover:shadow-xs transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
              Low Stock Alerts
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <span>{metrics.lowStockCount}</span>
                  {metrics.lowStockCount === 0 ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-normal">
                      Healthy
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      Requires Action
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  {metrics.lowStockCount === 0 ? (
                    <>
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      <span>All inventory stock levels optimal</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                      <span>Items requiring stock replenishment</span>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Expiring Soon Widget */}
      <Link href="/inventory?tab=expiring" className="block group">
        <Card className="relative overflow-hidden border-border/60 group-hover:border-destructive/50 group-hover:shadow-xs transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
              Expiring Soon
            </CardTitle>
            <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.expiringSoonCount}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  {metrics.expiringSoonCount === 0 ? (
                    <>
                      <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                      <span>No batches expiring within 90 days</span>
                    </>
                  ) : (
                    <>
                      <Clock className="size-3.5 text-destructive shrink-0" />
                      <span>Batches expiring within alert window</span>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Active Catalog Widget */}
      <Link href="/inventory" className="block group">
        <Card className="relative overflow-hidden border-border/60 group-hover:border-primary/50 group-hover:shadow-xs transition-all cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
              Active Catalog
            </CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <PackageCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalProducts}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary shrink-0" />
                  <span>{metrics.totalProducts} medicines in store catalog</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
