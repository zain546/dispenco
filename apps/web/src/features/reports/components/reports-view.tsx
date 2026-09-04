'use client';

import React, { useState, useEffect } from 'react';
import {
  reportsApi,
  SalesReportResponse,
  GetSalesReportParams,
} from '../services/reports-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Trophy,
  Layers,
} from 'lucide-react';
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
  const [preset, setPreset] = useState<PresetRange>('30d');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportResponse['data'] | null>(null);
  const [activeTab, setActiveTab] = useState<'quantity' | 'revenue'>('revenue');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

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
      let params: GetSalesReportParams = { groupBy };

      if (preset !== 'custom') {
        const { startStr, endStr } = calculateDateRange(preset);
        params.startDate = startStr;
        params.endDate = endStr;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await reportsApi.getSalesReport(params);
      if (res.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [preset, groupBy]);

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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" />
            Pharmacy Sales Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time revenue performance, sales trends over time, and top-selling pharmaceutical products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Date Range & Filter Controls */}
      <Card className="border-border/60 shadow-2xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="size-3.5" /> Date Range:
            </span>
            {(['today', '7d', '30d', 'month', 'custom'] as PresetRange[]).map((p) => (
              <Button
                key={p}
                variant={preset === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreset(p)}
                className="h-8 text-xs px-3 capitalize font-medium"
              >
                {p === 'today'
                  ? 'Today'
                  : p === '7d'
                  ? 'Last 7 Days'
                  : p === '30d'
                  ? 'Last 30 Days'
                  : p === 'month'
                  ? 'This Month'
                  : 'Custom'}
              </Button>
            ))}
          </div>

          {/* Custom Date Inputs if 'custom' preset */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <Button size="sm" onClick={handleApplyCustomDates} className="h-8 text-xs">
                Apply
              </Button>
            </div>
          )}

          {/* Frequency Grouping */}
          <div className="flex items-center gap-1.5 border-t md:border-t-0 pt-2 md:pt-0 border-border">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="size-3.5" /> Group By:
            </span>
            {(['day', 'week', 'month'] as const).map((g) => (
              <Button
                key={g}
                variant={groupBy === g ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setGroupBy(g)}
                className="h-7 text-xs px-2.5 capitalize font-medium"
              >
                {g}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border-border/60 hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  PKR {summary?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gross completed transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="border-border/60 hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Sales
            </CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.totalTransactions || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total receipts generated
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="border-border/60 hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Order Value (AOV)
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  PKR {summary?.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average spend per sale
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Items Sold */}
        <Card className="border-border/60 hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Items Dispensed
            </CardTitle>
            <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Package className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.totalItemsSold || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Medicine units sold
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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

          <div className="flex items-center gap-1.5">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
              className="h-7 text-xs px-2.5"
            >
              Area Chart
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-7 text-xs px-2.5"
            >
              Bar Chart
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-4">
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : salesOverTime.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
              <Layers className="size-8 text-muted-foreground/40" />
              <p className="font-medium">No sales recorded for this date range</p>
              <p className="text-[11px] text-muted-foreground/70">Complete sales at POS to generate reporting analytics</p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(v) => `PKR ${v}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`PKR ${Number(val || 0).toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={salesOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(v) => `PKR ${v}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`PKR ${Number(val || 0).toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} />
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
              <Trophy className="size-4 text-amber-500" /> Top Performing Products
            </CardTitle>
            <CardDescription className="text-xs">
              Best-selling medicines sorted by volume or revenue contribution
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={activeTab === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('revenue')}
              className="h-8 text-xs font-medium"
            >
              By Revenue
            </Button>
            <Button
              variant={activeTab === 'quantity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('quantity')}
              className="h-8 text-xs font-medium"
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
            <div className="p-8 text-center text-xs text-muted-foreground">
              No top products recorded for the selected time window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
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
                          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500 size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-[11px]">
                            1
                          </Badge>
                        ) : index === 1 ? (
                          <Badge className="bg-slate-300 text-slate-900 hover:bg-slate-300 size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-[11px]">
                            2
                          </Badge>
                        ) : index === 2 ? (
                          <Badge className="bg-amber-700 text-amber-100 hover:bg-amber-700 size-6 p-0 rounded-full inline-flex items-center justify-center font-extrabold text-[11px]">
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
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-foreground">
                        {item.totalQuantity.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        PKR {item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
