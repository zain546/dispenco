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
  Truck,
  ShoppingBag,
  Bot,
  Lock,
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
  { id: 'purchases', label: 'Procurement & Orders', icon: Truck },
  { id: 'stock', label: 'Stock Adjustments', icon: Package },
  { id: 'sales', label: 'Sales & Returns', icon: AlertTriangle },
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
  if (a.includes('PURCHASE') || a.includes('PO_')) return Truck;
  if (a.includes('STOCK')) return Package;
  if (a.includes('VOID') || a.includes('RETURN')) return AlertTriangle;
  if (a.includes('TRANSFER')) return ArrowRightLeft;
  if (a.includes('KEY') || a.includes('STAFF') || a.includes('ROLE')) return Key;
  if (a.includes('CREDIT') || a.includes('KHATA')) return CreditCard;
  if (a.includes('PRICE') || a.includes('BROADCAST')) return Tag;
  if (a.includes('SALE')) return ShoppingBag;
  return ShieldCheck;
}

interface FormattedNarrative {
  title: string;
  subtitle?: string;
  reason?: string;
}

function formatAuditNarrative(log: AuditLogItem): FormattedNarrative {
  const meta = (log.metadata as Record<string, any>) || {};
  const action = log.action.toUpperCase();

  if (action === 'PURCHASE_ORDER_RECEIVED') {
    const poNum = meta.poNumber || log.entityId.slice(0, 8);
    const supplier = meta.supplierName ? ` from ${meta.supplierName}` : '';
    return {
      title: `Stock intake confirmed for Purchase Order #${poNum}`,
      subtitle: `Received${supplier}. Inventory batches verified and added to shelf.`,
      reason: meta.reason,
    };
  }

  if (action === 'PURCHASE_ORDER_CREATED') {
    const poNum = meta.poNumber || log.entityId.slice(0, 8);
    return {
      title: `Initiated Purchase Order #${poNum}`,
      subtitle: meta.supplierName ? `Dispatched procurement order to ${meta.supplierName}` : 'Procurement order drafted.',
      reason: meta.reason,
    };
  }

  if (action === 'PURCHASE_ORDER_CANCELLED') {
    const poNum = meta.poNumber || log.entityId.slice(0, 8);
    return {
      title: `Cancelled Purchase Order #${poNum}`,
      subtitle: 'Procurement transaction aborted.',
      reason: meta.reason || meta.cancelReason || 'Distributor cancelled',
    };
  }

  if (action === 'SALE_CREATE' || action === 'SALE_CREATED') {
    const receiptNum = meta.receiptNumber || meta.saleNumber || log.entityId.slice(0, 8);
    const amountStr = meta.totalAmount ? ` • PKR ${Number(meta.totalAmount).toLocaleString()}` : '';
    const itemsStr = meta.itemsCount ? ` • ${meta.itemsCount} item(s)` : '';
    return {
      title: `POS counter sale dispensed: Receipt #${receiptNum}`,
      subtitle: `Customer checkout completed${amountStr}${itemsStr}.`,
    };
  }

  if (action === 'SALE_VOIDED') {
    const saleNum = meta.saleNumber || meta.saleId || log.entityId.slice(0, 8);
    return {
      title: `Voided sales transaction #${saleNum}`,
      subtitle: meta.totalAmount ? `Refunded PKR ${Number(meta.totalAmount).toLocaleString()} to customer` : undefined,
      reason: meta.reason || 'Cashier correction',
    };
  }

  if (action === 'SALE_RETURNED' || action === 'SALE_RETURN_PROCESSED') {
    const saleNum = meta.saleId?.slice(0, 8) || log.entityId.slice(0, 8);
    return {
      title: `Customer product return processed for sale #${saleNum}`,
      subtitle: meta.itemsCount ? `${meta.itemsCount} unit(s) restocked into inventory` : 'Items returned to branch shelf',
      reason: meta.reason,
    };
  }

  if (action === 'STOCK_ADJUSTMENT' || action === 'MANUAL_STOCK_ADJUSTMENT') {
    const batchNum = meta.batchNumber || meta.batchId || log.entityId.slice(0, 8);
    const delta = meta.quantityChange ?? meta.delta;
    const deltaStr = delta !== undefined ? (Number(delta) > 0 ? `+${delta}` : `${delta}`) : null;
    return {
      title: `Stock count adjustment for batch #${batchNum}`,
      subtitle: deltaStr ? `Net physical delta: ${deltaStr} unit(s)` : 'Inventory batch adjusted',
      reason: meta.reason || 'Physical shelf count variance',
    };
  }

  if (action.startsWith('API_KEY')) {
    const keyName = meta.name || log.entityId.slice(0, 8);
    if (action.includes('CREATED')) {
      return {
        title: `Created integration API key '${keyName}'`,
        subtitle: meta.keyPrefix ? `Prefix: ${meta.keyPrefix} • Scopes: ${(meta.permissions || []).join(', ') || 'Standard'}` : undefined,
      };
    }
    if (action.includes('REVOKED')) {
      return {
        title: `Revoked integration API key '${keyName}'`,
        subtitle: 'Key access terminated permanently.',
      };
    }
    return {
      title: `API key '${keyName}' status updated`,
      subtitle: meta.isActive ? 'Status: Active' : 'Status: Suspended',
    };
  }

  if (action.includes('TRANSFER')) {
    const transferNum = meta.transferNumber || log.entityId.slice(0, 8);
    if (action.includes('REQUESTED')) {
      return {
        title: `Requested stock transfer #${transferNum}`,
        subtitle: meta.destinationStoreName ? `Transfer to ${meta.destinationStoreName}` : undefined,
      };
    }
    if (action.includes('DISPATCHED')) {
      return {
        title: `Dispatched transfer consignment #${transferNum}`,
        subtitle: 'In transit to destination pharmacy branch',
      };
    }
    if (action.includes('RECEIVED')) {
      return {
        title: `Received transfer consignment #${transferNum}`,
        subtitle: 'Stock merged into active store inventory',
      };
    }
    if (action.includes('CANCELLED')) {
      return {
        title: `Cancelled transfer consignment #${transferNum}`,
        reason: meta.cancelReason || 'Branch declined transfer',
      };
    }
  }

  if (action.includes('CREDIT') || action.includes('KHATA')) {
    const cust = meta.customerName || log.entityId.slice(0, 8);
    return {
      title: `Updated customer khata ledger (${cust})`,
      subtitle: meta.amount ? `Adjusted by PKR ${Number(meta.amount).toLocaleString()}${meta.newBalance !== undefined ? ` • New balance: PKR ${Number(meta.newBalance).toLocaleString()}` : ''}` : undefined,
      reason: meta.reason,
    };
  }

  // Fallback: If backend summaryText has machine debug "ACTION executed on Entity (id)", rephrase cleanly
  const raw = log.summaryText || '';
  if (raw.includes(' executed on ')) {
    return {
      title: `${formatActionTitle(log.action)} recorded on ${log.entityType}`,
      subtitle: `Target Reference #${log.entityId.slice(0, 8)}`,
      reason: meta.reason,
    };
  }

  return {
    title: raw || formatActionTitle(log.action),
    reason: meta.reason,
  };
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
      <Card className="border border-border/80 sm:border-primary/20 bg-muted/20 sm:bg-gradient-to-r sm:from-primary/5 sm:via-primary/10 sm:to-background shadow-xs overflow-hidden">
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
                  className="bg-primary/15 text-primary border-primary/30 text-[10px] sm:text-micro font-mono font-semibold px-2 py-0.5 tracking-wider gap-1 shadow-2xs"
                >
                  <Lock className="size-2.5" />
                  Append-Only Ledger
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
              const narrative = formatAuditNarrative(log);
              const isSystem = !log.user?.name || log.user.name.toLowerCase().includes('system');

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
                        <div className="flex items-center gap-1.5 text-micro text-muted-foreground mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0 uppercase tracking-wider bg-muted/60 text-muted-foreground">
                            {log.entityType}
                          </Badge>
                          <code className="text-[11px] font-mono text-primary font-semibold">
                            #{log.entityId.slice(0, 8)}
                          </code>
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
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs text-foreground space-y-1">
                    <div className="font-medium text-foreground leading-relaxed">
                      {narrative.title}
                    </div>
                    {narrative.subtitle && (
                      <div className="text-micro text-muted-foreground leading-relaxed">
                        {narrative.subtitle}
                      </div>
                    )}
                    {narrative.reason && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-md font-medium mt-1">
                        <span>Reason:</span>
                        <span className="font-semibold">{narrative.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Actor + View Payload Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1.5 text-micro text-muted-foreground min-w-0">
                      {isSystem ? (
                        <>
                          <div className="size-5 rounded-md bg-muted text-muted-foreground border border-border/70 flex items-center justify-center shrink-0">
                            <Bot className="size-3 text-muted-foreground" />
                          </div>
                          <span className="font-semibold text-foreground truncate max-w-[130px]">
                            System Automated
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {log.user?.name ? log.user.name.slice(0, 1).toUpperCase() : 'U'}
                          </div>
                          <span className="font-semibold text-foreground truncate max-w-[130px]">
                            {log.user?.name}
                          </span>
                          {log.user?.role && (
                            <span className="text-muted-foreground/80">({log.user.role})</span>
                          )}
                        </>
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
                  <TableHead className="w-[160px] text-overline font-semibold">Timestamp</TableHead>
                  <TableHead className="w-[105px] text-overline font-semibold">Severity</TableHead>
                  <TableHead className="w-[210px] text-overline font-semibold">Operation &amp; Scope</TableHead>
                  <TableHead className="text-overline font-semibold">Event Narrative &amp; Reason</TableHead>
                  <TableHead className="w-[190px] text-overline font-semibold">Responsible Actor</TableHead>
                  <TableHead className="text-right w-[80px] text-overline font-semibold">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => {
                  const d = new Date(log.createdAt);
                  const ActionIcon = getActionIcon(log.action);
                  const formattedTitle = formatActionTitle(log.action);
                  const narrative = formatAuditNarrative(log);
                  const isSystem = !log.user?.name || log.user.name.toLowerCase().includes('system');

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

                      {/* Operation & Scope */}
                      <TableCell>
                        <div className="flex items-start gap-2.5">
                          <div className="size-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <ActionIcon className="size-4" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {formattedTitle}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0 uppercase tracking-wider bg-muted/60 text-muted-foreground">
                                {log.entityType}
                              </Badge>
                              <code className="text-[11px] font-mono text-primary font-semibold">
                                #{log.entityId.slice(0, 8)}
                              </code>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Narrative Summary */}
                      <TableCell className="text-xs text-foreground font-normal leading-relaxed max-w-md">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">
                            {narrative.title}
                          </div>
                          {narrative.subtitle && (
                            <div className="text-micro text-muted-foreground">
                              {narrative.subtitle}
                            </div>
                          )}
                          {narrative.reason && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-md font-medium">
                              <span>Reason:</span>
                              <span className="font-semibold">{narrative.reason}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Responsible Actor */}
                      <TableCell>
                        {isSystem ? (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="size-7 rounded-lg bg-muted text-muted-foreground border border-border/80 flex items-center justify-center shrink-0">
                              <Bot className="size-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate text-xs">
                                System Automated
                              </div>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium text-muted-foreground mt-0.5 border-border/60">
                                Engine
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="size-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-xs">
                              {log.user?.name ? log.user.name.slice(0, 1).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate text-xs">
                                {log.user?.name}
                              </div>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium text-primary bg-primary/5 border-primary/25 mt-0.5">
                                {log.user?.role || 'Staff'}
                              </Badge>
                            </div>
                          </div>
                        )}
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
          {selectedLog && (() => {
            const narrative = formatAuditNarrative(selectedLog);
            const meta = (selectedLog.metadata as Record<string, any>) || {};
            const keyFields: Array<{ label: string; value: string }> = [];

            if (meta.poNumber) keyFields.push({ label: 'PO Reference', value: `#${meta.poNumber}` });
            if (meta.receiptNumber || meta.saleNumber) keyFields.push({ label: 'Receipt #', value: `#${meta.receiptNumber || meta.saleNumber}` });
            if (meta.supplierName) keyFields.push({ label: 'Supplier / Vendor', value: String(meta.supplierName) });
            if (meta.customerName) keyFields.push({ label: 'Customer', value: String(meta.customerName) });
            if (meta.batchNumber || meta.batchId) keyFields.push({ label: 'Batch ID', value: String(meta.batchNumber || meta.batchId) });
            if (meta.totalAmount !== undefined && meta.totalAmount !== null) keyFields.push({ label: 'Total Amount', value: `PKR ${Number(meta.totalAmount).toLocaleString()}` });
            if (meta.quantityChange !== undefined || meta.delta !== undefined) {
              const d = meta.quantityChange ?? meta.delta;
              keyFields.push({ label: 'Quantity Delta', value: Number(d) > 0 ? `+${d} units` : `${d} units` });
            }
            if (meta.itemsCount) keyFields.push({ label: 'Items Count', value: `${meta.itemsCount} items` });
            if (meta.reason || meta.cancelReason) keyFields.push({ label: 'Audit Reason', value: String(meta.reason || meta.cancelReason) });

            return (
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
                    <p className="font-semibold text-foreground pt-0.5 font-mono truncate select-all" title={selectedLog.entityId}>
                      {selectedLog.entityId}
                    </p>
                  </div>
                </div>

                {/* Key Audit Parameters Grid (if present) */}
                {keyFields.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-micro font-bold uppercase tracking-wider text-muted-foreground block">
                      Key Audit Parameters
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {keyFields.map((field, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                            {field.label}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate block mt-0.5">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Narrative */}
                <div className="space-y-1.5">
                  <span className="text-micro font-bold uppercase tracking-wider text-muted-foreground block">
                    Inspection Narrative &amp; Findings
                  </span>
                  <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1 leading-relaxed">
                    <p className="text-xs font-semibold text-foreground">
                      {narrative.title}
                    </p>
                    {narrative.subtitle && (
                      <p className="text-micro text-muted-foreground">
                        {narrative.subtitle}
                      </p>
                    )}
                    {narrative.reason && (
                      <div className="inline-flex items-center gap-1 text-[10px] text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-md font-medium mt-1">
                        <span>Documented Reason:</span>
                        <span className="font-semibold">{narrative.reason}</span>
                      </div>
                    )}
                  </div>
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

                  <pre className="p-3.5 bg-muted/80 text-foreground rounded-xl text-micro font-mono max-h-56 overflow-y-auto leading-relaxed border border-border/70 select-all custom-scrollbar">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
