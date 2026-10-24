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
  ShieldCheck,
  Eye,
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
  const criticalCount = summary?.criticalReordersCount ?? 0;
  const reorderSoonCount = summary?.reorderSoonCount ?? 0;
  const totalReordersNeeded = criticalCount + reorderSoonCount;
  const totalCatalogCount = summary?.totalProductsAnalyzed ?? 0;

  return (
    <div className="space-y-6">
      {/* Header explanation banner */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardContent className="p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="size-6 sm:size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="size-3.5 sm:size-4" />
                </span>
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  Automated Stock Replenishment
                </h2>
              </div>
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 font-medium shrink-0">
                Sales Velocity & Lead Times
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
              Calculates dynamic reorder points based on real POS sales burn rate, current shelf stock,
              and distributor lead times to prevent stockouts while optimizing working capital.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-border/50">
            {/* Timeframe selector */}
            <div className="flex items-center bg-secondary/50 p-0.5 sm:p-1 rounded-lg border border-border/60">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground px-1.5 sm:px-2">History:</span>
              {[14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeframeDays(days)}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
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
              className="gap-1.5 h-8 text-xs font-semibold bg-card hover:bg-muted border-border/80 text-foreground cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Recalculate</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* High-Level Metric StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Out of Stock / Critical"
          value={isLoading ? '...' : criticalCount.toString()}
          icon={criticalCount > 0 ? AlertTriangle : ShieldCheck}
          variant={criticalCount > 0 ? 'destructive' : 'success'}
          caption={criticalCount > 0 ? 'Stockout imminent before delivery' : '0 stockout risks detected'}
        />
        <StatCard
          label="Reorder Actions Required"
          value={isLoading ? '...' : totalReordersNeeded.toString()}
          icon={totalReordersNeeded > 0 ? ShoppingCart : CheckCircle2}
          variant={totalReordersNeeded > 0 ? 'warning' : 'success'}
          caption={totalReordersNeeded > 0 ? 'Products below replenishment threshold' : 'All stock levels healthy'}
        />
        <StatCard
          label={totalReordersNeeded > 0 ? 'Suggested Units to Order' : 'Catalog Medicines Tracked'}
          value={
            isLoading
              ? '...'
              : totalReordersNeeded > 0
              ? (summary?.totalUnitsToOrder ?? 0).toLocaleString()
              : totalCatalogCount.toString()
          }
          icon={Package}
          caption={totalReordersNeeded > 0 ? '14-day stock safety coverage' : '100% adequate coverage'}
        />
        <StatCard
          label={totalReordersNeeded > 0 ? 'Est. Working Capital' : 'Reorder Capital Needed'}
          value={isLoading ? 'Calculating...' : formatCurrency(summary?.totalEstimatedCost ?? 0)}
          icon={DollarSign}
          caption={totalReordersNeeded > 0 ? 'Projected purchase outlay' : 'No purchase outlay needed'}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
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
            <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
              <div className="flex items-center gap-1.5 w-max">
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
                    className={`h-8 text-xs gap-1.5 shrink-0 rounded-lg cursor-pointer ${
                      urgencyFilter === tier.value
                        ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                        : 'bg-card hover:bg-muted border-border/80 text-foreground/80'
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
            urgencyFilter === 'REORDER_NEEDED' && !search ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3.5">
                <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-8 ring-emerald-500/5 shadow-xs">
                  <CheckCircle2 className="size-7" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-foreground">
                    All Catalog Inventory is Healthy
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Based on your live sales velocity and supplier lead times, all {totalCatalogCount} products have adequate buffer stock. No distributor purchase orders are needed today.
                  </p>
                </div>
                <div className="pt-1.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setUrgencyFilter('ALL')}
                    className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer h-9 px-4"
                  >
                    <Eye className="size-4" />
                    <span>Inspect All Catalog Stock ({totalCatalogCount})</span>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No Products Match Filters"
                description="No medicines in your inventory currently match the selected search or urgency tier."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setUrgencyFilter('ALL');
                    }}
                    className="gap-1.5 text-xs font-semibold bg-card hover:bg-muted border-border/80 text-foreground cursor-pointer"
                  >
                    View All Catalog ({totalCatalogCount})
                  </Button>
                }
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[760px]">
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
