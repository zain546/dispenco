'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  ShoppingCart,
  Package,
  Truck,
  AlertTriangle,
  Clock,
  Sparkles,
  DollarSign,
  Plus,
  CheckCircle2,
  ChevronRight,
  Layers,
  Building2,
  Calendar,
  ShieldAlert,
  ArrowRight,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  purchasesApi,
  type ReorderSuggestionItem,
  type ReorderSuggestionsResponse,
  type ReorderUrgency,
} from '../services/purchases-api';
import { useStore } from '@/context/store-context';

interface ReorderSuggestionsViewProps {
  onConvertToPO: (items: {
    supplierId?: string;
    items: { productId: string; productName: string; expectedQuantity: number; unitCost: number }[];
    notes?: string;
  }) => void;
}

export function ReorderSuggestionsView({ onConvertToPO }: ReorderSuggestionsViewProps) {
  const { activeStoreId, isAllStores } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ReorderSuggestionsResponse | null>(null);

  // Filters
  const [timeframeDays, setTimeframeDays] = useState<number>(30);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('REORDER_NEEDED');
  const [search, setSearch] = useState<string>('');

  // Multi-selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const fetchSuggestions = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await purchasesApi.getReorderSuggestions({
          storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
          timeframeDays,
          urgencyFilter: urgencyFilter !== 'ALL' ? urgencyFilter : undefined,
          search: search.trim() || undefined,
          limit: 150,
        });
        setData(res);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Failed to calculate smart reorder suggestions'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeStoreId, isAllStores, timeframeDays, urgencyFilter, search],
  );

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Handle single item Convert to PO
  const handleSingleConvertToPO = (item: ReorderSuggestionItem) => {
    onConvertToPO({
      supplierId: item.supplier.id || undefined,
      items: [
        {
          productId: item.productId,
          productName: item.productName,
          expectedQuantity: item.suggestedQuantity > 0 ? item.suggestedQuantity : Math.max(item.lowStockThreshold, 10),
          unitCost: item.estimatedUnitCost,
        },
      ],
      notes: `Generated from Smart Reorder Suggestion (Velocity: ${item.dailySalesVelocity} ${item.unit}/day, Lead Time: ${item.supplier.leadTimeDays}d)`,
    });
  };

  // Handle bulk selected Convert to PO
  const handleBulkConvertToPO = () => {
    if (!data?.suggestions) return;
    const selectedItems = data.suggestions.filter((s) => selectedProductIds.includes(s.productId));
    if (selectedItems.length === 0) return;

    // Determine supplier: if all share the same supplier, use it, otherwise let user select
    const primarySupplierId = selectedItems[0]?.supplier?.id || undefined;

    onConvertToPO({
      supplierId: primarySupplierId,
      items: selectedItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        expectedQuantity: item.suggestedQuantity > 0 ? item.suggestedQuantity : Math.max(item.lowStockThreshold, 10),
        unitCost: item.estimatedUnitCost,
      })),
      notes: `Bulk generated from Smart Reorder Suggestions (${selectedItems.length} items)`,
    });
  };

  const handleToggleSelectAll = () => {
    if (!data?.suggestions) return;
    if (selectedProductIds.length === data.suggestions.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(data.suggestions.map((s) => s.productId));
    }
  };

  const handleToggleSelectItem = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const renderUrgencyBadge = (level: ReorderUrgency) => {
    switch (level) {
      case 'OUT_OF_STOCK':
        return (
          <StatusBadge variant="danger" size="sm" dot>
            Out of Stock
          </StatusBadge>
        );
      case 'CRITICAL_REORDER':
        return (
          <StatusBadge variant="danger" size="sm" dot>
            Stockout Imminent
          </StatusBadge>
        );
      case 'REORDER_SOON':
        return (
          <StatusBadge variant="warning" size="sm" dot>
            Reorder Now
          </StatusBadge>
        );
      case 'UPCOMING':
        return (
          <StatusBadge variant="info" size="sm" dot>
            Upcoming
          </StatusBadge>
        );
      case 'ADEQUATE':
      default:
        return (
          <StatusBadge variant="success" size="sm" dot>
            Adequate Stock
          </StatusBadge>
        );
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header explanation banner */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Smart Dynamic Reorder Recommendations
              </h2>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Phase 4: Sales Velocity & Supplier Lead Time
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculates dynamic replenishment points per medicine using real POS sales velocity, current shelf stock,
              and supplier delivery lead times. Automatically surfaces optimal reorder timing and quantities to prevent stockouts
              without locking excess working capital.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {/* Timeframe selector */}
            <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/60">
              <span className="text-xs font-medium text-muted-foreground px-2">History:</span>
              {[14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeframeDays(days)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    timeframeDays === days
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSuggestions(true)}
              disabled={isRefreshing || isLoading}
              className="gap-1.5 h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Recalculate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* High-Level Metric StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Out of Stock / Critical"
          value={isLoading ? '...' : (summary?.criticalReordersCount ?? 0).toString()}
          icon={AlertTriangle}
          variant={summary?.criticalReordersCount && summary.criticalReordersCount > 0 ? 'destructive' : 'default'}
          caption="Medicines with stockout occurring or imminent before delivery"
        />
        <StatCard
          label="Reorder Actions Required"
          value={
            isLoading
              ? '...'
              : ((summary?.criticalReordersCount ?? 0) + (summary?.reorderSoonCount ?? 0)).toString()
          }
          icon={ShoppingCart}
          variant="warning"
          caption="Products at or below optimal replenishment point"
        />
        <StatCard
          label="Total Units Suggested"
          value={isLoading ? '...' : (summary?.totalUnitsToOrder ?? 0).toLocaleString()}
          icon={Package}
          caption="Replenishment quantity to maintain 14-day stock safety coverage"
        />
        <StatCard
          label="Est. Working Capital"
          value={isLoading ? 'Calculating...' : formatCurrency(summary?.totalEstimatedCost ?? 0)}
          icon={DollarSign}
          caption="Projected purchase cost for recommended replenish quantities"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines by name, generic formula, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Quick Action Badges / Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Reorder Needed', value: 'REORDER_NEEDED', count: (summary?.criticalReordersCount ?? 0) + (summary?.reorderSoonCount ?? 0), variant: 'warning' },
                { label: 'Critical Only', value: 'CRITICAL', count: summary?.criticalReordersCount, variant: 'destructive' },
                { label: 'Upcoming', value: 'UPCOMING', count: summary?.upcomingCount },
                { label: 'All Catalog', value: 'ALL', count: summary?.totalProductsAnalyzed },
                { label: 'Adequate', value: 'ADEQUATE', count: summary?.adequateCount, variant: 'success' },
              ].map((tier) => (
                <Button
                  key={tier.value}
                  variant={urgencyFilter === tier.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUrgencyFilter(tier.value)}
                  className={`h-8 text-xs gap-1.5 cursor-pointer ${
                    urgencyFilter === tier.value
                      ? ''
                      : tier.variant === 'destructive'
                      ? 'text-destructive border-destructive/30 hover:bg-destructive/10'
                      : tier.variant === 'warning'
                      ? 'text-warning border-warning/30 hover:bg-warning/10'
                      : tier.variant === 'success'
                      ? 'text-success border-success/30 hover:bg-success/10'
                      : 'text-muted-foreground'
                  }`}
                >
                  {tier.label}
                  {tier.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-micro font-mono ${
                        urgencyFilter === tier.value
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tier.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Suggestions Table */}
      <Card className="border-border/80 overflow-hidden shadow-xs">
        <CardHeader className="px-5 py-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" />
              Replenishment Suggestions ({data?.suggestions?.length ?? 0} items evaluated)
            </CardTitle>
            <CardDescription className="text-xs">
              Orders ranked by urgency score: Out-of-stock and supplier delivery lead time deficits prioritized at top.
            </CardDescription>
          </div>

          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {selectedProductIds.length} item{selectedProductIds.length === 1 ? '' : 's'} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkConvertToPO}
                className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                Convert Selected to PO
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Evaluating sales velocity, supplier lead times, and replenishment needs...
              </p>
            </div>
          ) : !data?.suggestions || data.suggestions.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Reorders Needed Under Current Filter"
              description="All products in this category have adequate shelf coverage and do not require replenishment."
              action={
                search || urgencyFilter !== 'ALL' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setUrgencyFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-overline font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAll}
                        aria-label="Select all items"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
                      >
                        {selectedProductIds.length === data.suggestions.length && data.suggestions.length > 0 ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Medicine & Details</th>
                    <th className="py-3 px-3">Stock vs Reorder Point</th>
                    <th className="py-3 px-3">Daily Velocity</th>
                    <th className="py-3 px-3">Run-out Timeline</th>
                    <th className="py-3 px-3">Supplier & Lead Time</th>
                    <th className="py-3 px-3 text-right">Suggested Order</th>
                    <th className="py-3 px-3">Urgency Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.suggestions.map((item) => {
                    const isSelected = selectedProductIds.includes(item.productId);
                    const isStockout = item.currentStock === 0;
                    const isCritical = item.urgencyLevel === 'CRITICAL_REORDER';

                    return (
                      <tr
                        key={item.productId}
                        className={`hover:bg-muted/30 transition-colors ${
                          isSelected
                            ? 'bg-primary/5'
                            : isStockout
                            ? 'bg-destructive/5'
                            : isCritical
                            ? 'bg-warning/5'
                            : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center align-middle">
                          <button
                            onClick={() => handleToggleSelectItem(item.productId)}
                            aria-label={`Select ${item.productName}`}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4 text-primary" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                        </td>

                        {/* Medicine */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-foreground text-sm">
                            {item.productName}
                          </div>
                          {item.genericName && (
                            <div className="text-xs text-muted-foreground line-clamp-1 italic">
                              {item.genericName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="bg-secondary px-1.5 py-0.5 rounded text-micro font-medium">
                              {item.category}
                            </span>
                            {item.barcode && <span className="font-mono text-micro">#{item.barcode}</span>}
                          </div>
                        </td>

                        {/* Stock vs Reorder Point */}
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold text-sm tabular-nums ${
                                item.currentStock === 0
                                  ? 'text-destructive'
                                  : item.currentStock <= item.reorderPoint
                                  ? 'text-warning'
                                  : 'text-foreground'
                              }`}
                            >
                              {item.currentStock} {item.unit}
                            </span>
                          </div>
                          <div className="text-micro text-muted-foreground mt-0.5">
                            Reorder Trigger: <strong className="text-foreground">{item.reorderPoint}</strong> {item.unit}
                          </div>
                          <div className="text-micro text-muted-foreground">
                            Safety Buffer: {item.lowStockThreshold} min
                          </div>
                        </td>

                        {/* Daily Sales Velocity */}
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold text-foreground">
                            {item.dailySalesVelocity > 0 ? (
                              <>
                                <TrendingUp className="size-3 text-success" />
                                <span>{item.dailySalesVelocity} {item.unit}/day</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="size-3 text-muted-foreground" />
                                <span className="text-muted-foreground">0.00 {item.unit}/day</span>
                              </>
                            )}
                          </div>
                          <div className="text-micro text-muted-foreground">
                            {item.totalUnitsSoldInTimeframe} sold in {item.timeframeDays}d
                          </div>
                        </td>

                        {/* Run-out Timeline */}
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          {item.currentStock === 0 ? (
                            <span className="text-destructive font-bold text-xs flex items-center gap-1">
                              <AlertTriangle className="size-3" /> Out of Stock Now
                            </span>
                          ) : item.daysUntilStockout < 999 ? (
                            <div>
                              <div
                                className={`font-semibold text-xs ${
                                  item.daysUntilStockout <= item.supplier.leadTimeDays
                                    ? 'text-destructive'
                                    : item.daysUntilStockout <= 14
                                    ? 'text-warning'
                                    : 'text-foreground'
                                }`}
                              >
                                ~{item.daysUntilStockout} days remaining
                              </div>
                              <div className="text-micro text-muted-foreground">
                                Runs out: {item.estimatedStockoutDate ? formatDate(item.estimatedStockoutDate) : '-'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Adequate coverage</span>
                          )}
                        </td>

                        {/* Supplier & Lead Time */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-foreground flex items-center gap-1">
                            <Truck className="size-3 text-muted-foreground shrink-0" />
                            <span className="line-clamp-1">{item.supplier.name}</span>
                          </div>
                          <div className="text-micro text-muted-foreground mt-0.5">
                            Lead Time: <strong className="text-foreground">{item.supplier.leadTimeDays} days</strong> delivery
                          </div>
                        </td>

                        {/* Suggested Order */}
                        <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                          <div className="font-bold text-primary text-sm tabular-nums">
                            +{item.suggestedQuantity} {item.unit}
                          </div>
                          <div className="text-xs font-semibold text-foreground tabular-nums">
                            {formatCurrency(item.estimatedOrderCost)}
                          </div>
                          <div className="text-micro text-muted-foreground tabular-nums">
                            @ {formatCurrency(item.estimatedUnitCost)}/unit
                          </div>
                        </td>

                        {/* Urgency Status */}
                        <td className="py-3 px-3 align-top">
                          {renderUrgencyBadge(item.urgencyLevel)}
                          <div className="text-micro text-muted-foreground mt-1 line-clamp-2 max-w-[180px]">
                            {item.reason}
                          </div>
                        </td>

                        {/* Action: Convert to PO */}
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => handleSingleConvertToPO(item)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                          >
                            <ShoppingCart className="size-3.5" />
                            <span>Convert to PO</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
