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
  HelpCircle,
  FileCheck2,
  ShieldCheck,
  Building2,
  User,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
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
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    desc: 'Cashier void or cancellation rate significantly exceeds store baseline.',
  },
  [AnomalyType.EXCESSIVE_DISCOUNT]: {
    label: 'Excessive Discount',
    icon: TrendingDown,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    desc: 'Discretionary discounts exceeding policy limits or 25% of gross sale.',
  },
  [AnomalyType.AFTER_HOURS_SALE]: {
    label: 'After-Hours Sale',
    icon: Moon,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    desc: 'Register checkout recorded outside normal retail operating hours.',
  },
  [AnomalyType.BELOW_COST_SALE]: {
    label: 'Below-Cost Sale',
    icon: AlertTriangle,
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
    desc: 'Line items sold below batch acquisition cost, damaging gross margin.',
  },
  [AnomalyType.REPETITIVE_SHRINKAGE]: {
    label: 'Recurrent Shrinkage',
    icon: PackageMinus,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    desc: 'Frequent manual stock adjustments or write-offs logged by staff member.',
  },
};

const SEVERITY_BADGES: Record<AnomalySeverity, { label: string; className: string }> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-destructive/15 text-destructive border-destructive/30 font-semibold',
  },
  HIGH: {
    label: 'High Variance',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium',
  },
  MEDIUM: {
    label: 'Moderate',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  LOW: {
    label: 'Informational',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

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
  const [isScanning, setIsScanning] = useState(false);

  // Review & Resolution Dialog State
  const [selectedFlag, setSelectedFlag] = useState<AnomalyFlagItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<AnomalyStatus>(AnomalyStatus.RESOLVED);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await anomaliesApi.getSummary();
      setSummary(data);
    } catch (err: unknown) {
      console.error('Failed to load integrity summary:', err);
    }
  }, []);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeParam = !isAllStores && activeStoreId ? activeStoreId : undefined;
      const res = await anomaliesApi.getAnomalies({
        status: statusFilter,
        type: typeFilter,
        storeId: storeParam,
        page,
        limit,
      });

      setFlags(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: unknown) {
      toast.error('Failed to load discrepancy flags', {
        description: getErrorMessage(err),
      });
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

  // Filter flags locally by search query if user searches title/staff/description
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
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="size-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Operational Integrity & Discrepancies</h2>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
              Statistical Baselines
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Continuous variance monitoring across cash registers, discretionary discounting, out-of-hours checkouts, and inventory shrinkage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSummary();
              fetchFlags();
            }}
            disabled={isLoading || isScanning}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleRunScan}
            disabled={isScanning}
            className="h-9 gap-2 text-xs font-semibold shadow-xs"
          >
            <Sparkles className={`size-3.5 text-amber-400 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Analyzing Transactions...' : 'Run Integrity Scan'}
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              ? `${summary.pendingReviewCount} items require review`
              : 'Zero active variance alerts'
          }
        />

        <StatCard
          title="Requires Manager Review"
          value={summary?.pendingReviewCount ?? 0}
          icon={AlertTriangle}
          variant={(summary?.pendingReviewCount ?? 0) > 0 ? 'warning' : 'default'}
          caption={
            summary?.criticalSeverityCount
              ? `${summary.criticalSeverityCount} critical variances`
              : 'Unresolved register & stock flags'
          }
        />

        <StatCard
          title="Under Investigation"
          value={summary?.investigatingCount ?? 0}
          icon={Clock}
          caption="Actively being reviewed with staff"
        />

        <StatCard
          title="Resolved & Documented"
          value={(summary?.resolvedCount ?? 0) + (summary?.dismissedCount ?? 0)}
          icon={CheckCircle2}
          variant="success"
          caption="Documented with resolution rationale"
        />
      </div>

      {/* Main Review Section */}
      <Card className="border-border/60 shadow-2xs">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: 'All Discrepancies', count: summary?.totalFlags },
                { id: AnomalyStatus.FLAGGED, label: 'Pending Review', count: summary?.pendingReviewCount },
                { id: AnomalyStatus.UNDER_REVIEW, label: 'Under Review', count: summary?.investigatingCount },
                { id: AnomalyStatus.RESOLVED, label: 'Resolved', count: summary?.resolvedCount },
                { id: AnomalyStatus.DISMISSED, label: 'Dismissed', count: summary?.dismissedCount },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={statusFilter === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(tab.id as AnomalyStatus | 'ALL');
                    setPage(1);
                  }}
                  className="h-8 text-xs font-medium gap-1.5 px-3"
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 ${
                        statusFilter === tab.id
                          ? 'border-primary-foreground/30 text-primary-foreground bg-primary-foreground/15'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search staff, receipt, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Rule Type Selector */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Rule Type:
            </span>
            <Button
              variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setTypeFilter('ALL');
                setPage(1);
              }}
              className="h-7 text-xs px-2.5"
            >
              All Variance Rules
            </Button>
            {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
              const Icon = cfg.icon;
              const count = summary?.breakdownByType?.[typeKey] || 0;
              return (
                <Button
                  key={typeKey}
                  variant={typeFilter === typeKey ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(typeKey as AnomalyType);
                    setPage(1);
                  }}
                  className="h-7 text-xs px-2.5 gap-1.5"
                >
                  <Icon className="size-3 shrink-0" />
                  <span>{cfg.label}</span>
                  {count > 0 && (
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  )}
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <span>Evaluating statistical transaction baselines...</span>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-xs font-semibold">Discrepancy Details</TableHead>
                    <TableHead className="text-xs font-semibold">Variance vs Baseline</TableHead>
                    <TableHead className="text-xs font-semibold">Store & Staff Member</TableHead>
                    <TableHead className="text-xs font-semibold">Status & Timestamp</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
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
                    const sev = SEVERITY_BADGES[flag.severity] || SEVERITY_BADGES.MEDIUM;

                    return (
                      <TableRow key={flag.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="pl-4 pr-1">
                          <div className={`p-2 rounded-lg border ${cfg.color} shrink-0`}>
                            <Icon className="size-4" />
                          </div>
                        </TableCell>

                        <TableCell className="space-y-1 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {flag.title}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sev.className}`}>
                              {sev.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground max-w-md line-clamp-2">
                            {flag.description}
                          </p>
                        </TableCell>

                        <TableCell className="text-xs">
                          {flag.metricObserved !== null && flag.metricObserved !== undefined ? (
                            <div className="space-y-1 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                                <span className="text-muted-foreground font-normal">Observed:</span>
                                <span>{flag.metricObserved}</span>
                              </div>
                              {flag.metricBaseline !== null && flag.metricBaseline !== undefined && (
                                <div className="text-muted-foreground">
                                  <span>Baseline: </span>
                                  <span>{flag.metricBaseline}</span>
                                </div>
                              )}
                              {flag.statisticalScore !== null && flag.statisticalScore !== undefined && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 font-sans">
                                  Score: {flag.statisticalScore}x
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Standard threshold</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <User className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{flag.user?.name || 'Automated Activity'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Building2 className="size-3 shrink-0" />
                            <span>{flag.storeName || (activeStore ? activeStore.name : 'All Stores')}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs space-y-1">
                          <div>
                            {flag.status === AnomalyStatus.FLAGGED ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium">
                                Pending Review
                              </Badge>
                            ) : flag.status === AnomalyStatus.UNDER_REVIEW ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium">
                                In Investigation
                              </Badge>
                            ) : flag.status === AnomalyStatus.RESOLVED ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                                Resolved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border font-medium">
                                Dismissed
                              </Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            {new Date(flag.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
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
      <Dialog open={!!selectedFlag} onOpenChange={(open) => !open && setSelectedFlag(null)}>
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
                  Review statistical variance evidence and log managerial resolution rationale.
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
                  <Badge variant="outline" className={SEVERITY_BADGES[selectedFlag.severity]?.className}>
                    {selectedFlag.severity}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Staff Involved</span>
                    <span className="font-medium text-foreground">
                      {selectedFlag.user?.name || 'System Recorded'}
                    </span>
                    {selectedFlag.user?.email && (
                      <span className="text-muted-foreground block text-[10px]">
                        {selectedFlag.user.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Store Location</span>
                    <span className="font-medium text-foreground">
                      {selectedFlag.storeName || 'Primary Store'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Detected On</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedFlag.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Metadata JSON tags */}
                {selectedFlag.metadata && Object.keys(selectedFlag.metadata).length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-muted-foreground block text-[11px] mb-1">
                      Transaction Context Evidence:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedFlag.metadata).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                          {k}: {String(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Manager Review Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      status: AnomalyStatus.UNDER_REVIEW,
                      label: 'Investigating',
                      desc: 'Interviewing staff or reviewing CCTV/receipts',
                      className: 'border-blue-500/40 text-blue-600',
                    },
                    {
                      status: AnomalyStatus.RESOLVED,
                      label: 'Resolved',
                      desc: 'Legitimate authorized variance or resolved error',
                      className: 'border-emerald-500/40 text-emerald-600',
                    },
                    {
                      status: AnomalyStatus.DISMISSED,
                      label: 'Dismissed',
                      desc: 'False positive or non-actionable variance',
                      className: 'border-border text-muted-foreground',
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
                      <div className="font-semibold text-xs text-foreground">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
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
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Logged in tamper-proof compliance audit trail
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Authorized clearance sale approved by Dr. Zain for short-dated antibiotics; or Cashier completed returns policy refresher session."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Previous Review Info if already reviewed */}
              {selectedFlag.reviewedBy && (
                <div className="p-2.5 rounded-md bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>
                    Previously reviewed by <strong className="text-foreground">{selectedFlag.reviewedBy.name}</strong> on{' '}
                    {selectedFlag.reviewedAt ? new Date(selectedFlag.reviewedAt).toLocaleString() : 'earlier date'}.
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
              {isSubmittingReview ? 'Saving Resolution...' : 'Confirm & Save Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
