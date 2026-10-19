'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Receipt,
  RefreshCw,
  ArrowRight,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { useStore } from '@/context/store-context';
import { formatCurrency } from '@/lib/format';

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPaymentBadge(method: string) {
  const m = method.toUpperCase();
  if (m === 'DIGITAL') {
    return (
      <Badge variant="outline" className="text-micro font-medium gap-1 border-primary/30 text-primary bg-primary/5">
        <Smartphone className="size-2.5" />
        Digital
      </Badge>
    );
  }
  if (m === 'CREDIT') {
    return (
      <Badge variant="outline" className="text-micro font-medium gap-1 border-warning/30 text-warning bg-warning/5">
        <CreditCard className="size-2.5" />
        Khata
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-micro font-medium gap-1">
      <Banknote className="size-2.5 text-muted-foreground" />
      Cash
    </Badge>
  );
}

export function RecentSalesWidget() {
  const { activeStoreId, isAllStores } = useStore();
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSales = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await salesApi.getRecentSales(
        6,
        !isAllStores && activeStoreId ? activeStoreId : undefined
      );
      if (res?.success && Array.isArray(res.data)) {
        setSales(res.data);
      } else {
        setSales([]);
      }
    } catch (err) {
      console.error('Failed to load recent sales:', err);
      setSales([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeStoreId, isAllStores]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return (
    <Card className="border-border/70 shadow-2xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Receipt className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold text-foreground leading-none truncate">
              Recent Sales
            </CardTitle>
            <p className="text-micro text-muted-foreground mt-1 truncate">
              Live shift transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fetchSales(true)}
            disabled={isRefreshing || isLoading}
            className="size-8 text-muted-foreground hover:text-foreground rounded-lg"
            title="Refresh recent sales feed"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs px-2.5 font-medium gap-1 shadow-2xs">
            <Link href="/reports">
              <span>View All</span>
              <ArrowRight className="size-3 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <ShoppingCart className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">No Transactions Yet</p>
              <p className="text-micro text-muted-foreground max-w-xs mx-auto">
                No counter sales have been recorded for this store branch today.
              </p>
            </div>
            <Button asChild size="sm" className="h-8 text-xs font-medium gap-1.5 shadow-2xs">
              <Link href="/pos">
                <ShoppingCart className="size-3.5" />
                <span>Open POS Counter</span>
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Touch Card List (< sm) */}
            <div className="block sm:hidden divide-y divide-border/40">
              {sales.map((s) => (
                <Link
                  key={s.id}
                  href={`/pos/receipt/${s.id}`}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors group"
                >
                  <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20">
                    {s.customerName ? s.customerName.charAt(0).toUpperCase() : <Receipt className="size-4" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground truncate max-w-[130px]">
                        {s.customerName || 'Walk-in'}
                      </span>
                      {getPaymentBadge(s.paymentMethod || 'CASH')}
                    </div>
                    <p className="text-micro text-muted-foreground truncate font-mono">
                      {s.receiptNumber} • {formatRelativeTime(s.createdAt)}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {formatCurrency(s.totalAmount)}
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Full Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30 text-muted-foreground font-semibold text-micro uppercase tracking-wider">
                    <th className="py-2.5 px-4">Receipt</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-xs text-foreground whitespace-nowrap">
                        <Link
                          href={`/pos/receipt/${s.id}`}
                          className="hover:text-primary transition-colors hover:underline"
                          title="View printable receipt"
                        >
                          {s.receiptNumber}
                        </Link>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-32 font-medium text-foreground">
                            {s.customerName || 'Walk-in'}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {getPaymentBadge(s.paymentMethod || 'CASH')}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground text-micro whitespace-nowrap">
                        {formatRelativeTime(s.createdAt)}
                      </td>

                      <td className="py-2.5 px-4 text-right font-bold text-foreground tabular-nums">
                        {formatCurrency(s.totalAmount)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-primary"
                          title="View receipt"
                        >
                          <Link href={`/pos/receipt/${s.id}`}>
                            <ExternalLink className="size-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
