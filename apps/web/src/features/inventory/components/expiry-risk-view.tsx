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
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
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
  const [fetchError, setFetchError] = useState<string | null>(null);
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
      setFetchError(null);

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
        const msg = getErrorMessage(err, 'Failed to calculate expiry risk forecast');
        setFetchError(msg);
        toast.error(msg);
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
        return <StatusBadge status="danger" label={`Expired (Score: ${score})`} />;
      case 'CRITICAL_UNSOLD':
        return <StatusBadge status="danger" label={`Critical Risk (${score}%)`} />;
      case 'CRITICAL_NO_SALES':
        return <StatusBadge status="danger" label={`0-Velocity (${score}%)`} />;
      case 'HIGH_RISK':
        return <StatusBadge status="warning" label={`High Risk (${score}%)`} />;
      case 'MODERATE_RISK':
        return <StatusBadge status="warning" label={`Moderate Risk (${score}%)`} />;
      case 'TIGHT_WINDOW':
        return <StatusBadge status="info" label={`Tight Window (${score}%)`} />;
      case 'STAGNANT':
        return <StatusBadge status="neutral" label={`Zero Velocity (${score}%)`} />;
      case 'SAFE':
      default:
        return <StatusBadge status="success" label={`Safe Turnover (${score}%)`} />;
    }
  };

  // Helper for Action Recommendation Badge
  const renderActionBadge = (rec: ExpiryRiskBatchItem['actionRecommendation']) => {
    switch (rec) {
      case 'IMMEDIATE_QUARANTINE_OR_WRITEOFF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            Write-Off / Quarantine
          </span>
        );
      case 'AGGRESSIVE_MARKDOWN_NOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-destructive/15 text-destructive border border-destructive/30">
            Urgent Markdown 30-50%
          </span>
        );
      case 'MARKDOWN_OR_VENDOR_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-warning/15 text-warning border border-warning/30">
            Supplier Return / Markdown
          </span>
        );
      case 'APPLY_DISCOUNT_OR_BUNDLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-semibold bg-warning/10 text-warning border border-warning/20">
            Discount 15-25%
          </span>
        );
      case 'PRIORITIZE_POS_PLACEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-medium bg-info/10 text-info border border-info/20">
            Move to POS Front
          </span>
        );
      case 'PUSH_PROMOTION_OR_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-medium bg-secondary text-secondary-foreground border border-border">
            Inter-Store Transfer
          </span>
        );
      case 'MONITOR_VELOCITY':
      case 'MONITOR_SALES_TREND':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-medium bg-secondary text-secondary-foreground border border-border">
            Monitor Trend
          </span>
        );
      case 'ON_TRACK_NO_ACTION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-medium bg-success/10 text-success border border-success/20">
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
              <span className="text-micro font-medium text-muted-foreground px-2">Velocity:</span>
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
                      ? 'text-warning border-warning/30 hover:bg-warning/10'
                      : tier.variant === 'success'
                      ? 'text-success border-success/30 hover:bg-success/10'
                      : 'text-muted-foreground'
                  }`}
                >
                  {tier.label}
                  {tier.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-micro font-mono ${
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

      {/* Main Forecast Table & Responsive Mobile Cards */}
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
          {fetchError ? (
            <div className="p-6">
              <ErrorState
                title="Failed to Load Expiry Risk Forecast"
                description={fetchError}
                onRetry={() => fetchForecast()}
              />
            </div>
          ) : isLoading ? (
            <TableSkeleton columns={8} rows={6} />
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
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-border/40">
                {data.batches.map((item) => (
                  <div key={`m-${item.id}`} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{item.productName}</div>
                        {item.genericName && (
                          <div className="text-micro text-muted-foreground italic">{item.genericName}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-micro text-muted-foreground">
                          <span className="bg-secondary px-1.5 py-0.5 rounded font-medium">{item.category}</span>
                          <span className="font-mono">Batch: {item.batchNumber}</span>
                        </div>
                      </div>
                      <div className="shrink-0">{renderRiskBadge(item.riskLevel, item.riskScore)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-micro bg-muted/40 p-2.5 rounded-lg border border-border/40">
                      <div>
                        <span className="text-muted-foreground block">Expiry Date:</span>
                        <span className="font-medium text-foreground">{formatDate(item.expiryDate)}</span>
                        <span
                          className={`block font-semibold ${
                            item.isExpired
                              ? 'text-destructive'
                              : item.daysUntilExpiry <= 60
                              ? 'text-destructive'
                              : item.daysUntilExpiry <= 120
                              ? 'text-warning'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.isExpired ? `Expired ${Math.abs(item.daysUntilExpiry)}d ago` : `${item.daysUntilExpiry}d remaining`}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Sales Velocity:</span>
                        <span className="font-medium text-foreground">
                          {item.dailySalesVelocity > 0 ? `${item.dailySalesVelocity} ${item.unit}/day` : '0.00/day'}
                        </span>
                        <span className="text-muted-foreground block">{item.storeName}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-border/30 flex justify-between items-center">
                        <span className="text-muted-foreground">Projected Unsold:</span>
                        <span className={`font-bold ${item.projectedUnsoldQuantity > 0 ? 'text-destructive' : 'text-success'}`}>
                          {item.projectedUnsoldQuantity > 0
                            ? `${item.projectedUnsoldQuantity} ${item.unit} (${formatCurrency(item.projectedLossAmount)} loss)`
                            : '0 Unsold (Clean)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div>{renderActionBadge(item.actionRecommendation)}</div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditBatch(item)}
                          className="h-7 px-2 text-micro gap-1 hover:border-primary hover:text-primary"
                          aria-label="Edit sell price or adjust stock for markdown"
                        >
                          <Edit3 className="size-3" />
                          Markdown
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenProductBatches(item)}
                          className="h-7 px-2 text-micro text-muted-foreground hover:text-foreground"
                          aria-label="Inspect all batches for this product"
                        >
                          Batches
                        </Button>
                        <Link href={`/pos?search=${encodeURIComponent(item.productName)}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-micro text-muted-foreground hover:text-primary"
                            aria-label="Open in POS Counter to sell"
                          >
                            <ShoppingCart className="size-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-micro font-semibold text-muted-foreground uppercase tracking-wider">
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

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            item.isExpired
                              ? 'bg-destructive/5'
                              : isHighExposure
                              ? 'bg-destructive/[0.03]'
                              : ''
                          }`}
                        >
                          {/* Medicine */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                              {item.productName}
                            </div>
                            {item.genericName && (
                              <div className="text-micro text-muted-foreground line-clamp-1 italic">
                                {item.genericName}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-micro text-muted-foreground">
                              <span className="bg-secondary px-1.5 py-0.5 rounded font-medium">
                                {item.category}
                              </span>
                              {item.barcode && <span className="font-mono">#{item.barcode}</span>}
                            </div>
                          </td>

                          {/* Batch & Store */}
                          <td className="py-3 px-3 align-top">
                            <div className="font-mono font-medium text-foreground">{item.batchNumber}</div>
                            <div className="text-micro text-muted-foreground">{item.storeName}</div>
                            <div className="text-micro text-muted-foreground mt-1">
                              Stock: <strong className="text-foreground">{item.quantityRemaining}</strong> / {item.quantityReceived} {item.unit}
                            </div>
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <div className="font-medium text-foreground">{formatDate(item.expiryDate)}</div>
                            {item.isExpired ? (
                              <span className="text-micro text-destructive font-semibold">
                                Expired {Math.abs(item.daysUntilExpiry)}d ago
                              </span>
                            ) : (
                              <span
                                className={`text-micro font-medium ${
                                  item.daysUntilExpiry <= 60
                                    ? 'text-destructive'
                                    : item.daysUntilExpiry <= 120
                                    ? 'text-warning'
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
                                <div className="text-micro text-muted-foreground">
                                  Est. Date:{' '}
                                  {item.depletionDate ? formatDate(item.depletionDate) : '-'}
                                </div>
                                {item.estimatedDaysToDeplete > item.daysUntilExpiry && (
                                  <div className="text-micro text-destructive font-semibold mt-0.5 flex items-center gap-1">
                                    <AlertTriangle className="size-2.5" />
                                    Exceeds expiry date by {item.estimatedDaysToDeplete - item.daysUntilExpiry}d
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-muted-foreground italic text-micro">
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
                                <div className="text-micro font-semibold text-foreground tabular-nums">
                                  Loss: {formatCurrency(item.projectedLossAmount)}
                                </div>
                                <div className="text-micro text-muted-foreground tabular-nums">
                                  Cost @ {formatCurrency(item.costPrice)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="text-success font-semibold flex items-center justify-end gap-1">
                                  <ShieldCheck className="size-3" /> 0 Unsold (Clean)
                                </span>
                                <div className="text-micro text-muted-foreground">Full sell-out expected</div>
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
                                    ? 'bg-warning'
                                    : 'bg-success'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, item.riskScore))}%` }}
                              />
                            </div>
                          </td>

                          {/* Suggested Action */}
                          <td className="py-3 px-3 align-top max-w-[200px]">
                            {renderActionBadge(item.actionRecommendation)}
                            <div className="text-micro text-muted-foreground mt-1 line-clamp-2">
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
                                className="h-7 px-2 text-micro gap-1 hover:border-primary hover:text-primary"
                                aria-label="Edit sell price or adjust stock for markdown"
                              >
                                <Edit3 className="size-3" />
                                Markdown
                              </Button>

                              {/* View Batches */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenProductBatches(item)}
                                className="h-7 px-2 text-micro text-muted-foreground hover:text-foreground"
                                aria-label="Inspect all batches for this product"
                              >
                                Batches
                              </Button>

                              {/* Link to POS */}
                              <Link href={`/pos?search=${encodeURIComponent(item.productName)}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-micro text-muted-foreground hover:text-primary"
                                  aria-label="Open in POS Counter to sell"
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
            </>
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
