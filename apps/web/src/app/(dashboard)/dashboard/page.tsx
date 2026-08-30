'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  PackageCheck,
  Plus,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulated widget loading state to demonstrate shadcn Skeleton
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pharmacy Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time daily metrics, inventory alerts, and quick POS access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/inventory">
              <Plus className="size-4" />
              <span>Add Product</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/pos">
              <ShoppingCart className="size-4" />
              <span>Open POS</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Widgets Row (4 Core Metrics) */}
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

      {/* Designed Empty State Banner */}
      <Card className="border-dashed bg-card/60">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <ShoppingCart className="size-6" />
          </div>
          <CardTitle className="text-lg">Welcome to Your Pharmacy Workspace</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Your store is set up and ready! Start by populating your product catalog or launching the POS counter for sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-center gap-3 pt-0">
          <Button asChild size="sm" variant="outline" className="gap-2">
            <Link href="/inventory">
              <Plus className="size-4" />
              <span>Add Medicine Product</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/pos">
              <ShoppingCart className="size-4" />
              <span>Launch POS Counter</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
