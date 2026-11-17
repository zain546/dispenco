'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Moon,
  Receipt,
  PackageMinus,
  Sparkles,
  FileCheck2,
  ShieldCheck,
  Building2,
  User,
  X,
  Copy,
  Check,
  Lock,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, StatusBadgeVariant } from '@/components/ui/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AnomalyFlagItem,
  AnomalyType,
  AnomalyStatus,
  AnomalySeverity,
  AnomalyKpiSummary,
} from '@dispenco/types';
import { anomaliesApi } from '../services/anomalies-api';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';

const TYPE_CONFIG: Record<
  AnomalyType,
  { label: string; icon: React.ElementType; color: string; desc: string }
> = {
  [AnomalyType.HIGH_VOID_RATE]: {
    label: 'Disproportionate Voids',
    icon: Receipt,
    color: 'text-warning bg-warning/10 border-warning/20',
    desc: 'Cashier void or cancellation rate significantly exceeds store baseline.',
  },
  [AnomalyType.EXCESSIVE_DISCOUNT]: {
    label: 'Excessive Discount',
    icon: TrendingDown,
    color: 'text-warning bg-warning/10 border-warning/20',
    desc: 'Discretionary discounts exceeding policy limits or 25% of gross sale.',
  },
  [AnomalyType.AFTER_HOURS_SALE]: {
    label: 'After-Hours Sale',
    icon: Moon,
    color: 'text-primary bg-primary/10 border-primary/20',
    desc: 'Register checkout recorded outside normal retail operating hours.',
  },
  [AnomalyType.BELOW_COST_SALE]: {
    label: 'Below-Cost Sale',
    icon: AlertTriangle,
    color: 'text-destructive bg-destructive/10 border-destructive/20',
    desc: 'Line items sold below batch acquisition cost, damaging gross margin.',
  },
  [AnomalyType.REPETITIVE_SHRINKAGE]: {
    label: 'Recurrent Shrinkage',
    icon: PackageMinus,
    color: 'text-destructive bg-destructive/10 border-destructive/20',
    desc: 'Frequent manual stock adjustments or write-offs logged by staff member.',
  },
};

const SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; variant: StatusBadgeVariant }
> = {
  CRITICAL: {
    label: 'Critical',
    variant: 'danger',
  },
  HIGH: {
    label: 'High Variance',
    variant: 'warning',
  },
  MEDIUM: {
    label: 'Moderate',
    variant: 'info',
  },
  LOW: {
    label: 'Informational',
    variant: 'neutral',
  },
};

const QUICK_RATIONALE_PRESETS: Record<AnomalyType, string[]> = {
  [AnomalyType.BELOW_COST_SALE]: [
    'Authorized clearance write-down on short-dated stock',
    'Customer price match authorized by pharmacy manager',
    'Catalog acquisition cost reconciliation error corrected',
  ],
  [AnomalyType.AFTER_HOURS_SALE]: [
    'Authorized emergency patient after-hours dispensation',
    'Staff register end-of-day reconciliation transaction',
    'Doctor urgent off-hours prescription fulfillment',
  ],
  [AnomalyType.EXCESSIVE_DISCOUNT]: [
    'Authorized bulk / institutional patient loyalty concession',
    'Senior citizen / compassionate discount authorized by owner',
    'Cashier discount policy refresher training completed',
  ],
  [AnomalyType.HIGH_VOID_RATE]: [
    'Cashier re-trained on POS returns and register workflow',
    'Hardware barcode scanner latency caused duplicated entries',
    'Customer abandoned counter before completing payment',
  ],
  [AnomalyType.REPETITIVE_SHRINKAGE]: [
    'Physical shelf count audit performed; stock reconciled',
    'Damaged packaging batch written off per supplier protocol',
    'Expired cold-chain disposal documented in compliance log',
  ],
};

function renderStatusBadge(status: AnomalyStatus) {
  switch (status) {
    case AnomalyStatus.FLAGGED:
      return (
        <StatusBadge variant="warning" size="xs">
          Pending Review
        </StatusBadge>
      );
    case AnomalyStatus.UNDER_REVIEW:
      return (
        <StatusBadge variant="info" size="xs">
          In Investigation
        </StatusBadge>
      );
    case AnomalyStatus.RESOLVED:
      return (
        <StatusBadge variant="success" size="xs">
          Resolved
        </StatusBadge>
      );
    case AnomalyStatus.DISMISSED:
      return (
        <StatusBadge variant="neutral" size="xs">
          Dismissed
        </StatusBadge>
      );
    default:
      return <StatusBadge size="xs">{status}</StatusBadge>;
  }
}

interface VarianceMetricsDisplay {
  observedLabel: string;
  observedValue: string;
  baselineLabel: string;
  baselineValue: string;
  scoreBadge?: {
    label: string;
    className?: string;
  };
  extraNote?: string;
}

function formatVarianceMetrics(flag: AnomalyFlagItem): VarianceMetricsDisplay {
  const meta = (flag.metadata as Record<string, any>) || {};

  switch (flag.type) {
    case AnomalyType.BELOW_COST_SALE: {
      const unitPrice = flag.metricObserved !== null ? Number(flag.metricObserved) : null;
      const costPrice = flag.metricBaseline !== null ? Number(flag.metricBaseline) : null;
      const score = flag.statisticalScore !== null ? Number(flag.statisticalScore) : null;
      const deficit = costPrice !== null && unitPrice !== null ? costPrice - unitPrice : null;

      return {
        observedLabel: 'Sale Price',
        observedValue: unitPrice !== null ? `PKR ${unitPrice.toFixed(2)}` : '--',
        baselineLabel: 'Batch Cost',
        baselineValue: costPrice !== null ? `PKR ${costPrice.toFixed(2)}` : '--',
        scoreBadge: score
          ? {
              label: `${score}x below cost`,
              className: 'bg-destructive/10 text-destructive border-destructive/25',
            }
          : undefined,
        extraNote: deficit && deficit > 0 ? `Margin Deficit: -PKR ${deficit.toFixed(2)}/unit` : undefined,
      };
    }

    case AnomalyType.AFTER_HOURS_SALE: {
      const timeStr = meta.checkoutTimePkt || (flag.metricObserved !== null ? `${String(flag.metricObserved).padStart(2, '0')}:00 PKT` : 'Night');
      return {
        observedLabel: 'Checkout Time',
        observedValue: timeStr,
        baselineLabel: 'Operating Hours',
        baselineValue: 'Until 18:00 PKT',
        scoreBadge: {
          label: 'After-Hours Checkout',
          className: 'bg-primary/10 text-primary border-primary/25',
        },
        extraNote: meta.totalAmount ? `Total: PKR ${Number(meta.totalAmount).toLocaleString()}` : undefined,
      };
    }

    case AnomalyType.EXCESSIVE_DISCOUNT: {
      const discountPct = flag.metricObserved !== null ? Number(flag.metricObserved) : null;
      const capPct = flag.metricBaseline !== null ? Number(flag.metricBaseline) : 5.0;
      const score = flag.statisticalScore !== null ? Number(flag.statisticalScore) : null;

      return {
        observedLabel: 'Discount Given',
        observedValue: discountPct !== null ? `${discountPct.toFixed(1)}%` : '--',
        baselineLabel: 'Policy Limit',
        baselineValue: `${capPct.toFixed(1)}% max`,
        scoreBadge: score
          ? {
              label: `${score}x policy limit`,
              className: 'bg-warning/10 text-warning border-warning/30',
            }
          : undefined,
        extraNote: meta.discountAmount ? `Discount: PKR ${Number(meta.discountAmount).toFixed(2)}` : undefined,
      };
    }

    case AnomalyType.HIGH_VOID_RATE: {
      const voidRate = flag.metricObserved !== null ? Number(flag.metricObserved) : null;
      const avgRate = flag.metricBaseline !== null ? Number(flag.metricBaseline) : null;
      const score = flag.statisticalScore !== null ? Number(flag.statisticalScore) : null;

      return {
        observedLabel: 'Staff Void Rate',
        observedValue: voidRate !== null ? `${voidRate.toFixed(1)}%` : '--',
        baselineLabel: 'Store Average',
        baselineValue: avgRate !== null ? `${avgRate.toFixed(1)}% avg` : '--',
        scoreBadge: score
          ? {
              label: `${score}x store avg`,
              className: 'bg-warning/10 text-warning border-warning/30',
            }
          : undefined,
        extraNote:
          meta.voidedTransactions && meta.totalTransactions
            ? `${meta.voidedTransactions} voids / ${meta.totalTransactions} transactions`
            : undefined,
      };
    }

    case AnomalyType.REPETITIVE_SHRINKAGE: {
      const count = flag.metricObserved !== null ? Number(flag.metricObserved) : null;
      const limit = flag.metricBaseline !== null ? Number(flag.metricBaseline) : 1;
      const score = flag.statisticalScore !== null ? Number(flag.statisticalScore) : null;

      return {
        observedLabel: 'Manual Write-offs',
        observedValue: count !== null ? `${count} incidents` : '--',
        baselineLabel: 'Standard Limit',
        baselineValue: `Max ${limit} per 14d`,
        scoreBadge: score
          ? {
              label: `${score}x threshold`,
              className: 'bg-destructive/10 text-destructive border-destructive/25',
            }
          : undefined,
      };
    }

    default: {
      return {
        observedLabel: 'Observed',
        observedValue: flag.metricObserved !== null && flag.metricObserved !== undefined ? String(flag.metricObserved) : '--',
        baselineLabel: 'Baseline',
        baselineValue: flag.metricBaseline !== null && flag.metricBaseline !== undefined ? String(flag.metricBaseline) : '--',
        scoreBadge: flag.statisticalScore
          ? {
              label: `Score: ${flag.statisticalScore}x`,
              className: 'bg-muted text-foreground border-border/70',
            }
          : undefined,
      };
    }
  }
}

export function AnomaliesReviewView() {
  const { activeStore, activeStoreId, isAllStores } = useStore();

  const [statusFilter, setStatusFilter] = useState<AnomalyStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [flags, setFlags] = useState<AnomalyFlagItem[]>([]);
  const [summary, setSummary] = useState<AnomalyKpiSummary | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Review & Resolution Dialog State
  const [selectedFlag, setSelectedFlag] = useState<AnomalyFlagItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<AnomalyStatus>(
    AnomalyStatus.RESOLVED,
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const handleCopyReceipt = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedReceipt(true);
    toast.success('Receipt reference copied to clipboard');
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const fetchSummary = useCallback(async () => {
    try {
      const data = await anomaliesApi.getSummary();
      setSummary(data);
    } catch {
      // Soft failure for summary; flags fetch will report main error
    }
  }, []);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const storeParam = !isAllStores && activeStoreId ? activeStoreId : undefined;
      const res = await anomaliesApi.getAnomalies({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        storeId: storeParam,
        page,
        limit,
      });

      setFlags(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load discrepancy flags');
      setFetchError(msg);
      toast.error('Failed to load discrepancy flags', { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, isAllStores, activeStoreId, page]);

  useEffect(() => {
    fetchSummary();
    fetchFlags();
  }, [fetchSummary, fetchFlags]);

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const storeParam = !isAllStores && activeStoreId ? activeStoreId : undefined;
      const result = await anomaliesApi.triggerScan(storeParam);
      toast.success('Operational integrity scan completed', {
        description: `Evaluated ${result.scannedRules} statistical rules. ${result.newFlagsCreated} variance flags generated.`,
      });
      fetchSummary();
      fetchFlags();
    } catch (err: unknown) {
      toast.error('Failed to execute scan', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenReview = (flag: AnomalyFlagItem) => {
    setSelectedFlag(flag);
    setResolutionStatus(
      flag.status === AnomalyStatus.FLAGGED
        ? AnomalyStatus.RESOLVED
        : flag.status,
    );
    setResolutionNote(flag.resolutionNote || '');
  };

  const handleSubmitResolution = async () => {
    if (!selectedFlag) return;
    setIsSubmittingReview(true);
    try {
      const updated = await anomaliesApi.updateStatus(selectedFlag.id, {
        status: resolutionStatus,
        resolutionNote: resolutionNote.trim() || undefined,
      });

      toast.success('Discrepancy review updated', {
        description: `Flag marked as ${updated.status}. Rationale logged for audit.`,
      });

      setSelectedFlag(null);
      fetchSummary();
      fetchFlags();
    } catch (err: unknown) {
      toast.error('Failed to update resolution', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter flags locally by search query
  const filteredFlags = flags.filter((f) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      f.title.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query) ||
      (f.user?.name && f.user.name.toLowerCase().includes(query)) ||
      (f.storeName && f.storeName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header: streamlined and responsive */}
      <Card className="border border-border/80 sm:border-primary/20 bg-muted/20 sm:bg-gradient-to-r sm:from-primary/5 sm:via-primary/10 sm:to-background shadow-xs overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center sm:items-start gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 md:size-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs ring-2 sm:ring-4 ring-primary/5">
              <ShieldAlert className="size-4.5 sm:size-5 md:size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-foreground leading-tight">
                  Variance Detection Engine
                </h3>
                <Badge
                  variant="outline"
                  className="bg-primary/15 text-primary border-primary/30 text-[10px] sm:text-micro font-mono font-semibold px-2 py-0.5 tracking-wider gap-1 shadow-2xs"
                >
                  <Sparkles className="size-2.5" />
                  Continuous Statistical Baselines
                </Badge>
              </div>
              <p className="text-micro sm:text-xs text-muted-foreground mt-0.5 leading-relaxed hidden sm:block max-w-2xl">
                Continuous anomaly analysis across cash registers, discretionary discounting, out-of-hours checkouts, and stock shrinkage.
              </p>
            </div>

            {/* Mobile Actions in Header Row */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchSummary();
                  fetchFlags();
                }}
                disabled={isLoading || isScanning}
                className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Refresh"
              >
                <RefreshCw
                  className={`size-3 text-primary shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span className="hidden xs:inline">Refresh</span>
              </Button>

              <Button
                size="sm"
                onClick={handleRunScan}
                disabled={isScanning}
                className="h-8 px-2.5 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
                title="Run integrity scan"
              >
                <Sparkles
                  className={`size-3 text-warning shrink-0 ${
                    isScanning ? 'animate-spin' : ''
                  }`}
                />
                <span>{isScanning ? 'Scanning...' : 'Run Scan'}</span>
              </Button>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchSummary();
                fetchFlags();
              }}
              disabled={isLoading || isScanning}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 text-primary ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleRunScan}
              disabled={isScanning}
              className="h-9 gap-2 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
            >
              <Sparkles
                className={`size-3.5 text-warning ${
                  isScanning ? 'animate-spin' : ''
                }`}
              />
              {isScanning ? 'Analyzing Transactions...' : 'Run Integrity Scan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stat Cards: 2-column grid on mobile, 4-column on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Integrity Health Index"
          value={summary ? `${summary.integrityScorePercent}%` : '--'}
          icon={ShieldCheck}
          variant={
            summary && summary.integrityScorePercent >= 90
              ? 'success'
              : summary && summary.integrityScorePercent >= 75
              ? 'warning'
              : 'destructive'
          }
          caption={
            summary && summary.pendingReviewCount > 0
              ? `${summary.pendingReviewCount} items pending`
              : 'Zero active alerts'
          }
        />

        <StatCard
          title="Requires Review"
          value={summary?.pendingReviewCount ?? 0}
          icon={AlertTriangle}
          variant={(summary?.pendingReviewCount ?? 0) > 0 ? 'warning' : 'default'}
          caption={
            summary?.criticalSeverityCount
              ? `${summary.criticalSeverityCount} critical flags`
              : 'Active register flags'
          }
        />

        <StatCard
          title="Under Investigation"
          value={summary?.investigatingCount ?? 0}
          icon={Clock}
          caption="Staff review in progress"
        />

        <StatCard
          title="Resolved & Closed"
          value={(summary?.resolvedCount ?? 0) + (summary?.dismissedCount ?? 0)}
          icon={CheckCircle2}
          variant="success"
          caption="Documented & resolved"
        />
      </div>

      {/* Main Review Section */}
      <Card className="border-border/60 shadow-2xs">
        <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/40 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Tabs: Horizontally scrollable on mobile */}
            <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
              <div className="flex items-center gap-1.5 w-max">
                {[
                  {
                    id: 'ALL',
                    label: 'All Discrepancies',
                    count: summary?.totalFlags,
                  },
                  {
                    id: AnomalyStatus.FLAGGED,
                    label: 'Pending Review',
                    count: summary?.pendingReviewCount,
                  },
                  {
                    id: AnomalyStatus.UNDER_REVIEW,
                    label: 'Under Review',
                    count: summary?.investigatingCount,
                  },
                  {
                    id: AnomalyStatus.RESOLVED,
                    label: 'Resolved',
                    count: summary?.resolvedCount,
                  },
                  {
                    id: AnomalyStatus.DISMISSED,
                    label: 'Dismissed',
                    count: summary?.dismissedCount,
                  },
                ].map((tab) => {
                  const isSelected = statusFilter === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      variant={isSelected ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setStatusFilter(tab.id as AnomalyStatus | 'ALL');
                        setPage(1);
                      }}
                      className={`h-8 text-xs font-semibold gap-1.5 px-2.5 sm:px-3 rounded-lg shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <Badge
                          variant="outline"
                          className={`text-micro px-1.5 py-0 rounded-full font-bold tabular-nums ${
                            isSelected
                              ? 'border-primary-foreground/30 text-primary-foreground bg-primary-foreground/20'
                              : 'border-border text-muted-foreground bg-muted/40'
                          }`}
                        >
                          {tab.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search staff, receipt, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 h-8.5 text-xs bg-muted/20 focus-visible:bg-background rounded-lg border-border/70"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Rule Type Selector: Horizontally scrollable single track */}
          <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 w-max py-0.5">
              <span className="text-micro font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Filter className="size-3 text-primary" /> Rules:
              </span>
              <Button
                variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setTypeFilter('ALL');
                  setPage(1);
                }}
                className={`h-7 text-xs px-2.5 rounded-lg shrink-0 cursor-pointer ${
                  typeFilter === 'ALL'
                    ? 'bg-muted text-foreground font-semibold shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Variance Rules
              </Button>
              {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
                const Icon = cfg.icon;
                const count = summary?.breakdownByType?.[typeKey] || 0;
                const isSelected = typeFilter === typeKey;
                return (
                  <Button
                    key={typeKey}
                    variant={isSelected ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setTypeFilter(typeKey as AnomalyType);
                      setPage(1);
                    }}
                    className={`h-7 text-xs px-2.5 gap-1.5 rounded-lg shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-muted text-foreground font-semibold shadow-2xs border border-border/60'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3 shrink-0 text-primary" />
                    <span>{cfg.label}</span>
                    {count > 0 && (
                      <span className="text-micro font-bold tabular-nums opacity-75">
                        ({count})
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton columns={6} rows={6} />
            </div>
          ) : fetchError ? (
            <div className="p-8">
              <ErrorState
                title="Failed to Load Operational Discrepancies"
                description={fetchError}
                onRetry={fetchFlags}
              />
            </div>
          ) : filteredFlags.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Operational Discrepancies Found"
              description={
                statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No discrepancy flags match your active filters. Try resetting the filter criteria.'
                  : 'All register transactions, discounts, and inventory adjustments align within normal operational baselines.'
              }
              action={
                <Button
                  size="sm"
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="text-xs"
                >
                  Run Integrity Scan Now
                </Button>
              }
              className="py-12"
            />
          ) : (
            <>
              {/* Mobile Card List (Visible on < md) */}
              <div className="md:hidden divide-y divide-border/60">
                {filteredFlags.map((flag) => {
                  const cfg = TYPE_CONFIG[flag.type] || {
                    label: flag.type,
                    icon: AlertTriangle,
                    color: 'text-muted-foreground bg-muted',
                    desc: '',
                  };
                  const Icon = cfg.icon;
                  const sev =
                    SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.MEDIUM;

                  return (
                    <div
                      key={flag.id}
                      className="p-3.5 space-y-2.5 hover:bg-muted/15 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`p-2 rounded-xl border ${cfg.color} shrink-0 mt-0.5`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm text-foreground leading-snug line-clamp-2">
                              {flag.title}
                            </div>
                            <div className="text-micro text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {new Date(flag.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                              {flag.statisticalScore && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-primary">
                                    {flag.statisticalScore}x variance
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <StatusBadge
                          variant={sev.variant}
                          size="xs"
                          className="shrink-0"
                        >
                          {sev.label}
                        </StatusBadge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                        {flag.description}
                      </p>

                      {/* Mobile Metric Summary */}
                      {(() => {
                        const vm = formatVarianceMetrics(flag);
                        return (
                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground text-micro">{vm.observedLabel}:</span>
                              <span className="font-semibold text-foreground tabular-nums">{vm.observedValue}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-micro">
                              <span className="text-muted-foreground">{vm.baselineLabel}:</span>
                              <span className="font-medium text-foreground/85 tabular-nums">{vm.baselineValue}</span>
                            </div>
                            {(vm.scoreBadge || vm.extraNote) && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px]">
                                {vm.scoreBadge ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 font-semibold tabular-nums ${vm.scoreBadge.className || ''}`}
                                  >
                                    {vm.scoreBadge.label}
                                  </Badge>
                                ) : <span />}
                                {vm.extraNote && (
                                  <span className="text-muted-foreground font-medium">{vm.extraNote}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/40">
                        <div className="flex items-center gap-2 min-w-0">
                          {renderStatusBadge(flag.status)}
                          <span className="text-muted-foreground text-micro truncate max-w-[120px]">
                            {flag.user?.name || 'Staff'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(flag)}
                          className="h-7 text-xs font-semibold gap-1 px-2.5 bg-card hover:bg-muted cursor-pointer shadow-2xs"
                        >
                          <Eye className="size-3 text-primary" />
                          Review
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Data Table (Visible on >= md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs font-semibold">
                        Discrepancy Details
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Variance vs Baseline
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Store & Staff Member
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Status & Timestamp
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFlags.map((flag) => {
                      const cfg = TYPE_CONFIG[flag.type] || {
                        label: flag.type,
                        icon: AlertTriangle,
                        color: 'text-muted-foreground bg-muted',
                        desc: '',
                      };
                      const Icon = cfg.icon;
                      const sev =
                        SEVERITY_CONFIG[flag.severity] ||
                        SEVERITY_CONFIG.MEDIUM;

                      return (
                        <TableRow
                          key={flag.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <TableCell className="pl-4 pr-1">
                            <div
                              className={`p-2 rounded-lg border ${cfg.color} shrink-0`}
                            >
                              <Icon className="size-4" />
                            </div>
                          </TableCell>

                          <TableCell className="space-y-1 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {flag.title}
                              </span>
                              <StatusBadge variant={sev.variant} size="xs">
                                {sev.label}
                              </StatusBadge>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-md line-clamp-2">
                              {flag.description}
                            </p>
                          </TableCell>

                          <TableCell className="text-xs">
                            {(() => {
                              const vm = formatVarianceMetrics(flag);
                              return (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                                    <span className="text-muted-foreground font-normal text-micro">
                                      {vm.observedLabel}:
                                    </span>
                                    <span className="tabular-nums">{vm.observedValue}</span>
                                  </div>
                                  <div className="text-muted-foreground text-micro flex items-center gap-1.5">
                                    <span>{vm.baselineLabel}:</span>
                                    <span className="tabular-nums font-medium text-foreground/80">
                                      {vm.baselineValue}
                                    </span>
                                  </div>
                                  {vm.scoreBadge && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 font-semibold tabular-nums mt-0.5 ${vm.scoreBadge.className || ''}`}
                                    >
                                      {vm.scoreBadge.label}
                                    </Badge>
                                  )}
                                  {vm.extraNote && (
                                    <div className="text-[10px] text-muted-foreground font-medium">
                                      {vm.extraNote}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="text-xs space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                                {flag.user?.name ? flag.user.name.slice(0, 1).toUpperCase() : 'S'}
                              </div>
                              <span className="truncate max-w-[130px]">
                                {flag.user?.name || 'System Recorded'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-micro pl-1">
                              <Building2 className="size-3 shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {flag.storeName || (activeStore ? activeStore.name : 'Main Store')}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs space-y-1">
                            <div>{renderStatusBadge(flag.status)}</div>
                            <div className="text-muted-foreground text-micro tabular-nums">
                              {new Date(flag.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right pr-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReview(flag)}
                              className="h-8 text-xs gap-1.5"
                            >
                              <Eye className="size-3.5" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing page {page} of {totalPages} ({totalCount} total items)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2 text-xs"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager Review & Resolution Dialog */}
      <Dialog
        open={!!selectedFlag}
        onOpenChange={(open) => !open && setSelectedFlag(null)}
      >
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 shadow-2xl bg-card">
          <DialogHeader className="p-4 sm:p-5 pr-12 border-b border-border/70 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs ring-2 ring-primary/5">
                <FileCheck2 className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-tight">
                  Operational Discrepancy Review
                </DialogTitle>
                <DialogDescription className="text-micro sm:text-xs text-muted-foreground pt-0.5">
                  Review statistical variance evidence and log managerial resolution rationale.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedFlag && (() => {
            const cfg = TYPE_CONFIG[selectedFlag.type] || {
              label: selectedFlag.type,
              icon: AlertTriangle,
              color: 'text-muted-foreground bg-muted',
              desc: '',
            };
            const Icon = cfg.icon;
            const meta = (selectedFlag.metadata as Record<string, any>) || {};
            const presets = QUICK_RATIONALE_PRESETS[selectedFlag.type] || [];
            const contextTiles: Array<{ label: string; value: string; isCopyable?: boolean }> = [];

            if (meta.receiptNumber) contextTiles.push({ label: 'Receipt Reference', value: String(meta.receiptNumber), isCopyable: true });
            if (meta.checkoutTimePkt) contextTiles.push({ label: 'Checkout Time', value: `${meta.checkoutTimePkt} PKT` });
            if (meta.totalAmount !== undefined) contextTiles.push({ label: 'Total Amount', value: `PKR ${Number(meta.totalAmount).toLocaleString()}` });
            if (meta.discountAmount !== undefined) contextTiles.push({ label: 'Discount Amount', value: `PKR ${Number(meta.discountAmount).toFixed(2)}` });
            if (meta.grossAmount !== undefined) contextTiles.push({ label: 'Gross Sale', value: `PKR ${Number(meta.grossAmount).toFixed(2)}` });
            if (meta.discountPercentage !== undefined) contextTiles.push({ label: 'Discount Rate', value: `${meta.discountPercentage}%` });
            if (meta.voidedTransactions !== undefined && meta.totalTransactions !== undefined) {
              contextTiles.push({ label: 'Void Ratio', value: `${meta.voidedTransactions} / ${meta.totalTransactions} sales` });
            }
            if (meta.storeAvgRatePercent !== undefined) contextTiles.push({ label: 'Store Average', value: `${meta.storeAvgRatePercent}%` });
            if (meta.adjustmentCount !== undefined) contextTiles.push({ label: 'Write-off Incidents', value: `${meta.adjustmentCount} times` });

            return (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
                {/* Evidence Overview Box */}
                <div className="p-4 sm:p-4.5 rounded-2xl border border-border/70 bg-muted/20 space-y-3.5 shadow-2xs">
                  {/* Category Pill + Severity Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${cfg.color} shrink-0`}>
                        <Icon className="size-3.5" />
                      </div>
                      <Badge variant="secondary" className="font-semibold text-micro uppercase tracking-wider bg-muted/80 text-foreground">
                        {cfg.label}
                      </Badge>
                    </div>

                    {SEVERITY_CONFIG[selectedFlag.severity] && (
                      <StatusBadge
                        variant={SEVERITY_CONFIG[selectedFlag.severity].variant}
                        size="xs"
                        className="shrink-0"
                      >
                        {SEVERITY_CONFIG[selectedFlag.severity].label}
                      </StatusBadge>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                      {selectedFlag.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedFlag.description}
                    </p>
                  </div>

                  {/* Staff, Location & Timestamp Meta Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Staff Involved
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                          {selectedFlag.user?.name ? selectedFlag.user.name.slice(0, 1).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block text-xs">
                            {selectedFlag.user?.name || 'System Recorded'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Store Location
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground truncate text-xs">
                          {selectedFlag.storeName || (activeStore ? activeStore.name : 'Primary Branch')}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                        Detected On
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground tabular-nums whitespace-nowrap text-xs">
                          {new Date(selectedFlag.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                          {new Date(selectedFlag.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Structured Context Evidence */}
                  {contextTiles.length > 0 && (
                    <div className="pt-2.5 border-t border-border/50 space-y-1.5">
                      <span className="text-muted-foreground block text-micro font-semibold uppercase tracking-wider">
                        Transaction Context Evidence
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {contextTiles.map((tile, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              {tile.label}
                            </span>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className="text-xs font-bold text-foreground font-mono select-all break-all">
                                {tile.value}
                              </span>
                              {tile.isCopyable && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyReceipt(tile.value)}
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0 p-0.5"
                                  title="Copy reference"
                                >
                                  {copiedReceipt ? (
                                    <Check className="size-3 text-success" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Manager Review Decision
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        status: AnomalyStatus.UNDER_REVIEW,
                        label: 'Investigating',
                        desc: 'Interviewing staff or reviewing register data',
                        icon: Clock,
                        activeClass: 'border-info/60 bg-info/10 text-info ring-1 ring-info/50',
                      },
                      {
                        status: AnomalyStatus.RESOLVED,
                        label: 'Resolved & Authorized',
                        desc: 'Authorized variance or resolved procedural error',
                        icon: CheckCircle2,
                        activeClass: 'border-success/60 bg-success/10 text-success ring-1 ring-success/50',
                      },
                      {
                        status: AnomalyStatus.DISMISSED,
                        label: 'Dismissed',
                        desc: 'False positive or non-actionable variance',
                        icon: X,
                        activeClass: 'border-muted-foreground/50 bg-muted text-foreground ring-1 ring-border',
                      },
                    ].map((opt) => {
                      const ButtonIcon = opt.icon;
                      const isSelected = resolutionStatus === opt.status;
                      return (
                        <button
                          type="button"
                          key={opt.status}
                          onClick={() => setResolutionStatus(opt.status)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? opt.activeClass
                              : 'border-border/60 hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            <ButtonIcon className="size-3.5" />
                            <span>{opt.label}</span>
                          </div>
                          <div className="text-micro text-muted-foreground leading-tight mt-1">
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resolution Note Textarea with Quick Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Manager Resolution Rationale
                    </label>
                    <span className="text-micro text-muted-foreground font-normal flex items-center gap-1">
                      <Lock className="size-2.5 text-primary" />
                      Logged in immutable compliance audit trail
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Document resolution findings, authorization rationale, or staff coaching details..."
                    className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed custom-scrollbar shadow-2xs"
                  />

                  {/* Suggested Rationale Presets */}
                  {presets.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Quick Presets (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {presets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setResolutionNote(preset)}
                            className="text-micro px-2.5 py-1 rounded-lg bg-card border border-border/70 hover:border-primary/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-left cursor-pointer shadow-2xs"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Previous Review Info if already reviewed */}
                {selectedFlag.reviewedBy && (
                  <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground flex items-center gap-2 border border-border/50">
                    <CheckCircle2 className="size-4 text-success shrink-0" />
                    <span>
                      Previously reviewed by{' '}
                      <strong className="text-foreground">
                        {selectedFlag.reviewedBy.name}
                      </strong>{' '}
                      on{' '}
                      {selectedFlag.reviewedAt
                        ? new Date(selectedFlag.reviewedAt).toLocaleString()
                        : 'earlier date'}
                      .
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter className="p-3.5 sm:p-4 border-t border-border/70 bg-muted/20 shrink-0 flex flex-row items-center justify-between gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-micro text-muted-foreground">
              <Lock className="size-3 text-primary" />
              <span>Immutable DRAP/Compliance Log</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFlag(null)}
                disabled={isSubmittingReview}
                className="h-8.5 px-3 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitResolution}
                disabled={isSubmittingReview}
                className="h-8.5 px-3.5 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer gap-1.5"
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm &amp; Save Resolution</span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
