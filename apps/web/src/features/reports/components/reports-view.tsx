'use client';

import React, { useState, useEffect } from 'react';
import {
  reportsApi,
  SalesReportResponse,
  GetSalesReportParams,
  OrgOverviewResponse,
} from '../services/reports-api';
import {
  downloadSalesReportPdf,
  shareSalesReportOnWhatsApp,
} from '../utils/sales-report-pdf';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  Sparkles,
  BarChart3,
  Layers,
  Trophy,
  ShieldAlert,
  AlertOctagon,
  FileDown,
  Wallet,
} from 'lucide-react';
import { AnalyticsCopilotView } from './analytics-copilot-view';
import { AuditComplianceView } from './audit-compliance-view';
import { AnomaliesReviewView } from './anomalies-review-view';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

type PresetRange = 'today' | '7d' | '30d' | 'month' | 'custom';

function WhatsAppIcon({ className = 'size-3.5 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ReportsView() {
  const { activeStoreId, activeStore, isAllStores, setActiveStoreId } = useStore();
  const { user } = useAuth();
  const [preset, setPreset] = useState<PresetRange>('30d');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportResponse['data'] | null>(null);
  const [orgOverviewData, setOrgOverviewData] = useState<OrgOverviewResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState<'quantity' | 'revenue'>('revenue');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [currentView, setCurrentView] = useState<'charts' | 'copilot' | 'audit' | 'integrity'>('charts');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'copilot' || tabParam === 'ai' || tabParam === 'assistant') {
        setCurrentView('copilot');
      } else if (tabParam === 'audit' || tabParam === 'compliance') {
        setCurrentView('audit');
      } else if (tabParam === 'integrity' || tabParam === 'anomalies' || tabParam === 'shrinkage') {
        setCurrentView('integrity');
      }
    }
  }, []);

  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const calculateDateRange = (selectedPreset: PresetRange) => {
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
      startStr: toLocalDateStr(start),
      endStr: toLocalDateStr(end),
    };
  };

  const getPresetLabel = (p: PresetRange): string => {
    switch (p) {
      case 'today':
        return 'Today';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'month':
        return 'This Month';
      case 'custom':
        return 'Custom Range';
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: GetSalesReportParams = { groupBy };

      if (preset !== 'custom') {
        const { startStr, endStr } = calculateDateRange(preset);
        params.startDate = startStr;
        params.endDate = endStr;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      if (!isAllStores && activeStoreId) {
        params.storeId = activeStoreId;
      }

      const res = await reportsApi.getSalesReport(params);
      if (res.success) {
        setReportData(res.data);
      }

      if (isAllStores) {
        const orgRes = await reportsApi.getOrgOverview({
          startDate: params.startDate,
          endDate: params.endDate,
        });
        if (orgRes.success) {
          setOrgOverviewData(orgRes.data);
        }
      } else {
        setOrgOverviewData(null);
      }
    } catch (err) {
      toast.error('Failed to load sales analytics', {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [preset, groupBy, activeStoreId, isAllStores]);

  const handleApplyCustomDates = () => {
    if (preset === 'custom') {
      fetchReport();
    }
  };

  const getPdfOptions = () => {
    if (!reportData) return null;
    const range =
      preset !== 'custom'
        ? calculateDateRange(preset)
        : {
            startStr: startDate || reportData.summary.dateRange.startDate.split('T')[0],
            endStr: endDate || reportData.summary.dateRange.endDate.split('T')[0],
          };

    return {
      reportData,
      storeName: isAllStores
        ? 'All Pharmacy Branches'
        : activeStore?.name || 'Dispenco Pharmacy',
      storeAddress: isAllStores ? 'Organization-Wide Consolidated Report' : activeStore?.address,
      periodLabel: getPresetLabel(preset),
      startDate: range.startStr,
      endDate: range.endStr,
      preparedBy: user?.name || 'Pharmacy Staff',
      orgStores: isAllStores ? orgOverviewData?.stores : undefined,
    };
  };

  const handleDownloadPdf = () => {
    const opts = getPdfOptions();
    if (!opts) {
      toast.error('Report data is still loading');
      return;
    }
    try {
      downloadSalesReportPdf(opts);
      toast.success(`Downloaded ${opts.periodLabel} Sales & Profit PDF Report`);
    } catch (err) {
      toast.error('Failed to generate PDF report', {
        description: getErrorMessage(err),
      });
    }
  };

  const handleShareWhatsApp = async () => {
    const opts = getPdfOptions();
    if (!opts) {
      toast.error('Report data is still loading');
      return;
    }
    try {
      await shareSalesReportOnWhatsApp(opts);
    } catch (err) {
      toast.error('Failed to share report on WhatsApp', {
        description: getErrorMessage(err),
      });
    }
  };

  const summary = reportData?.summary;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalCost = summary?.totalCost ?? 0;
  const totalProfit =
    summary?.totalProfit !== undefined ? summary.totalProfit : totalRevenue - totalCost;
  const profitMargin =
    summary?.profitMargin !== undefined
      ? summary.profitMargin
      : totalRevenue > 0
        ? Number(((totalProfit / totalRevenue) * 100).toFixed(1))
        : 0;

  const salesOverTime = reportData?.salesOverTime || [];
  const topProducts =
    activeTab === 'revenue'
      ? reportData?.topProductsByRevenue || []
      : reportData?.topProductsByQuantity || [];

  const headerInfo = {
    charts: {
      title: 'Sales & Profit',
      description: 'Revenue performance, profit margins, and PDF handover reports.',
    },
    copilot: {
      title: 'AI Analytics Copilot',
      description:
        'Natural-language queries and automated executive analytics backed by your real live database.',
    },
    audit: {
      title: 'Compliance & Audit Log',
      description:
        'Official inspection-ready records of all sensitive inventory, financial, and operational modifications.',
    },
    integrity: {
      title: 'Operational Integrity & Discrepancies',
      description:
        'Continuous statistical variance monitoring across cash registers, discounts, and inventory shrinkage.',
    },
  }[currentView];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <PageHeader
        title={headerInfo.title}
        description={headerInfo.description}
        badge={
          <Badge
            variant={isAllStores ? 'secondary' : 'outline'}
            className="text-xs font-medium bg-primary/10 text-primary border-primary/25"
          >
            {isAllStores ? 'All Branches' : activeStore?.name || 'Active Branch'}
          </Badge>
        }
        actions={
          currentView === 'charts' ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={loading || !reportData}
                className="flex-1 sm:flex-initial h-9 px-3.5 gap-1.5 text-xs font-semibold whitespace-nowrap shadow-2xs cursor-pointer justify-center"
              >
                <FileDown className="size-3.5 shrink-0" />
                <span>Export PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                disabled={loading || !reportData}
                className="flex-1 sm:flex-initial h-9 px-3.5 gap-1.5 text-xs font-semibold whitespace-nowrap border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-2xs cursor-pointer justify-center"
              >
                <WhatsAppIcon className="size-3.5 shrink-0" />
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchReport}
                disabled={loading}
                className="size-9 shrink-0 bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs cursor-pointer"
                title="Refresh report data"
              >
                <RefreshCw className={`size-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* View Switcher: Standard Reports vs AI Copilot vs Audit & Compliance */}
      <div className="border-b border-border pb-2">
        <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/60 rounded-xl w-max">
            <Button
              variant={currentView === 'charts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('charts')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'charts'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="size-3.5 sm:size-4 shrink-0" />
              <span>Sales &amp; Profit</span>
            </Button>
            <Button
              variant={currentView === 'copilot' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('copilot')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'copilot'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="size-3.5 sm:size-4 shrink-0" />
              <span>AI Copilot</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-bold ml-0.5 ${
                  currentView === 'copilot'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-primary/10 text-primary border-primary/25'
                }`}
              >
                AI
              </Badge>
            </Button>
            <Button
              variant={currentView === 'audit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('audit')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'audit'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="size-3.5 sm:size-4 shrink-0" />
              <span>Audit Log</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-semibold ml-0.5 ${
                  currentView === 'audit'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                Inspection
              </Badge>
            </Button>
            <Button
              variant={currentView === 'integrity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('integrity')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                currentView === 'integrity'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertOctagon className="size-3.5 sm:size-4 shrink-0" />
              <span>Integrity</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-semibold ml-0.5 ${
                  currentView === 'integrity'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                Variance
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {currentView === 'copilot' ? (
        <AnalyticsCopilotView />
      ) : currentView === 'audit' ? (
        <AuditComplianceView />
      ) : currentView === 'integrity' ? (
        <AnomaliesReviewView />
      ) : (
        <>
          {/* Date Range & Filter Controls */}
          <Card className="border-border/60 shadow-2xs">
            <CardContent className="p-3 sm:p-4 space-y-2.5">
              {/* Presets Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" /> Date Range
                </span>
                <div className="grid grid-cols-5 sm:flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-full sm:w-auto">
                  {(['today', '7d', '30d', 'month', 'custom'] as PresetRange[]).map((p) => (
                    <Button
                      key={p}
                      variant={preset === p ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreset(p)}
                      className={`h-7 text-[11px] sm:text-xs px-1.5 sm:px-3 font-semibold rounded-lg cursor-pointer ${
                        preset === p
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p === 'today'
                        ? 'Today'
                        : p === '7d'
                        ? '7 Days'
                        : p === '30d'
                        ? '30 Days'
                        : p === 'month'
                        ? 'Month'
                        : 'Custom'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs if 'custom' preset */}
              {preset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-full sm:w-36"
                  />
                  <span className="text-xs text-muted-foreground hidden sm:inline">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-full sm:w-36"
                  />
                  <Button
                    size="sm"
                    onClick={handleApplyCustomDates}
                    className="h-8 text-xs font-bold w-full sm:w-auto"
                  >
                    Apply Range
                  </Button>
                </div>
              )}

              {/* Frequency Grouping Row */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Filter className="size-3.5 text-primary" /> Group By
                </span>
                <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl">
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <Button
                      key={g}
                      variant={groupBy === g ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setGroupBy(g)}
                      className={`h-7 text-xs px-2.5 capitalize font-semibold rounded-lg cursor-pointer ${
                        groupBy === g
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary KPI Cards (Now includes Net Profit & Margin!) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              caption="Gross completed sales"
              icon={DollarSign}
              variant="success"
              isLoading={loading}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(totalProfit)}
              caption={`${profitMargin.toFixed(1)}% margin • Purchasing Cost: ${formatCurrency(totalCost)}`}
              icon={TrendingUp}
              variant={totalProfit >= 0 ? 'success' : 'destructive'}
              isLoading={loading}
            />
            <StatCard
              title="Completed Sales"
              value={formatNumber(summary?.totalTransactions ?? 0)}
              caption="Total receipts generated"
              icon={ShoppingCart}
              isLoading={loading}
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(summary?.averageOrderValue ?? 0)}
              caption="Average spend per sale"
              icon={Wallet}
              isLoading={loading}
            />
            <StatCard
              title="Items Dispensed"
              value={formatNumber(summary?.totalItemsSold ?? 0)}
              caption="Medicine units sold"
              icon={Package}
              isLoading={loading}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Multi-Branch Comparative Performance Card */}
          {isAllStores && orgOverviewData && orgOverviewData.stores.length > 0 && (
            <Card className="border-border/60 shadow-xs overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <Building2 className="size-4 text-primary" />
                      <span>Branch-by-Branch Comparative Matrix</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sales revenue, net profit, and stock inventory across all registered pharmacy branches
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium w-fit">
                    {orgOverviewData.stores.length} Active {orgOverviewData.stores.length === 1 ? 'Branch' : 'Branches'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[760px]">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-overline border-y border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Store / Branch</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Net Profit</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Margin</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Share (%)</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Receipts</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Items Sold</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Stocked Items</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {orgOverviewData.stores.map((s) => {
                        const sProfit =
                          s.totalProfit !== undefined
                            ? s.totalProfit
                            : s.totalRevenue - (s.totalCost ?? 0);
                        const sMargin =
                          s.profitMargin !== undefined
                            ? s.profitMargin
                            : s.totalRevenue > 0
                              ? Number(((sProfit / s.totalRevenue) * 100).toFixed(1))
                              : 0;
                        return (
                          <tr key={s.storeId} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-primary shrink-0" />
                                <div>
                                  <span className="font-semibold block">{s.storeName}</span>
                                  <span className="text-micro text-muted-foreground">
                                    {s.address || 'Counter / Branch'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                              {formatCurrency(s.totalRevenue)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-500 tabular-nums">
                              {formatCurrency(sProfit)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-muted-foreground tabular-nums">
                              {sMargin.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-semibold text-foreground tabular-nums">
                                  {s.revenueSharePercent}%
                                </span>
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, s.revenueSharePercent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                              {formatNumber(s.totalTransactions)}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground tabular-nums">
                              {formatNumber(s.totalItemsSold)}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              <Badge variant="outline" className="text-micro px-1.5 py-0 font-normal">
                                {formatNumber(s.uniqueProductsStocked)} Products (
                                {formatNumber(s.totalUnitsInStock)} Units)
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveStoreId(s.storeId)}
                                className="h-7 text-xs px-2 text-primary hover:bg-primary/10"
                              >
                                Focus Branch
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zero Store Branches Fallback for Org Overview */}
          {isAllStores && orgOverviewData && orgOverviewData.stores.length === 0 && (
            <Card className="border-border/60 shadow-2xs p-4">
              <EmptyState
                icon={Building2}
                title="No Active Store Branches Found"
                description="You do not have any registered active branches yet. Click on the store switcher in the header to register your first pharmacy branch."
              />
            </Card>
          )}

          {/* Main Revenue & Profit Chart Section */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Sales &amp; Profit Over Time
                </CardTitle>
                <CardDescription className="text-xs">
                  Revenue vs Net Profit trends grouped by {groupBy}
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl">
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className={`h-7 text-xs px-2.5 font-semibold rounded-lg cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Area
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                  className={`h-7 text-xs px-2.5 font-semibold rounded-lg cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-4">
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : salesOverTime.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Layers}
                    title="No sales recorded for this date range"
                    description="Complete sales at POS to generate revenue and profit analytics"
                  />
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickFormatter={(v) => `PKR ${v}`}
                        />
                        <Tooltip
                          formatter={(val: unknown, name?: unknown) => [
                            formatCurrency(Number(val || 0)),
                            name === 'profit' ? 'Net Profit' : 'Sales Revenue',
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            color: 'var(--popover-foreground)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === 'profit' ? 'Net Profit' : 'Sales Revenue')}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="revenue"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          name="profit"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorProfit)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          axisLine={{ stroke: 'var(--border)' }}
                          tickFormatter={(v) => `PKR ${v}`}
                        />
                        <Tooltip
                          formatter={(val: unknown, name?: unknown) => [
                            formatCurrency(Number(val || 0)),
                            name === 'profit' ? 'Net Profit' : 'Sales Revenue',
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{
                            backgroundColor: 'var(--popover)',
                            color: 'var(--popover-foreground)',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          formatter={(value) => (value === 'profit' ? 'Net Profit' : 'Sales Revenue')}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                        />
                        <Bar dataKey="revenue" name="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products Table */}
          <Card className="border-border/60 shadow-2xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
              <div>
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="size-4 text-warning" /> Medicines Sold
                </CardTitle>
                <CardDescription className="text-xs">
                  All medicines sold in the selected period with sales amount, purchasing cost, and profit
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-fit">
                <Button
                  variant={activeTab === 'revenue' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('revenue')}
                  className={`h-7 text-xs px-2.5 sm:px-3 font-semibold rounded-lg cursor-pointer ${
                    activeTab === 'revenue'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Revenue
                </Button>
                <Button
                  variant={activeTab === 'quantity' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('quantity')}
                  className={`h-7 text-xs px-2.5 sm:px-3 font-semibold rounded-lg cursor-pointer ${
                    activeTab === 'quantity'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By Quantity Sold
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : topProducts.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Trophy}
                    title="No medicines sold"
                    description="Sales data for the selected period will appear here once transactions are recorded."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Medicine</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">Qty Sold</th>
                        <th className="py-3 px-4 text-right">Total Sales</th>
                        <th className="py-3 px-4 text-right">Purchasing Cost</th>
                        <th className="py-3 px-4 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {topProducts.map((item, index) => {
                        const itemCost = item.totalCost ?? 0;
                        const itemProfit =
                          item.totalProfit !== undefined
                            ? item.totalProfit
                            : item.totalRevenue - itemCost;
                        const itemMargin =
                          item.profitMargin !== undefined
                            ? item.profitMargin
                            : item.totalRevenue > 0
                              ? Number(((itemProfit / item.totalRevenue) * 100).toFixed(1))
                              : 0;

                        return (
                          <tr key={item.productId} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 text-center font-bold">
                              {index === 0 ? (
                                <Badge
                                  variant="warning"
                                  className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                >
                                  1
                                </Badge>
                              ) : index === 1 ? (
                                <Badge
                                  variant="secondary"
                                  className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                >
                                  2
                                </Badge>
                              ) : index === 2 ? (
                                <Badge
                                  variant="outline"
                                  className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro"
                                >
                                  3
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">{index + 1}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              {item.productName}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-micro font-normal capitalize">
                                {(item.category || 'General').replace(/_/g, ' ').toLowerCase()}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-foreground tabular-nums">
                              {formatNumber(item.totalQuantity)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                              {formatCurrency(item.totalRevenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground tabular-nums">
                              {formatCurrency(itemCost)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-500 tabular-nums">
                              {formatCurrency(itemProfit)}
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
        </>
      )}
    </div>
  );
}
