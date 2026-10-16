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
  Send,
  Loader2,
  HelpCircle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Package,
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

const QUICK_SUGGESTIONS = [
  {
    title: 'Top Sellers This Month',
    query: 'What were my top 5 selling medicines this month?',
    icon: TrendingUp,
  },
  {
    title: 'Today’s Sales',
    query: 'How much did we sell today?',
    icon: Calendar,
  },
  {
    title: 'Branch Comparison',
    query: 'Which branch is generating the highest revenue?',
    icon: Building2,
  },
  {
    title: 'Expiry Risk Capital',
    query: 'What medicines are at risk of expiring soon?',
    icon: AlertTriangle,
  },
  {
    title: 'Slow Moving Stock',
    query: 'Which medicines have the slowest sales?',
    icon: Package,
  },
  {
    title: 'Customer Khata Balance',
    query: 'What is our total customer credit balance and who owes us?',
    icon: CreditCard,
  },
];

export function AnalyticsCopilotView() {
  const { activeStoreId, isAllStores } = useStore();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<CopilotQueryResult | null>(null);
  const [history, setHistory] = useState<CopilotQueryResult[]>([]);

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

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-primary/10 to-background shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <span>Dispenco AI Analytics Copilot</span>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold"
                >
                  Safe Natural Language
                </Badge>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
                Ask questions in plain English to interrogate your sales, profitability, expiry risk, and customer ledger — backed by your real live database.
              </p>
            </div>
          </div>

          {/* Natural Language Query Bar */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything (e.g. 'What were my top 5 medicines this month?', 'Show expiry risk', 'Which branch sold the most?')..."
                className="pl-10 pr-4 h-11 text-xs sm:text-sm bg-background border-border/80 focus:border-primary shadow-2xs rounded-xl"
              />
            </div>
            <Button
              onClick={() => handleQuery()}
              disabled={loading || !question.trim()}
              className="h-11 px-5 rounded-xl font-bold gap-2 text-xs shrink-0 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Ask Copilot</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
              <HelpCircle className="size-3" />
              <span>Suggested Prompts:</span>
            </span>
            {QUICK_SUGGESTIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(s.query);
                    handleQuery(s.query);
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-card hover:border-primary/40 hover:bg-primary/5 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-all"
                >
                  <Icon className="size-3 text-primary shrink-0" />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Results Display */}
      {currentResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Narrative Answer Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {currentResult.intent}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {currentResult.timeframeLabel}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{currentResult.executionTimeMs}ms response</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span>Verified Against Database</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="text-sm sm:text-base leading-relaxed text-foreground prose dark:prose-invert max-w-none">
                <p className="font-normal" dangerouslySetInnerHTML={{
                  __html: currentResult.narrative.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary">$1</strong>')
                }} />
              </div>

              {/* Summary KPIs Row */}
              {currentResult.summaryMetrics && currentResult.summaryMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {currentResult.summaryMetrics.map((metric, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border/70 bg-muted/30">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        {metric.label}
                      </span>
                      <strong className="text-base sm:text-lg font-bold text-foreground mt-0.5 block tabular-nums">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <span>Visual Analytics Breakdown</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {currentResult.chartType.toUpperCase()} CHART
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {currentResult.chartData && currentResult.chartData.length > 0 ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {currentResult.chartType === 'line' ? (
                        <LineChart data={currentResult.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `Rs.${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, 'Revenue']}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#0d9488' }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={currentResult.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="name"
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
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar
                            dataKey={currentResult.chartData[0]?.revenue !== undefined ? 'revenue' : currentResult.chartData[0]?.value !== undefined ? 'value' : 'unitsSold'}
                            fill="#0d9488"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No visual datapoints available for this query timeframe.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggested Follow-Ups Column */}
            <Card className="border-border shadow-xs flex flex-col">
              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>Drill Deeper (Follow-ups)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Click any follow-up question to execute contextual next-step analysis:
                  </p>
                  {currentResult.suggestedFollowUps?.map((fu, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuestion(fu);
                        handleQuery(fu);
                      }}
                      className="w-full text-left p-2.5 rounded-lg border border-border/80 bg-card hover:border-primary/40 hover:bg-primary/5 text-xs text-foreground font-medium transition-all flex items-center justify-between gap-2 group"
                    >
                      <span>{fu}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                  <strong className="text-foreground block font-semibold">Pre-approved Safe Query Policy</strong>
                  <span>Every query is verified against pre-approved aggregation endpoints with zero raw SQL execution.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table Preview */}
          {currentResult.tableData && currentResult.tableData.length > 0 && currentResult.tableColumns && (
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>Underlying Structured Data ({currentResult.tableData.length} records)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-y border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        {currentResult.tableColumns.map((col) => (
                          <th key={col.key} className="py-2.5 px-4">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {currentResult.tableData.map((row, rIdx) => (
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
                      ))}
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
        <Card className="border-dashed border-border/80">
          <CardContent className="p-8 sm:p-12 text-center space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
              <Sparkles className="size-7" />
            </div>
            <h4 className="font-bold text-base text-foreground">
              Ready to answer your pharmacy questions
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Select one of the suggested prompts above or type your own question to get an executive breakdown with charts and verified metrics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
