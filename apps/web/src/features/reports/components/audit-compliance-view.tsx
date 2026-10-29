'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  AlertTriangle,
  ShieldCheck,
  Package,
  Key,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Code,
  Copy,
  Check,
  RotateCcw,
  ArrowRightLeft,
  CreditCard,
  Tag,
  Layers,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
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
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { AuditLogItem, AuditMetricsSummary } from '@dispenco/types';
import { auditApi } from '../services/audit-api';
import { generateAuditPdf } from '../utils/audit-pdf-generator';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';

type PresetRange = 'today' | '7d' | '30d' | 'month' | 'all';

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ElementType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'All Operations', icon: Layers },
  { id: 'stock', label: 'Stock Adjustments', icon: Package },
  { id: 'sales', label: 'Voids & Returns', icon: AlertTriangle },
  { id: 'security', label: 'Security & Access', icon: Key },
  { id: 'transfers', label: 'Branch Transfers', icon: ArrowRightLeft },
  { id: 'pricing', label: 'Pricing Broadcasts', icon: Tag },
];

function formatActionTitle(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getActionIcon(action: string) {
  const a = action.toUpperCase();
  if (a.includes('STOCK')) return Package;
  if (a.includes('VOID') || a.includes('RETURN')) return AlertTriangle;
  if (a.includes('TRANSFER')) return ArrowRightLeft;
  if (a.includes('KEY') || a.includes('STAFF') || a.includes('ROLE')) return Key;
  if (a.includes('CREDIT') || a.includes('KHATA')) return CreditCard;
  if (a.includes('PRICE') || a.includes('BROADCAST')) return Tag;
  return ShieldCheck;
}

export function AuditComplianceView() {
  const { activeStore } = useStore();

  const [preset, setPreset] = useState<PresetRange>('30d');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [summary, setSummary] = useState<AuditMetricsSummary | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Payload detail modal state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const calculateDateRange = (selectedPreset: PresetRange) => {
    if (selectedPreset === 'all') return { startDate: undefined, endDate: undefined };

    const end = new Date();
    const start = new Date();

    if (selectedPreset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (selectedPreset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (selectedPreset === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (selectedPreset === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const fetchAuditData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { startDate, endDate } = calculateDateRange(preset);

      const params: any = {
        page,
        limit,
        startDate,
        endDate,
      };

      if (category !== 'all') {
        params.category = category;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const [logsRes, summaryRes] = await Promise.all([
        auditApi.getAuditLogs(params),
        auditApi.getAuditSummary(params),
      ]);

      setItems(logsRes.items);
      setTotalPages(logsRes.pagination.totalPages || 1);
      setTotalCount(logsRes.pagination.total || 0);
      setSummary(summaryRes);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load compliance audit logs');
      setFetchError(msg);
      toast.error('Failed to load compliance audit logs', {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  }, [preset, category, search, page]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const { startDate, endDate } = calculateDateRange(preset);
      const params: any = { startDate, endDate };
      if (category !== 'all') params.category = category;
      if (search.trim()) params.search = search.trim();

      await auditApi.downloadAuditCsv(params);
      toast.success('Inspection audit CSV downloaded');
    } catch (err) {
      toast.error('Failed to export CSV report', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const categoryLabel =
        CATEGORY_OPTIONS.find((c) => c.id === category)?.label || 'All Events';
      const rangeLabel =
        preset === 'today'
          ? 'Today'
          : preset === '7d'
          ? 'Last 7 Days'
          : preset === '30d'
          ? 'Last 30 Days'
          : preset === 'month'
          ? 'This Month'
          : 'All Recorded Time';

      await generateAuditPdf({
        pharmacyName: 'Dispenco Pharmacy Network',
        storeName: activeStore?.name || 'Main Pharmacy Branch',
        items,
        summary,
        dateRangeStr: rangeLabel,
        filterCategory: categoryLabel,
      });

      toast.success('Official compliance PDF dossier generated');
    } catch (err) {
      toast.error('Failed to generate PDF audit report', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyPayloadJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.metadata, null, 2));
    setCopiedPayload(true);
    toast.success('Audit payload JSON copied to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const renderSeverityBadge = (severity: 'info' | 'warning' | 'critical') => {
    if (severity === 'critical') {
      return (
        <Badge
          variant="outline"
          className="bg-destructive/10 text-destructive border-destructive/25 text-micro font-semibold uppercase tracking-wider gap-1 px-2 py-0.5"
        >
          <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
          Critical
        </Badge>
      );
    }
    if (severity === 'warning') {
      return (
        <Badge
          variant="outline"
          className="bg-warning/10 text-warning border-warning/30 text-micro font-semibold uppercase tracking-wider gap-1 px-2 py-0.5"
        >
          <span className="size-1.5 rounded-full bg-warning" />
          Warning
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-muted text-muted-foreground border-border/80 text-micro font-medium uppercase tracking-wider px-2 py-0.5"
      >
        Info
      </Badge>
    );
  };

  const hasActiveFilters = category !== 'all' || search.trim() !== '' || preset !== '30d';

  const resetAllFilters = () => {
    setCategory('all');
    setSearch('');
    setPreset('30d');
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner Notice: Regulatory & Inspection Readiness */}
      <Card className="border border-border/80 sm:border-primary/20 bg-muted/20 sm:bg-linear-to-r sm:from-primary/5 sm:via-primary/10 sm:to-background shadow-xs overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center sm:items-start gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 md:size-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs ring-2 sm:ring-4 ring-primary/5">
              <ShieldAlert className="size-4.5 sm:size-5 md:size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm md:text-base text-foreground leading-tight">
                  Inspection Audit Trail
                </h3>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/25 text-[10px] sm:text-micro font-semibold px-1.5 py-0"
                >
                  Append-Only
                </Badge>
              </div>
              <p className="text-micro sm:text-xs text-muted-foreground mt-0.5 leading-relaxed hidden sm:block max-w-2xl">
                Every sensitive pharmacy action (stock adjustments, voided sales, khata, staff roles) is cryptographically recorded for regulatory compliance.
              </p>
            </div>

            {/* Mobile Actions in Header Row */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExportingCsv || items.length === 0}
                className="h-8 px-2.5 gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Download CSV"
              >
                {isExportingCsv ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FileSpreadsheet className="size-3.5 text-primary" />
                )}
                <span>CSV</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf || items.length === 0}
                className="h-8 px-2.5 gap-1 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
                title="Export Inspection PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                <span>PDF</span>
              </Button>
            </div>
          </div>

          {/* Desktop Export Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={isExportingCsv || items.length === 0}
              className="h-9 px-3 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              {isExportingCsv ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-3.5 text-primary" />
              )}
              <span>Download CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={isExportingPdf || items.length === 0}
              className="h-9 px-3.5 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs cursor-pointer"
            >
              {isExportingPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileText className="size-3.5" />
              )}
              <span>Export PDF Dossier</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards: 2-column grid on mobile, 4-column on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Audit Events"
          value={summary?.totalEvents ?? totalCount}
          caption="Logged in time window"
          icon={ShieldCheck}
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          title="Sale Voids & Reversals"
          value={summary?.voidsCount ?? 0}
          caption="Transaction cancellations"
          icon={AlertTriangle}
          variant={summary && summary.voidsCount > 0 ? 'destructive' : 'default'}
          isLoading={isLoading}
        />
        <StatCard
          title="Stock Adjustments"
          value={summary?.stockAdjustmentsCount ?? 0}
          caption="Shrinkage, damage, expiry"
          icon={Package}
          variant={summary && summary.stockAdjustmentsCount > 0 ? 'warning' : 'default'}
          isLoading={isLoading}
        />
        <StatCard
          title="Security & Permissions"
          value={summary?.securityEventsCount ?? 0}
          caption="Roles, keys, invitations"
          icon={Key}
          variant="default"
          isLoading={isLoading}
        />
      </div>

      {/* Filter & Control Hub */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 space-y-3 sm:space-y-3.5">
          {/* Top Row: Category Pills + Preset Times */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Horizontal Scrollable Category Filter */}
            <div className="space-y-1">
              <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider block sm:hidden">
                Filter by Operation
              </span>
              <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
                <div className="flex items-center gap-1.5 w-max">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          setPage(1);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <Icon className={`size-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeframe Presets Segmented Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 lg:pt-0">
              <span className="text-micro font-semibold text-muted-foreground sm:hidden">Timeframe:</span>
              <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-fit">
                {(['today', '7d', '30d', 'month', 'all'] as PresetRange[]).map((p) => {
                  const isActive = preset === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPreset(p);
                        setPage(1);
                      }}
                      className={`h-7 px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {p === 'today'
                        ? 'Today'
                        : p === '7d'
                        ? '7D'
                        : p === '30d'
                        ? '30D'
                        : p === 'month'
                        ? 'Month'
                        : 'All'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search bar & Refresh Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search action code, entity ID, user, or reason..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1 cursor-pointer shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditData}
              disabled={isLoading}
              className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Mobile Cards / State Container */}
      {isLoading ? (
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
          <TableSkeleton columns={6} rows={6} />
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-xs">
          <ErrorState
            title="Failed to Load Audit Logs"
            description={fetchError}
            onRetry={fetchAuditData}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 bg-card text-center">
          <EmptyState
            icon={ShieldCheck}
            title="No Matching Audit Events"
            description="No actions matched the current filter criteria or date window."
          />
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAllFilters}
              className="mt-4 text-xs font-semibold cursor-pointer"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (Visible on < md) */}
          <div className="md:hidden space-y-2.5">
            {items.map((log) => {
              const d = new Date(log.createdAt);
              const ActionIcon = getActionIcon(log.action);
              const formattedTitle = formatActionTitle(log.action);

              return (
                <div
                  key={log.id}
                  className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
                >
                  {/* Card Header: Icon + Title + Severity */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <ActionIcon className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {formattedTitle}
                        </span>
                        <div className="flex items-center gap-1.5 text-micro text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/80">{log.entityType}</span>
                          <span>•</span>
                          <span className="tabular-nums">
                            {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {renderSeverityBadge(log.severity)}
                  </div>

                  {/* Summary Narrative */}
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs text-foreground leading-relaxed">
                    {log.summaryText}
                  </div>

                  {/* Footer Actor + View Payload Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1.5 text-micro text-muted-foreground min-w-0">
                      <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {log.user?.name ? log.user.name.slice(0, 1).toUpperCase() : 'S'}
                      </div>
                      <span className="font-semibold text-foreground truncate max-w-[130px]">
                        {log.user?.name || 'System Automated'}
                      </span>
                      {log.user?.role && (
                        <span className="text-muted-foreground/80">({log.user.role})</span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-micro font-semibold text-primary hover:text-primary hover:bg-primary/5 border-primary/25 gap-1 rounded-lg cursor-pointer shadow-2xs"
                      onClick={() => setSelectedLog(log)}
                      aria-label="Inspect raw audit metadata"
                    >
                      <Code className="size-3" />
                      <span>Payload</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Visible on >= md) */}
          <div className="hidden md:block rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-transparent border-b border-border/70">
                  <TableHead className="w-[170px] text-overline font-semibold">Timestamp</TableHead>
                  <TableHead className="w-[110px] text-overline font-semibold">Severity</TableHead>
                  <TableHead className="w-[210px] text-overline font-semibold">Operation &amp; Scope</TableHead>
                  <TableHead className="text-overline font-semibold">Event Narrative &amp; Reason</TableHead>
                  <TableHead className="w-[190px] text-overline font-semibold">Responsible Actor</TableHead>
                  <TableHead className="text-right w-[85px] text-overline font-semibold">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => {
                  const d = new Date(log.createdAt);
                  const ActionIcon = getActionIcon(log.action);
                  const formattedTitle = formatActionTitle(log.action);

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      {/* Timestamp */}
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        <div className="font-medium text-foreground">{d.toLocaleDateString()}</div>
                        <div className="text-micro text-muted-foreground/75 flex items-center gap-1 mt-0.5">
                          <Clock className="size-2.5" />
                          <span>
                            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Severity */}
                      <TableCell>{renderSeverityBadge(log.severity)}</TableCell>

                      {/* Action */}
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="size-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <ActionIcon className="size-3.5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {formattedTitle}
                            </span>
                            <div className="text-micro text-muted-foreground">
                              {log.entityType}: <code className="text-[10px] text-primary">{log.entityId.slice(0, 10)}...</code>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Narrative Summary */}
                      <TableCell className="text-xs text-foreground font-normal leading-relaxed">
                        {log.summaryText}
                      </TableCell>

                      {/* Actor */}
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                            {log.user?.name ? log.user.name.slice(0, 1).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {log.user?.name || 'System Automated'}
                            </div>
                            {log.user?.role && (
                              <Badge variant="outline" className="text-micro px-1 py-0 font-medium text-muted-foreground mt-0.5">
                                {log.user.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* View Payload */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                          aria-label="Inspect raw audit metadata"
                          title="Inspect raw audit metadata"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-2 py-1">
            <div className="text-center sm:text-left">
              Showing Page <span className="font-bold text-foreground">{page}</span> of{' '}
              <span className="font-bold text-foreground">{totalPages}</span> ({totalCount} total compliance events)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1 rounded-lg cursor-pointer shadow-2xs font-semibold"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <div className="px-2 text-xs font-semibold text-foreground">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1 rounded-lg cursor-pointer shadow-2xs font-semibold"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Payload Inspector Modal */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 pr-12 border-b border-border/70 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Immutable Audit Record
              </DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs text-muted-foreground pt-0.5">
              Event #{selectedLog?.id.slice(0, 16)} • {selectedLog?.action}
            </DialogDescription>
          </DialogHeader>

          {/* Modal Content */}
          {selectedLog && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs p-3.5 rounded-xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-micro uppercase font-semibold text-muted-foreground block">Timestamp</span>
                  <p className="font-semibold text-foreground tabular-nums pt-0.5">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-micro uppercase font-semibold text-muted-foreground block">Actor</span>
                  <p className="font-semibold text-foreground pt-0.5">
                    {selectedLog.user?.name || 'System Automated'}
                  </p>
                </div>
                <div>
                  <span className="text-micro uppercase font-semibold text-muted-foreground block">Entity Scope</span>
                  <p className="font-semibold text-primary pt-0.5 font-mono">
                    {selectedLog.entityType}
                  </p>
                </div>
                <div>
                  <span className="text-micro uppercase font-semibold text-muted-foreground block">Entity ID</span>
                  <p className="font-semibold text-foreground pt-0.5 font-mono truncate" title={selectedLog.entityId}>
                    {selectedLog.entityId}
                  </p>
                </div>
              </div>

              {/* Human Narrative */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">Inspection Summary</span>
                <p className="text-xs text-foreground p-3 rounded-xl border border-border/70 bg-card leading-relaxed">
                  {selectedLog.summaryText}
                </p>
              </div>

              {/* Metadata JSON Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Code className="size-3.5 text-primary" />
                    <span>Cryptographic Metadata Payload</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPayloadJson}
                    className="h-7 px-2 text-micro font-semibold gap-1 cursor-pointer"
                  >
                    {copiedPayload ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                  </Button>
                </div>

                <pre className="p-3.5 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-xl text-micro font-mono max-h-56 overflow-y-auto leading-relaxed border border-border/60 select-all custom-scrollbar">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
