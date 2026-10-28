'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Building2,
  Calendar,
  Loader2,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Package,
  Copy,
  Check,
  Download,
  RotateCcw,
  Lightbulb,
  ShieldCheck,
  Cpu,
  History,
  FileSpreadsheet,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  reportsApi,
  CopilotQueryResult,
} from '../services/reports-api';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';

interface QuickPrompt {
  id: string;
  category: 'all' | 'sales' | 'inventory' | 'credit' | 'stores';
  title: string;
  query: string;
  icon: React.ElementType;
}

const QUICK_SUGGESTIONS: QuickPrompt[] = [
  {
    id: 'top-sellers',
    category: 'sales',
    title: 'Top Sellers This Month',
    query: 'What were my top 5 selling medicines this month?',
    icon: TrendingUp,
  },
  {
    id: 'today-sales',
    category: 'sales',
    title: 'Today’s Sales & Orders',
    query: 'How much did we sell today?',
    icon: Calendar,
  },
  {
    id: 'branch-compare',
    category: 'stores',
    title: 'Branch Comparison',
    query: 'Which branch is generating the highest revenue?',
    icon: Building2,
  },
  {
    id: 'expiry-capital',
    category: 'inventory',
    title: 'Expiry Risk Capital',
    query: 'What medicines are at risk of expiring soon?',
    icon: AlertTriangle,
  },
  {
    id: 'dead-stock',
    category: 'inventory',
    title: 'Slow Moving Stock',
    query: 'Which medicines have the slowest sales?',
    icon: Package,
  },
  {
    id: 'customer-khata',
    category: 'credit',
    title: 'Customer Khata Balance',
    query: 'What is our total customer credit balance and who owes us?',
    icon: CreditCard,
  },
  {
    id: 'reorder-alerts',
    category: 'inventory',
    title: 'Reorder Depletions',
    query: 'What medicines are out of stock or need reordering?',
    icon: Zap,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Queries' },
  { id: 'sales', label: 'Sales & Revenue' },
  { id: 'inventory', label: 'Inventory & Expiry' },
  { id: 'credit', label: 'Customer Khata' },
  { id: 'stores', label: 'Store Benchmark' },
] as const;

export function AnalyticsCopilotView() {
  const { activeStoreId, isAllStores, stores } = useStore();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<CopilotQueryResult | null>(null);
  const [history, setHistory] = useState<CopilotQueryResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]['id']>('all');
  const [chartViewType, setChartViewType] = useState<'auto' | 'bar' | 'line' | 'area'>('auto');
  const [copied, setCopied] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const activeStoreName = isAllStores
    ? 'All Store Branches'
    : stores.find((s) => s.id === activeStoreId)?.name || 'Selected Store';

  const handleQuery = async (queryText?: string) => {
    const textToQuery = (queryText || question).trim();
    if (!textToQuery) return;

    try {
      setLoading(true);
      const res = await reportsApi.queryCopilot({
        question: textToQuery,
        storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
      });

      setCurrentResult(res);
      setHistory((prev) => [res, ...prev.filter((h) => h.question !== res.question)].slice(0, 8));
      if (!queryText) setQuestion('');
      setTableSearch('');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to process natural language query'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleQuery();
    }
  };

  const handleCopyNarrative = () => {
    if (!currentResult) return;
    const parts = [
      `# Dispenco AI Analytics Copilot Briefing`,
      `Question: ${currentResult.question}`,
      `Intent: ${currentResult.intent} (${currentResult.timeframeLabel})`,
      `Executive Takeaway: ${currentResult.executiveTakeaway || 'N/A'}`,
      `\nExecutive Narrative:\n${currentResult.narrative}`,
    ];
    if (currentResult.actionItems && currentResult.actionItems.length > 0) {
      parts.push(`\nRecommended Actions:\n${currentResult.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
    }
    navigator.clipboard.writeText(parts.join('\n'));
    setCopied(true);
    toast.success('Executive briefing copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (!currentResult || !currentResult.tableData || !currentResult.tableColumns) return;
    const headers = currentResult.tableColumns.map((c) => `"${c.label}"`).join(',');
    const rows = currentResult.tableData.map((row) =>
      currentResult.tableColumns!.map((c) => {
        const val = row[c.key];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dispenco-analytics-${currentResult.intent.toLowerCase()}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported analytics records to CSV');
  };

  const filteredPrompts = QUICK_SUGGESTIONS.filter((p) =>
    selectedCategory === 'all' ? true : p.category === selectedCategory
  );

  const activeChartType =
    chartViewType !== 'auto'
      ? chartViewType
      : currentResult?.chartType === 'line'
      ? 'line'
      : 'bar';

  // Filter table data if user searches inside table
  const filteredTableData = currentResult?.tableData?.filter((row) => {
    if (!tableSearch.trim()) return true;
    const query = tableSearch.toLowerCase();
    return Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Professional Intelligence Card */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-primary/10 to-background shadow-xs overflow-hidden relative">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-11 sm:size-12 rounded-2xl bg-linear-to-br from-primary to-teal-600 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 shrink-0 mt-0.5 sm:mt-0 ring-4 ring-primary/10">
                <Sparkles className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Dispenco AI Analytics Copilot
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-micro font-semibold gap-1"
                  >
                    <Cpu className="size-3 text-primary" />
                    <span>Dispenco Intelligence Engine</span>
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-micro font-medium gap-1 bg-muted/60 text-muted-foreground"
                  >
                    <Building2 className="size-3" />
                    <span>{activeStoreName}</span>
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
                  Enterprise-grade natural language business intelligence. Formulate queries in plain English to interrogate transactions, margin trends, expiry exposures, and patient credit balances.
                </p>
              </div>
            </div>

            {/* Zero-Hallucination Trust Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/80 shadow-2xs shrink-0 self-start">
              <ShieldCheck className="size-4 text-primary" />
              <div className="text-left">
                <div className="text-micro font-bold text-foreground">Audited Database</div>
                <div className="text-[10px] text-muted-foreground">Zero-hallucination execution</div>
              </div>
            </div>
          </div>

          {/* Natural Language Query Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask any pharmacy query (e.g. 'Top 5 medicines this month', 'Expiry risk capital', 'Who owes us the most khata?')..."
                className="pl-10 pr-24 h-12 text-xs sm:text-sm bg-background border-border/80 focus:border-primary shadow-xs rounded-xl w-full"
              />
              <span className="hidden sm:inline-block absolute right-3.5 top-1/2 -translate-y-1/2 text-micro text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border/60">
                ↵ Enter
              </span>
            </div>
            <Button
              onClick={() => handleQuery()}
              disabled={loading || !question.trim()}
              className="h-12 px-6 rounded-xl font-bold gap-2 text-xs shrink-0 shadow-md shadow-primary/20 bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Ask Copilot</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Session Query History Pills (if user has queried before) */}
          {history.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-micro font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                <History className="size-3 text-primary" />
                <span>Recent:</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {history.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestion(h.question);
                      setCurrentResult(h);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-micro transition-all whitespace-nowrap cursor-pointer ${
                      currentResult?.question === h.question
                        ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                        : 'border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="max-w-[180px] truncate">{h.question}</span>
                  </button>
                ))}
                {currentResult && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentResult(null);
                      setQuestion('');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-micro text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer ml-auto"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset View</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Categorized Suggested Prompt Bar */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-micro font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === c.id
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <span className="text-micro text-muted-foreground hidden sm:inline-block">
                Click any suggestion to interrogate live metrics
              </span>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none pb-0.5">
              <div className="flex items-center gap-2 sm:flex-wrap w-max sm:w-auto">
                {filteredPrompts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setQuestion(s.query);
                        handleQuery(s.query);
                      }}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground font-medium transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Icon className="size-3 text-primary shrink-0" />
                      <span>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Results Display */}
      {currentResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Briefing & Actions Header */}
          <Card className="border-border shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-mono text-micro font-bold">
                    {currentResult.intent}
                  </Badge>
                  <Badge variant="outline" className="text-micro font-semibold">
                    {currentResult.timeframeLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3 text-primary" />
                    <span>{currentResult.executionTimeMs}ms execution</span>
                  </span>
                  {currentResult.aiModel && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-micro gap-1"
                    >
                      <Sparkles className="size-2.5" />
                      <span>{currentResult.aiModel}</span>
                    </Badge>
                  )}
                </div>

                {/* Action buttons: Copy, Export, Verified */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyNarrative}
                    className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Briefing'}</span>
                  </Button>
                  {currentResult.tableData && currentResult.tableData.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="size-3.5 text-primary" />
                      <span>Export CSV</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Executive Takeaway Callout (if available from Gemini) */}
              {currentResult.executiveTakeaway && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb className="size-4" />
                  </div>
                  <div>
                    <span className="text-micro font-bold uppercase tracking-wider text-primary block">
                      Executive Takeaway
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                      {currentResult.executiveTakeaway}
                    </p>
                  </div>
                </div>
              )}

              {/* Full Executive Narrative */}
              <div className="text-sm sm:text-base leading-relaxed text-foreground prose dark:prose-invert max-w-none">
                <p
                  className="font-normal"
                  dangerouslySetInnerHTML={{
                    __html: currentResult.narrative.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="font-bold text-primary">$1</strong>'
                    ),
                  }}
                />
              </div>

              {/* Recommended Operational Action Items (if generated by Gemini) */}
              {currentResult.actionItems && currentResult.actionItems.length > 0 && (
                <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    <span>Recommended Pharmacy Action Items</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentResult.actionItems.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card border border-border/60 text-xs text-foreground shadow-2xs"
                      >
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-micro flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary KPIs Row */}
              {currentResult.summaryMetrics && currentResult.summaryMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {currentResult.summaryMetrics.map((metric, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <span className="text-xs text-muted-foreground block font-medium truncate">
                        {metric.label}
                      </span>
                      <strong className="text-base sm:text-lg font-bold text-foreground mt-1 block tabular-nums">
                        {metric.value}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactive Chart & Data Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Column */}
            <Card className="lg:col-span-2 border-border shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <span>Visual Analytics Breakdown</span>
                  </span>
                  {/* Dynamic Chart Type Toggle */}
                  <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/60 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setChartViewType('bar')}
                      className={`px-2 py-1 text-micro font-semibold rounded cursor-pointer transition-all ${
                        activeChartType === 'bar'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewType('line')}
                      className={`px-2 py-1 text-micro font-semibold rounded cursor-pointer transition-all ${
                        activeChartType === 'line'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewType('area')}
                      className={`px-2 py-1 text-micro font-semibold rounded cursor-pointer transition-all ${
                        activeChartType === 'area'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Area
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {currentResult.chartData && currentResult.chartData.length > 0 ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeChartType === 'line' ? (
                        <LineChart data={currentResult.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                          <XAxis
                            dataKey={currentResult.chartData[0]?.date !== undefined ? 'date' : 'name'}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => (val && val.length > 12 ? `${val.slice(0, 10)}...` : val)}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '12px',
                              fontSize: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey={
                              currentResult.chartData[0]?.revenue !== undefined
                                ? 'revenue'
                                : currentResult.chartData[0]?.value !== undefined
                                ? 'value'
                                : 'unitsSold'
                            }
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 3.5, fill: '#0d9488' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      ) : activeChartType === 'area' ? (
                        <AreaChart data={currentResult.chartData}>
                          <defs>
                            <linearGradient id="copilotGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                          <XAxis
                            dataKey={currentResult.chartData[0]?.date !== undefined ? 'date' : 'name'}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => (val && val.length > 12 ? `${val.slice(0, 10)}...` : val)}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '12px',
                              fontSize: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey={
                              currentResult.chartData[0]?.revenue !== undefined
                                ? 'revenue'
                                : currentResult.chartData[0]?.value !== undefined
                                ? 'value'
                                : 'unitsSold'
                            }
                            stroke="#0d9488"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#copilotGradient)"
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={currentResult.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                          <XAxis
                            dataKey={currentResult.chartData[0]?.name !== undefined ? 'name' : 'date'}
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            tickFormatter={(val) => (val && val.length > 12 ? `${val.slice(0, 10)}...` : val)}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '12px',
                              fontSize: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          />
                          <Bar
                            dataKey={
                              currentResult.chartData[0]?.revenue !== undefined
                                ? 'revenue'
                                : currentResult.chartData[0]?.value !== undefined
                                ? 'value'
                                : 'unitsSold'
                            }
                            fill="#0d9488"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No visual datapoints available for this query timeframe.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggested Follow-Ups Column */}
            <Card className="border-border shadow-xs flex flex-col">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>Drill Deeper (AI Follow-ups)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Click any contextual follow-up question to run continuous analysis:
                  </p>
                  {currentResult.suggestedFollowUps?.map((fu, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuestion(fu);
                        handleQuery(fu);
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 text-xs text-foreground font-medium transition-all flex items-center justify-between gap-2 group cursor-pointer shadow-2xs"
                    >
                      <span className="leading-snug">{fu}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <ShieldCheck className="size-3.5 text-emerald-500" />
                    <span>Safe Execution Policy</span>
                  </div>
                  <p className="text-micro leading-relaxed">
                    Natural language queries are compiled into safe database aggregations with zero arbitrary SQL execution.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table Preview with Search & Export */}
          {currentResult.tableData && currentResult.tableData.length > 0 && currentResult.tableColumns && (
            <Card className="border-border shadow-xs">
              <CardHeader className="p-4 sm:p-5 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <span>
                      Underlying Structured Data ({filteredTableData?.length ?? 0} of{' '}
                      {currentResult.tableData.length} records)
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Search records..."
                        className="h-8 pl-8 pr-3 text-xs w-48 rounded-lg"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="size-3.5 text-primary" />
                      <span>Export</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-micro tracking-wider">
                      <tr>
                        {currentResult.tableColumns.map((col) => (
                          <th key={col.key} className="py-2.5 px-4">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredTableData && filteredTableData.length > 0 ? (
                        filteredTableData.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                            {currentResult.tableColumns!.map((col) => {
                              const val = row[col.key];
                              return (
                                <td key={col.key} className="py-2.5 px-4 text-foreground font-medium">
                                  {col.format === 'currency'
                                    ? formatCurrency(Number(val) || 0)
                                    : col.format === 'number'
                                    ? Number(val).toLocaleString()
                                    : String(val ?? 'N/A')}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={currentResult.tableColumns.length}
                            className="py-8 text-center text-xs text-muted-foreground"
                          >
                            No records match &quot;{tableSearch}&quot;
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State before first search */}
      {!currentResult && !loading && (
        <Card className="border border-border/70 bg-muted/10 shadow-2xs overflow-hidden">
          <CardContent className="p-6 sm:p-10 space-y-6 text-center">
            <div className="max-w-md mx-auto space-y-2">
              <div className="size-14 rounded-2xl bg-linear-to-br from-primary/20 to-teal-500/20 text-primary mx-auto flex items-center justify-center shadow-xs ring-4 ring-primary/10">
                <Sparkles className="size-7" />
              </div>
              <h4 className="font-bold text-base sm:text-lg text-foreground">
                Ask anything about your pharmacy operations
              </h4>
              <p className="text-xs text-muted-foreground">
                Get instant executive narratives, charts, and verified database aggregates powered by Dispenco. Select a capability below to try:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-4xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  const q = 'What were my top 5 selling medicines this month?';
                  setQuestion(q);
                  handleQuery(q);
                }}
                className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer text-left shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <TrendingUp className="size-4" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="font-bold text-xs block text-foreground">Revenue & Top Sellers</span>
                <span className="text-micro text-muted-foreground block mt-1 leading-relaxed">
                  Identify revenue champions, high-margin products, and store benchmarks.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const q = 'What medicines are at risk of expiring soon?';
                  setQuestion(q);
                  handleQuery(q);
                }}
                className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer text-left shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <AlertTriangle className="size-4" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="font-bold text-xs block text-foreground">Expiry Risk & Dead Stock</span>
                <span className="text-micro text-muted-foreground block mt-1 leading-relaxed">
                  Audit expiring stock capital and detect stagnant inventory tying up cash.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const q = 'What is our total customer credit balance and who owes us?';
                  setQuestion(q);
                  handleQuery(q);
                }}
                className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer text-left shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <CreditCard className="size-4" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="font-bold text-xs block text-foreground">Credit Ledger (Khata)</span>
                <span className="text-micro text-muted-foreground block mt-1 leading-relaxed">
                  Monitor outstanding patient credit balances, aged receivables, and debtors.
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
