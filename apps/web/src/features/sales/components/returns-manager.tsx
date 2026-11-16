'use client';

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Calendar,
  DollarSign,
  Package,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/context/store-context';
import {
  ReturnRecord,
  QueryReturnsParams,
} from '../services/sales-api';
import { useReturns } from '../hooks/use-sales-queries';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { CreateReturnModal } from './create-return-modal';
import { ReturnSlipModal } from './return-slip-modal';

export function ReturnsManager() {
  const { activeStore, isAllStores } = useStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReturnForSlip, setSelectedReturnForSlip] = useState<ReturnRecord | null>(null);

  const queryParams: QueryReturnsParams = useMemo(
    () => ({
      page,
      limit: 15,
      storeId: !isAllStores && activeStore?.id ? activeStore.id : undefined,
      search: search.trim() || undefined,
      refundMethod: methodFilter !== 'ALL' ? methodFilter : undefined,
    }),
    [page, isAllStores, activeStore?.id, search, methodFilter],
  );

  const { data: returnsData, isLoading, refetch } = useReturns(queryParams);

  const returns = returnsData?.data || [];
  const summary = returnsData?.summary || null;
  const totalCount = returnsData?.meta?.total || 0;
  const totalPages = returnsData?.meta?.totalPages || 1;

  // Handle Return Processed callback
  const handleReturnCreated = (newReturn: ReturnRecord) => {
    refetch();
    setSelectedReturnForSlip(newReturn);
  };

  // Compute store-wide stats (with page fallback if backend summary is absent)
  const totalReturnsMetric = summary?.totalReturns ?? totalCount;
  const totalRefundValue =
    summary?.totalRefundAmount ??
    returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);
  const totalUnitsRestocked =
    summary?.totalUnitsRestocked ??
    returns.reduce(
      (sum, r) => sum + r.returnItems.reduce((acc, ri) => acc + ri.quantity, 0),
      0,
    );
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReturnsCount =
    summary?.todayReturnsCount ??
    returns.filter((r) => r.createdAt.slice(0, 10) === todayStr).length;

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="size-6 text-primary" />
            <span>Returns & Customer Refunds</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process itemized medicine returns, restore batch inventory, adjust credit ledgers, and print return slips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="size-4" />
            <span>Process Return</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Returns"
          value={totalReturnsMetric}
          caption="Logged returns across ledger"
          icon={RotateCcw}
          variant="default"
        />
        <StatCard
          title="Total Refunded"
          value={formatCurrency(totalRefundValue)}
          caption="Returned funds & credit adjustments"
          icon={DollarSign}
          variant="destructive"
        />
        <StatCard
          title="Restocked Units"
          value={totalUnitsRestocked}
          caption="Medicine packages returned to batches"
          icon={Package}
          variant="success"
        />
        <StatCard
          title="Today's Returns"
          value={todayReturnsCount}
          caption="Returns processed today"
          icon={Calendar}
          variant="default"
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 rounded-xl border border-border/80 bg-card shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by Return #, Receipt #, Customer, or Reason..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <Select
            value={methodFilter}
            onValueChange={(val) => {
              setMethodFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background">
              <SelectValue placeholder="All Refund Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Refund Methods
              </SelectItem>
              <SelectItem value="CASH" className="text-xs">
                Cash Refunds
              </SelectItem>
              <SelectItem value="CREDIT" className="text-xs">
                Khata / Credit Adjustments
              </SelectItem>
              <SelectItem value="DIGITAL" className="text-xs">
                Digital Reversals
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end shrink-0">
          <span>
            Showing <strong className="text-foreground tabular-nums">{returns.length}</strong> of{' '}
            <strong className="text-foreground tabular-nums">{totalCount}</strong> records
          </span>
        </div>
      </div>

      {/* Main Returns Table / List */}
      <div className="border border-border/80 rounded-xl bg-card shadow-2xs overflow-hidden">
        {isLoading && returns.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">Loading returns ledger...</span>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={RotateCcw}
              title="No Sales Returns Recorded"
              description={
                search
                  ? `No returns matched your search "${search}". Try adjusting your query.`
                  : 'Customer medicine returns and stock replenishment will appear here once processed.'
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="text-xs gap-1.5 font-medium cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Process First Return</span>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Return & Date</th>
                  <th className="py-3 px-4 text-left font-semibold">Original Receipt</th>
                  <th className="py-3 px-4 text-left font-semibold">Customer</th>
                  <th className="py-3 px-4 text-left font-semibold">Returned Medicines</th>
                  <th className="py-3 px-4 text-right font-semibold">Refund Amount</th>
                  <th className="py-3 px-4 text-center font-semibold">Method</th>
                  <th className="py-3 px-4 text-left font-semibold">Reason</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {returns.map((ret) => {
                  const units = ret.returnItems.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr key={ret.id} className="hover:bg-muted/20 transition-colors">
                      {/* Return Number & Date */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-foreground block">
                          #{ret.returnNumber || 'RET-RECORD'}
                        </span>
                        <span className="text-micro text-muted-foreground">
                          {formatDateTime(ret.createdAt)}
                        </span>
                      </td>

                      {/* Original Receipt */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-semibold text-primary">
                          #{ret.sale.receiptNumber}
                        </span>
                        {ret.sale.store && (
                          <span className="text-micro text-muted-foreground block truncate max-w-[120px]">
                            {ret.sale.store.name}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground block">
                          {ret.sale.customer?.name || 'Walk-in Customer'}
                        </span>
                        {ret.sale.customer?.phone && (
                          <span className="text-micro text-muted-foreground">
                            {ret.sale.customer.phone}
                          </span>
                        )}
                      </td>

                      {/* Returned Medicines */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground text-micro">
                            {units} Units ({ret.returnItems.length} items)
                          </span>
                          <p className="text-micro text-muted-foreground truncate">
                            {ret.returnItems
                              .map(
                                (i) =>
                                  `${i.saleItem.product?.name || 'Medicine'} (${i.quantity})`,
                              )
                              .join(', ')}
                          </p>
                        </div>
                      </td>

                      {/* Refund Amount */}
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-foreground whitespace-nowrap">
                        {formatCurrency(Number(ret.refundAmount))}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-micro font-semibold uppercase ${
                            ret.refundMethod === 'CREDIT'
                              ? 'bg-warning/10 text-warning border-warning/20'
                              : ret.refundMethod === 'DIGITAL'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-success/10 text-success border-success/20'
                          }`}
                        >
                          {ret.refundMethod}
                        </Badge>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <span className="font-medium text-foreground block truncate">
                          {ret.reason}
                        </span>
                        {ret.notes && (
                          <span className="text-micro text-muted-foreground italic truncate block">
                            {ret.notes}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReturnForSlip(ret)}
                          className="h-7 text-micro gap-1 font-medium cursor-pointer whitespace-nowrap"
                        >
                          <FileText className="size-3 text-primary" />
                          <span>Slip</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/70 flex items-center justify-between text-xs bg-muted/10">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs cursor-pointer"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Return Modal */}
      <CreateReturnModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onReturnSuccess={handleReturnCreated}
      />

      {/* Return Slip / Credit Memo View Modal */}
      <ReturnSlipModal
        open={Boolean(selectedReturnForSlip)}
        onOpenChange={(open) => !open && setSelectedReturnForSlip(null)}
        returnRecord={selectedReturnForSlip}
      />
    </div>
  );
}
