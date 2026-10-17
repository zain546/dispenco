'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShieldAlert,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Package,
  Key,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
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

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Operations' },
  { id: 'stock', label: 'Stock Adjustments' },
  { id: 'sales', label: 'Voids & Returns' },
  { id: 'security', label: 'Security & Access' },
  { id: 'transfers', label: 'Branch Transfers' },
  { id: 'pricing', label: 'Pricing Broadcasts' },
];

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

  // Payload detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

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

  const getSeverityBadge = (severity: 'info' | 'warning' | 'critical') => {
    if (severity === 'critical') {
      return (
        <StatusBadge variant="danger" size="xs">
          Critical
        </StatusBadge>
      );
    }
    if (severity === 'warning') {
      return (
        <StatusBadge variant="warning" size="xs">
          Warning
        </StatusBadge>
      );
    }
    return (
      <StatusBadge variant="neutral" size="xs">
        Info
      </StatusBadge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              Official Regulatory Compliance & Inspection Log
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every sensitive pharmacy action (stock adjustments, voided sales, role modifications, API keys) is cryptographically stamped into an append-only audit trail for drug inspectors and internal audits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={isExportingCsv || items.length === 0}
            className="gap-1.5 text-xs font-medium"
          >
            {isExportingCsv ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
            )}
            Download CSV
          </Button>

          <Button
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf || items.length === 0}
            className="gap-1.5 text-xs font-medium shadow-xs"
          >
            {isExportingPdf ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            Export Inspection PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={summary?.totalEvents ?? totalCount}
          caption="Recorded in selected window"
          icon={ShieldCheck}
          variant="default"
        />
        <StatCard
          title="Sale Voids & Reversals"
          value={summary?.voidsCount ?? 0}
          caption="Transaction cancellations"
          icon={AlertTriangle}
          variant={summary && summary.voidsCount > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Stock Adjustments"
          value={summary?.stockAdjustmentsCount ?? 0}
          caption="Damage, shrinkage, loss"
          icon={Package}
          variant={summary && summary.stockAdjustmentsCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Security & Permissions"
          value={summary?.securityEventsCount ?? 0}
          caption="Roles, keys, invitations"
          icon={Key}
          variant="default"
        />
      </div>

      {/* Controls: Date Filter & Search */}
      <Card className="border-border/80">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === cat.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              {(['today', '7d', '30d', 'month', 'all'] as PresetRange[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPreset(p);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    preset === p
                      ? 'bg-secondary text-secondary-foreground font-semibold border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : p === 'month' ? 'Month' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar & Refresh */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/60">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search action code, entity ID, or reason narrative..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditData}
              disabled={isLoading}
              className="h-9 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / States */}
      {isLoading ? (
        <div className="rounded-xl border border-border/70 bg-card p-6 shadow-xs">
          <TableSkeleton columns={6} rows={6} />
        </div>
      ) : fetchError ? (
        <div className="rounded-xl border border-border/70 bg-card p-8 shadow-xs">
          <ErrorState
            title="Failed to Load Audit Logs"
            description={fetchError}
            onRetry={fetchAuditData}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 bg-card">
          <EmptyState
            icon={ShieldCheck}
            title="No Matching Audit Events"
            description="No actions matched the current filter criteria or date window."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (Visible on < md) */}
          <div className="md:hidden space-y-3">
            {items.map((log) => {
              const d = new Date(log.createdAt);
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-xs text-foreground font-mono">
                        {log.action}
                      </span>
                      <div className="text-micro text-muted-foreground">
                        {log.entityType} • {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {getSeverityBadge(log.severity)}
                  </div>

                  <p className="text-xs text-foreground leading-relaxed">
                    {log.summaryText}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
                      <span className="font-medium text-foreground">{log.user?.name || 'System'}</span>
                      {log.user?.role && (
                        <span className="text-muted-foreground">({log.user.role})</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => setSelectedLog(log)}
                      aria-label="Inspect raw audit metadata"
                    >
                      <Eye className="size-3.5" />
                      <span>Payload</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Visible on >= md) */}
          <div className="hidden md:block rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-transparent">
                  <TableHead className="w-[170px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[200px]">Action & Scope</TableHead>
                  <TableHead>Event Narrative & Reason</TableHead>
                  <TableHead className="w-[180px]">Responsible Actor</TableHead>
                  <TableHead className="text-right w-[80px]">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => {
                  const d = new Date(log.createdAt);
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      {/* Timestamp */}
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        <div>{d.toLocaleDateString()}</div>
                        <div className="text-micro text-muted-foreground/75">
                          {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </TableCell>

                      {/* Severity */}
                      <TableCell>{getSeverityBadge(log.severity)}</TableCell>

                      {/* Action */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-foreground font-mono">
                            {log.action}
                          </span>
                          <div className="text-micro text-muted-foreground">
                            {log.entityType}: <code className="text-micro">{log.entityId.slice(0, 10)}...</code>
                          </div>
                        </div>
                      </TableCell>

                      {/* Narrative Summary */}
                      <TableCell className="text-xs text-foreground font-normal leading-relaxed">
                        {log.summaryText}
                      </TableCell>

                      {/* Actor */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-medium text-foreground">
                            {log.user?.name || 'System Automated'}
                          </div>
                          {log.user?.role && (
                            <Badge variant="outline" className="text-micro px-1 py-0 font-normal">
                              {log.user.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* View Payload */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <div>
              Showing Page <span className="font-semibold text-foreground">{page}</span> of{' '}
              <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} total events)
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 gap-1"
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <DialogTitle className="text-lg">Immutable Audit Record Details</DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs">
              ID: {selectedLog?.id} • Action: {selectedLog?.action}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <p className="font-medium font-mono pt-0.5">{new Date(selectedLog.createdAt).toISOString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor:</span>
                  <p className="font-medium pt-0.5">{selectedLog.user?.name || 'System'} ({selectedLog.user?.email || 'N/A'})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity Type:</span>
                  <p className="font-medium font-mono pt-0.5">{selectedLog.entityType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>
                  <p className="font-medium font-mono pt-0.5">{selectedLog.entityId}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Human Narrative:</span>
                <p className="text-xs text-muted-foreground p-3 rounded-lg border bg-card leading-relaxed">
                  {selectedLog.summaryText}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">Structured Metadata JSON:</span>
                <pre className="p-3 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono max-h-60 overflow-y-auto leading-relaxed border border-border/40 select-all">
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
