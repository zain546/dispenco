'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Package,
  Boxes,
  Zap,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ShoppingCart,
  Edit3,
  BadgeAlert,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  productsApi,
  type ExpiryRiskBatchItem,
  type ExpiryRiskForecastResponse,
  type RiskLevel,
  type BatchData,
} from '../services/products-api';
import { useStore } from '@/context/store-context';
import { EditBatchModal } from './edit-batch-modal';
import { ProductBatchesModal } from './product-batches-modal';

interface ExpiryRiskViewProps {
  onNavigateToCatalog?: () => void;
}

export function ExpiryRiskView({ onNavigateToCatalog }: ExpiryRiskViewProps) {
  const { activeStoreId, isAllStores } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<ExpiryRiskForecastResponse | null>(null);

  // Filters
  const [timeframeDays, setTimeframeDays] = useState<number>(30);
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals for batch editing and product batch inspection
  const [selectedBatchForEdit, setSelectedBatchForEdit] = useState<BatchData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [selectedProductForModal, setSelectedProductForModal] = useState<{ id: string; name: string } | null>(null);
  const [batchesModalOpen, setBatchesModalOpen] = useState(false);

  const fetchForecast = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await productsApi.getExpiryRiskForecast({
          storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
          timeframeDays,
          riskFilter: riskFilter !== 'ALL' ? riskFilter : undefined,
          search: search.trim() || undefined,
          limit: 150,
        });
        setData(res);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Failed to calculate expiry risk forecast'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeStoreId, isAllStores, timeframeDays, riskFilter, search],
  );

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const handleOpenEditBatch = (item: ExpiryRiskBatchItem) => {
    const batchData: BatchData = {
      id: item.id,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      quantityReceived: item.quantityReceived,
      quantityRemaining: item.quantityRemaining,
      daysUntilExpiry: item.daysUntilExpiry,
      isExpired: item.isExpired,
      isNearExpiry: item.daysUntilExpiry <= 180,
      createdAt: new Date().toISOString(),
    };
    setSelectedBatchForEdit(batchData);
    setEditModalOpen(true);
  };

  const handleOpenProductBatches = (item: ExpiryRiskBatchItem) => {
    setSelectedProductForModal({
      id: item.productId,
      name: item.productName,
    });
    setBatchesModalOpen(true);
  };

  // Helper for rendering Risk Badge
  const renderRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'EXPIRED':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 flex items-center gap-1 font-semibold">
            <AlertTriangle className="size-3" /> Expired (Score: {score})
          </Badge>
        );
      case 'CRITICAL_UNSOLD':
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1 font-semibold">
            <ShieldAlert className="size-3" /> Critical Risk ({score}%)
          </Badge>
        );
      case 'CRITICAL_NO_SALES':
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1 font-semibold">
            <TrendingDown className="size-3" /> 0-Velocity Imminent ({score}%)
          </Badge>
        );
      case 'HIGH_RISK':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-semibold">
            <AlertTriangle className="size-3" /> High Risk ({score}%)
          </Badge>
        );
      case 'MODERATE_RISK':
        return (
          <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 flex items-center gap-1 font-medium">
            <Clock className="size-3" /> Moderate Risk ({score}%)
          </Badge>
        );
      case 'TIGHT_WINDOW':
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1 font-medium">
            <Clock className="size-3" /> Tight Window ({score}%)
          </Badge>
        );
      case 'STAGNANT':
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 flex items-center gap-1 font-medium">
            <TrendingDown className="size-3" /> Zero Velocity ({score}%)
          </Badge>
        );
      case 'SAFE':
      default:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-medium">
            <ShieldCheck className="size-3" /> Safe Turnover ({score}%)
          </Badge>
        );
    }
  };

  // Helper for Action Recommendation Badge
  const renderActionBadge = (rec: ExpiryRiskBatchItem['actionRecommendation']) => {
    switch (rec) {
      case 'IMMEDIATE_QUARANTINE_OR_WRITEOFF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            Write-Off / Quarantine
          </span>
        );
      case 'AGGRESSIVE_MARKDOWN_NOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Urgent Markdown 30-50%
          </span>
        );
      case 'MARKDOWN_OR_VENDOR_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Supplier Return or Markdown
          </span>
        );
      case 'APPLY_DISCOUNT_OR_BUNDLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Discount 15-25%
          </span>
        );
      case 'PRIORITIZE_POS_PLACEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Move to POS Front
          </span>
        );
      case 'PUSH_PROMOTION_OR_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Inter-Store Transfer
          </span>
        );
      case 'MONITOR_VELOCITY':
      case 'MONITOR_SALES_TREND':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
            Monitor Trend
          </span>
        );
      case 'ON_TRACK_NO_ACTION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            On Track (No Action)
          </span>
        );
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header explanation banner */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Sales Velocity-Driven Expiry Forecasting
              </h2>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Phase 4: AI & Advanced Analytics
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unlike chronological expiry dates alone, this predictive model calculates each medicine’s real-world{' '}
              <strong className="text-foreground">Daily Sales Velocity</strong> (units sold/day at the POS) to project
              which batches will expire with unsold stock remaining. Take proactive action before capital is lost.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {/* Timeframe selector */}
            <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground px-2">Velocity:</span>
              {[14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeframeDays(days)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    timeframeDays === days
                      ? 'bg-primary text-primary-foreground shadow-sm'
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
              onClick={() => fetchForecast(true)}
              disabled={isRefreshing || isLoading}
              className="gap-1.5 h-8 text-xs"
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
          label="Capital at Risk (Cost Loss)"
          value={isLoading ? 'Calculating...' : formatCurrency(summary?.totalCapitalAtRisk ?? 0)}
          icon={DollarSign}
          variant={summary?.totalCapitalAtRisk && summary.totalCapitalAtRisk > 0 ? 'destructive' : 'default'}
          caption="Estimated financial loss if unsold batches reach expiry"
        />
        <StatCard
          label="Units Projected Unsold"
          value={isLoading ? '...' : (summary?.totalUnitsAtRisk ?? 0).toLocaleString()}
          icon={Package}
          variant="warning"
          caption="Stock forecasted to remain on shelves past expiry date"
        />
        <StatCard
          label="Critical Interventions"
          value={isLoading ? '...' : (summary?.criticalBatchesCount ?? 0).toString()}
          icon={AlertTriangle}
          variant={summary?.criticalBatchesCount && summary.criticalBatchesCount > 0 ? 'destructive' : 'default'}
          caption="Batches requiring immediate markdown or supplier return"
        />
        <StatCard
          label="Zero-Velocity Batches"
          value={isLoading ? '...' : (summary?.stagnantBatchesCount ?? 0).toString()}
          icon={TrendingDown}
          variant="warning"
          caption={`No sales recorded over the past ${timeframeDays} days`}
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
                placeholder="Search by medicine name, generic formula, batch number, or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Quick Action Badges / Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'All', value: 'ALL', count: summary?.totalBatchesAnalyzed },
                { label: 'Critical', value: 'CRITICAL', count: summary?.criticalBatchesCount, variant: 'destructive' },
                { label: 'High Risk', value: 'HIGH', count: summary?.highRiskBatchesCount, variant: 'warning' },
                { label: 'Moderate', value: 'MODERATE', count: summary?.moderateRiskBatchesCount },
                { label: 'Stagnant (0 Sales)', value: 'STAGNANT', count: summary?.stagnantBatchesCount },
                { label: 'Safe / On Track', value: 'SAFE', count: summary?.safeBatchesCount, variant: 'success' },
              ].map((tier) => (
                <Button
                  key={tier.value}
                  variant={riskFilter === tier.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRiskFilter(tier.value)}
                  className={`h-8 text-xs gap-1.5 ${
                    riskFilter === tier.value
                      ? ''
                      : tier.variant === 'destructive'
                      ? 'text-destructive border-destructive/30 hover:bg-destructive/10'
                      : tier.variant === 'warning'
                      ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                      : tier.variant === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                      : 'text-muted-foreground'
                  }`}
                >
                  {tier.label}
                  {tier.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        riskFilter === tier.value
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

      {/* Main Forecast Table */}
      <Card className="border-border/60 overflow-hidden shadow-sm">
        <CardHeader className="px-5 py-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              Batch Depletion Forecast ({data?.batches?.length ?? 0} active batches evaluated)
            </CardTitle>
            <CardDescription className="text-xs">
              Batches sorted by Risk Priority: Highest financial exposure and urgent markdown candidates at top.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="size-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Evaluating sales velocity and computing depletion models...
              </p>
            </div>
          ) : !data?.batches || data.batches.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Batches Match Selected Filter"
              description="No active batches were found under this risk category. All stock appears to have sufficient velocity or long shelf life."
              action={
                search || riskFilter !== 'ALL' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setRiskFilter('ALL');
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
                  <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Medicine & Details</th>
                    <th className="py-3 px-3">Batch & Store</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-3">Sales Velocity</th>
                    <th className="py-3 px-3">Depletion Model</th>
                    <th className="py-3 px-3 text-right">Projected Unsold / Loss</th>
                    <th className="py-3 px-3">Risk Assessment</th>
                    <th className="py-3 px-3">Suggested Action</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.batches.map((item) => {
                    const isHighExposure = item.riskLevel === 'CRITICAL_UNSOLD' || item.riskLevel === 'CRITICAL_NO_SALES';
                    const hasLoss = item.projectedLossAmount > 0;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          item.isExpired
                            ? 'bg-destructive/5'
                            : isHighExposure
                            ? 'bg-rose-500/[0.02]'
                            : ''
                        }`}
                      >
                        {/* Medicine */}
                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                            {item.productName}
                          </div>
                          {item.genericName && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 italic">
                              {item.genericName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {item.category}
                            </span>
                            {item.barcode && <span className="font-mono text-[10px]">#{item.barcode}</span>}
                          </div>
                        </td>

                        {/* Batch & Store */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono font-medium text-foreground">{item.batchNumber}</div>
                          <div className="text-[11px] text-muted-foreground">{item.storeName}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Stock: <strong className="text-foreground">{item.quantityRemaining}</strong> / {item.quantityReceived} {item.unit}
                          </div>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="font-medium text-foreground">{formatDate(item.expiryDate)}</div>
                          {item.isExpired ? (
                            <span className="text-[11px] text-destructive font-semibold">
                              Expired {Math.abs(item.daysUntilExpiry)}d ago
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] font-medium ${
                                item.daysUntilExpiry <= 60
                                  ? 'text-destructive'
                                  : item.daysUntilExpiry <= 120
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {item.daysUntilExpiry} days remaining
                            </span>
                          )}
                        </td>

                        {/* Sales Velocity */}
                        <td className="py-3 px-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold text-foreground">
                            {item.dailySalesVelocity > 0 ? (
                              <>
                                <TrendingUp className="size-3 text-emerald-500" />
                                <span>{item.dailySalesVelocity} {item.unit}/day</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="size-3 text-muted-foreground" />
                                <span className="text-muted-foreground">0.00 {item.unit}/day</span>
                              </>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.totalUnitsSoldInTimeframe} units sold in past {item.timeframeDays}d
                          </div>
                        </td>

                        {/* Depletion Model */}
                        <td className="py-3 px-3 align-top">
                          {item.estimatedDaysToDeplete !== null ? (
                            <div>
                              <div className="font-medium text-foreground">
                                Depletes in ~{item.estimatedDaysToDeplete} days
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Est. Date:{' '}
                                {item.depletionDate ? formatDate(item.depletionDate) : '-'}
                              </div>
                              {item.estimatedDaysToDeplete > item.daysUntilExpiry && (
                                <div className="text-[10px] text-destructive font-semibold mt-0.5 flex items-center gap-1">
                                  <AlertTriangle className="size-2.5" />
                                  Exceeds expiry date by {item.estimatedDaysToDeplete - item.daysUntilExpiry}d
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic text-[11px]">
                              Zero movement (no depletion date)
                            </div>
                          )}
                        </td>

                        {/* Projected Unsold / Financial Loss */}
                        <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                          {item.projectedUnsoldQuantity > 0 ? (
                            <div>
                              <div className="font-bold text-destructive text-sm tabular-nums">
                                {item.projectedUnsoldQuantity} {item.unit} unsold
                              </div>
                              <div className="text-[11px] font-semibold text-foreground tabular-nums">
                                Loss: {formatCurrency(item.projectedLossAmount)}
                              </div>
                              <div className="text-[10px] text-muted-foreground tabular-nums">
                                Cost @ {formatCurrency(item.costPrice)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <ShieldCheck className="size-3" /> 0 Unsold (Clean)
                              </span>
                              <div className="text-[10px] text-muted-foreground">Full sell-out expected</div>
                            </div>
                          )}
                        </td>

                        {/* Risk Assessment & Score */}
                        <td className="py-3 px-3 align-top">
                          {renderRiskBadge(item.riskLevel, item.riskScore)}
                          <div className="w-24 bg-secondary rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.riskScore >= 75
                                  ? 'bg-destructive'
                                  : item.riskScore >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, item.riskScore))}%` }}
                            />
                          </div>
                        </td>

                        {/* Suggested Action */}
                        <td className="py-3 px-3 align-top max-w-[200px]">
                          {renderActionBadge(item.actionRecommendation)}
                          <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {item.actionSummary}
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reprice / Markdown Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditBatch(item)}
                              className="h-7 px-2 text-[11px] gap-1 hover:border-primary hover:text-primary"
                              title="Edit sell price or adjust stock for markdown"
                            >
                              <Edit3 className="size-3" />
                              Markdown
                            </Button>

                            {/* View Batches */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenProductBatches(item)}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              title="Inspect all batches for this product"
                            >
                              Batches
                            </Button>

                            {/* Link to POS */}
                            <Link href={`/pos?search=${encodeURIComponent(item.productName)}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary"
                                title="Open in POS Counter to sell"
                              >
                                <ShoppingCart className="size-3" />
                              </Button>
                            </Link>
                          </div>
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

      {/* Edit Batch Modal (for Markdown / Price discount) */}
      <EditBatchModal
        batch={selectedBatchForEdit}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onBatchUpdated={() => {
          setEditModalOpen(false);
          fetchForecast(true);
        }}
      />

      {/* Product Batches Modal */}
      {selectedProductForModal && (
        <ProductBatchesModal
          productId={selectedProductForModal.id}
          open={batchesModalOpen}
          onOpenChange={setBatchesModalOpen}
        />
      )}
    </div>
  );
}
