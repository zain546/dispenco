'use client';

import React, { useState, useEffect } from 'react';
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

export function DashboardMetrics() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
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
      <Card className="relative overflow-hidden border-border/60 hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                <span>0</span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-normal">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>All inventory stock levels optimal</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Widget */}
      <Card className="relative overflow-hidden border-border/60 hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                0
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                <span>No batches expiring within 90 days</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Active Catalog Widget */}
      <Card className="relative overflow-hidden border-border/60 hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                0
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <TrendingUp className="size-3.5 text-primary shrink-0" />
                <span>0 medicines in store catalog</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
