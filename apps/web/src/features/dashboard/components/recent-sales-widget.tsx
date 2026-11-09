'use client';

import React, { useState } from 'react';
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
  FileDown,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { useRecentSales } from '@/features/sales/hooks/use-sales-queries';
import { downloadThermalReceiptPdf } from '@/features/sales/utils/invoice-pdf-generator';
import { useStore } from '@/context/store-context';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

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
  const { activeStoreId, isAllStores, isStoreReady } = useStore();
  const storeIdParam = !isAllStores && activeStoreId ? activeStoreId : undefined;
  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(null);

  const { data: recentRes, isLoading, isFetching, refetch } = useRecentSales(storeIdParam, 6, {
    enabled: isStoreReady,
  });

  const sales: SaleResponse[] = recentRes?.data || [];
  const isRefreshing = isFetching && !isLoading;

  const handleDownloadReceipt = async (saleId: string) => {
    try {
      setDownloadingSaleId(saleId);
      toast.loading('Fetching receipt details...', { id: `dash-download-${saleId}` });
      const res = await salesApi.getSaleById(saleId);
      if (res?.success && res.sale) {
        toast.loading('Generating receipt PDF...', { id: `dash-download-${saleId}` });
        await downloadThermalReceiptPdf(res.sale, res.sale.store?.name);
        toast.success(`Receipt #${res.sale.receiptNumber} downloaded!`, { id: `dash-download-${saleId}` });
      } else {
        toast.error('Could not load receipt data', { id: `dash-download-${saleId}` });
      }
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast.error('Failed to download receipt PDF', { id: `dash-download-${saleId}` });
    } finally {
      setDownloadingSaleId(null);
    }
  };

  return (
    <Card className="border-border/70 shadow-2xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Receipt className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold text-foreground leading-none truncate">
            Recent Sales
          </CardTitle>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefreshing || isLoading}
            className="size-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
            title="Refresh recent sales feed"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs px-2.5 font-medium gap-1 shadow-2xs cursor-pointer">
            <Link href="/reports?tab=receipts#sales-receipts-section">
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
              {sales.map((s) => {
                const compactReceipt = s.receiptNumber?.replace(/^REC-\d{8}-/, '#') || s.receiptNumber;

                return (
                  <div
                    key={s.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <Link
                      href={`/pos/receipt/${s.id}`}
                      className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20"
                    >
                      {s.customerName ? s.customerName.charAt(0).toUpperCase() : <Receipt className="size-4" />}
                    </Link>

                    <Link href={`/pos/receipt/${s.id}`} className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[130px]">
                          {s.customerName || 'Walk-in'}
                        </span>
                        {getPaymentBadge(s.paymentMethod || 'CASH')}
                      </div>
                      <p className="text-micro text-muted-foreground truncate font-mono">
                        {compactReceipt} • {formatRelativeTime(s.createdAt)}
                      </p>
                    </Link>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {formatCurrency(s.totalAmount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadReceipt(s.id)}
                        disabled={downloadingSaleId === s.id}
                        className="size-7 text-muted-foreground hover:text-primary rounded-md cursor-pointer"
                        title="Download receipt PDF"
                      >
                        {downloadingSaleId === s.id ? (
                          <Loader2 className="size-3 animate-spin text-primary" />
                        ) : (
                          <FileDown className="size-3" />
                        )}
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground rounded-md"
                        title="View receipt"
                      >
                        <Link href={`/pos/receipt/${s.id}`}>
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                    <th className="py-2.5 px-4 text-right">Action</th>
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

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReceipt(s.id)}
                            disabled={downloadingSaleId === s.id}
                            className="size-7 text-muted-foreground hover:text-primary rounded-md cursor-pointer"
                            title="Download receipt PDF"
                          >
                            {downloadingSaleId === s.id ? (
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                            ) : (
                              <FileDown className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                            title="View receipt"
                          >
                            <Link href={`/pos/receipt/${s.id}`}>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
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
