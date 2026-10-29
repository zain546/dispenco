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
      <Card className="border border-border/80 sm:border-primary/20 bg-muted/20 sm:bg-linear-to-r sm:from-primary/5 sm:via-primary/10 sm:to-background shadow-xs overflow-hidden">
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
                  className="bg-primary/10 text-primary border-primary/25 text-[10px] sm:text-micro font-semibold px-1.5 py-0"
                >
                  Statistical Baselines
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
                            {flag.metricObserved !== null &&
                            flag.metricObserved !== undefined ? (
                              <div className="space-y-1 tabular-nums text-xs">
                                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                                  <span className="text-muted-foreground font-normal">
                                    Observed:
                                  </span>
                                  <span>{flag.metricObserved}</span>
                                </div>
                                {flag.metricBaseline !== null &&
                                  flag.metricBaseline !== undefined && (
                                    <div className="text-muted-foreground text-micro">
                                      <span>Baseline: </span>
                                      <span>{flag.metricBaseline}</span>
                                    </div>
                                  )}
                                {flag.statisticalScore !== null &&
                                  flag.statisticalScore !== undefined && (
                                    <Badge
                                      variant="secondary"
                                      className="text-micro px-1 py-0"
                                    >
                                      Score: {flag.statisticalScore}x
                                    </Badge>
                                  )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Standard threshold
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              <User className="size-3.5 text-muted-foreground shrink-0" />
                              <span>
                                {flag.user?.name || 'Automated Activity'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-micro">
                              <Building2 className="size-3 shrink-0" />
                              <span>
                                {flag.storeName ||
                                  (activeStore
                                    ? activeStore.name
                                    : 'All Stores')}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FileCheck2 className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">
                  Operational Discrepancy Review
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review statistical variance evidence and log managerial
                  resolution rationale.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 py-2">
              {/* Evidence Overview Box */}
              <div className="p-4 rounded-lg border border-border/70 bg-muted/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      {selectedFlag.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedFlag.description}
                    </p>
                  </div>
                  {SEVERITY_CONFIG[selectedFlag.severity] && (
                    <StatusBadge
                      variant={
                        SEVERITY_CONFIG[selectedFlag.severity].variant
                      }
                      size="xs"
                    >
                      {SEVERITY_CONFIG[selectedFlag.severity].label}
                    </StatusBadge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-micro">
                      Staff Involved
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedFlag.user?.name || 'System Recorded'}
                    </span>
                    {selectedFlag.user?.email && (
                      <span className="text-muted-foreground block text-micro">
                        {selectedFlag.user.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-micro">
                      Store Location
                    </span>
                    <span className="font-medium text-foreground">
                      {selectedFlag.storeName || 'Primary Store'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-micro">
                      Detected On
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                      {new Date(selectedFlag.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Metadata JSON tags */}
                {selectedFlag.metadata &&
                  Object.keys(selectedFlag.metadata).length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      <span className="text-muted-foreground block text-micro mb-1">
                        Transaction Context Evidence:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(selectedFlag.metadata).map(
                          ([k, v]) => (
                            <Badge
                              key={k}
                              variant="secondary"
                              className="text-micro tabular-nums px-1.5 py-0"
                            >
                              {k}: {String(v)}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Manager Review Decision
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      status: AnomalyStatus.UNDER_REVIEW,
                      label: 'Investigating',
                      desc: 'Interviewing staff or reviewing register data',
                    },
                    {
                      status: AnomalyStatus.RESOLVED,
                      label: 'Resolved',
                      desc: 'Authorized variance or resolved procedural error',
                    },
                    {
                      status: AnomalyStatus.DISMISSED,
                      label: 'Dismissed',
                      desc: 'False positive or non-actionable variance',
                    },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.status}
                      onClick={() => setResolutionStatus(opt.status)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        resolutionStatus === opt.status
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border/60 hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-semibold text-xs text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-micro text-muted-foreground leading-tight mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Note Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Manager Resolution Rationale</span>
                  <span className="text-micro text-muted-foreground font-normal">
                    Logged in tamper-proof compliance audit trail
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Authorized clearance sale approved for short-dated stock; or Cashier completed returns policy refresher session."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Previous Review Info if already reviewed */}
              {selectedFlag.reviewedBy && (
                <div className="p-2.5 rounded-md bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
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
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFlag(null)}
              disabled={isSubmittingReview}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitResolution}
              disabled={isSubmittingReview}
              className="text-xs font-semibold"
            >
              {isSubmittingReview
                ? 'Saving Resolution...'
                : 'Confirm & Save Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
