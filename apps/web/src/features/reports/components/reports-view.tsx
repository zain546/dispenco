'use client';

import React, { useState, useEffect } from 'react';
import {
  reportsApi,
  SalesReportResponse,
  GetSalesReportParams,
  OrgOverviewResponse,
} from '../services/reports-api';
import { useStore } from '@/context/store-context';
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
} from 'recharts';

type PresetRange = 'today' | '7d' | '30d' | 'month' | 'custom';

export function ReportsView() {
  const { activeStoreId, activeStore, isAllStores, setActiveStoreId } = useStore();
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
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
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

  const summary = reportData?.summary;
  const salesOverTime = reportData?.salesOverTime || [];
  const topProducts =
    activeTab === 'revenue'
      ? reportData?.topProductsByRevenue || []
      : reportData?.topProductsByQuantity || [];

  const headerInfo = {
    charts: {
      title: 'Pharmacy Sales Analytics',
      description:
        'Real-time revenue performance, sales trends over time, and top-selling pharmaceutical products.',
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header Banner */}
      <PageHeader
        title={headerInfo.title}
        description={headerInfo.description}
        badge={
          <Badge
            variant={isAllStores ? 'secondary' : 'outline'}
            className="text-xs font-medium bg-primary/10 text-primary border-primary/25"
          >
            {isAllStores ? 'Org Overview (All Branches)' : activeStore?.name || 'Active Branch'}
          </Badge>
        }
        actions={
          currentView === 'charts' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
              className="h-9 px-3.5 gap-1.5 text-xs font-semibold bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs cursor-pointer justify-center"
            >
              <RefreshCw className={`size-3.5 text-primary shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </Button>
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
              <span>Sales &amp; Analytics</span>
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
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              {/* Presets Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" /> Date Range
                </span>
                <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
                  <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl w-max">
                    {(['today', '7d', '30d', 'month', 'custom'] as PresetRange[]).map((p) => (
                      <Button
                        key={p}
                        variant={preset === p ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPreset(p)}
                        className={`h-7.5 text-xs px-2.5 sm:px-3 font-semibold rounded-lg shrink-0 cursor-pointer ${
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
                          ? 'This Month'
                          : 'Custom'}
                      </Button>
                    ))}
                  </div>
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
                  <Button size="sm" onClick={handleApplyCustomDates} className="h-8 text-xs font-bold w-full sm:w-auto">
                    Apply Custom Range
                  </Button>
                </div>
              )}

              {/* Frequency Grouping Row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
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

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              caption="Gross completed transactions"
              icon={DollarSign}
              variant="success"
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
              title="Avg Order Value (AOV)"
              value={formatCurrency(summary?.averageOrderValue ?? 0)}
              caption="Average spend per sale"
              icon={TrendingUp}
              isLoading={loading}
            />
            <StatCard
              title="Items Dispensed"
              value={formatNumber(summary?.totalItemsSold ?? 0)}
              caption="Medicine units sold"
              icon={Package}
              isLoading={loading}
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
                  Sales breakdown, revenue contributions, and stock inventory across all registered pharmacy stores
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-medium w-fit">
                {orgOverviewData.stores.length} Active {orgOverviewData.stores.length === 1 ? 'Branch' : 'Branches'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-overline border-y border-border/60">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Store / Branch</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Revenue</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Share (%)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Transactions</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Avg Order</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Items Sold</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Stocked Items</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orgOverviewData.stores.map((s) => (
                    <tr key={s.storeId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-primary shrink-0" />
                          <div>
                            <span className="font-semibold block">{s.storeName}</span>
                            <span className="text-micro text-muted-foreground">{s.address || 'Counter / Branch'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                        {formatCurrency(s.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-foreground tabular-nums">{s.revenueSharePercent}%</span>
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, s.revenueSharePercent)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                        {formatNumber(s.totalTransactions)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {formatCurrency(s.averageOrderValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">
                        {formatNumber(s.totalItemsSold)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <Badge variant="outline" className="text-micro px-1.5 py-0 font-normal">
                          {formatNumber(s.uniqueProductsStocked)} Products ({formatNumber(s.totalUnitsInStock)} Units)
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
                  ))}
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

      {/* Main Revenue Chart Section */}
      <Card className="border-border/60 shadow-2xs">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <div>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Sales Over Time
            </CardTitle>
            <CardDescription className="text-xs">
              Revenue trends grouped by {groupBy}
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
                description="Complete sales at POS to generate reporting analytics"
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
                      formatter={(val: unknown) => [formatCurrency(Number(val || 0)), 'Revenue']}
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
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
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
                      formatter={(val: unknown) => [formatCurrency(Number(val || 0)), 'Revenue']}
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
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
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
              <Trophy className="size-4 text-warning" /> Top Performing Products
            </CardTitle>
            <CardDescription className="text-xs">
              Best-selling medicines sorted by volume or revenue contribution
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
                title="No top products recorded"
                description="Sales data for the selected period will appear here once transactions are recorded."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topProducts.map((item, index) => (
                    <tr key={item.productId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-center font-bold">
                        {index === 0 ? (
                          <Badge variant="warning" className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro">
                            1
                          </Badge>
                        ) : index === 1 ? (
                          <Badge variant="secondary" className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro">
                            2
                          </Badge>
                        ) : index === 2 ? (
                          <Badge variant="outline" className="size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-micro">
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
                        <Badge variant="outline" className="text-micro font-normal">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground tabular-nums">
                        {formatNumber(item.totalQuantity)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
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
