import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CopilotQueryDto } from '../dto/copilot-query.dto';
import { SaleStatus } from '@prisma/client';

export type SafeAnalyticsIntent =
  | 'SALES_SUMMARY'
  | 'TOP_SELLING_PRODUCTS'
  | 'SLOW_MOVING_PRODUCTS'
  | 'CATEGORY_BREAKDOWN'
  | 'STORE_COMPARISON'
  | 'EXPIRY_RISK_SUMMARY'
  | 'REORDER_SUGGESTIONS'
  | 'CUSTOMER_CREDIT';

export interface CopilotQueryResult {
  question: string;
  intent: SafeAnalyticsIntent;
  timeframeLabel: string;
  narrative: string;
  executiveTakeaway?: string;
  actionItems?: string[];
  aiModel?: string;
  chartType: 'bar' | 'line' | 'pie' | 'kpi' | 'table';
  summaryMetrics: Array<{
    label: string;
    value: string | number;
    change?: string;
    isPositive?: boolean;
  }>;
  chartData: Array<Record<string, unknown>>;
  tableColumns?: Array<{
    key: string;
    label: string;
    format?: 'currency' | 'number' | 'text' | 'date';
  }>;
  tableData?: Array<Record<string, unknown>>;
  suggestedFollowUps: string[];
  executionTimeMs: number;
}

interface ParsedIntentDetails {
  intent: SafeAnalyticsIntent;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  timeframeLabel: string;
  limit: number;
}

@Injectable()
export class AnalyticsCopilotService {
  private readonly logger = new Logger(AnalyticsCopilotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point: Translates plain-English question into safe pre-approved query and executes it
   */
  async processQuery(
    tenantId: string,
    dto: CopilotQueryDto,
  ): Promise<CopilotQueryResult> {
    const startTime = Date.now();
    const cleanQuestion = dto.question.trim();

    // 1. Translate question into a safe, pre-approved structured query intent
    const parsed = await this.classifyAndParseIntent(cleanQuestion, dto.timeframe);

    // 2. Safely execute the pre-approved query intent
    let result: Omit<CopilotQueryResult, 'question' | 'intent' | 'timeframeLabel' | 'executionTimeMs'>;

    switch (parsed.intent) {
      case 'SALES_SUMMARY':
        result = await this.executeSalesSummary(
          tenantId,
          dto.storeId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
        );
        break;

      case 'TOP_SELLING_PRODUCTS':
        result = await this.executeTopProducts(
          tenantId,
          dto.storeId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
          parsed.limit,
        );
        break;

      case 'SLOW_MOVING_PRODUCTS':
        result = await this.executeSlowMovingProducts(
          tenantId,
          dto.storeId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
          parsed.limit,
        );
        break;

      case 'CATEGORY_BREAKDOWN':
        result = await this.executeCategoryBreakdown(
          tenantId,
          dto.storeId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
        );
        break;

      case 'STORE_COMPARISON':
        result = await this.executeStoreComparison(
          tenantId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
        );
        break;

      case 'EXPIRY_RISK_SUMMARY':
        result = await this.executeExpiryRiskSummary(tenantId, dto.storeId);
        break;

      case 'REORDER_SUGGESTIONS':
        result = await this.executeReorderAlerts(tenantId, dto.storeId);
        break;

      case 'CUSTOMER_CREDIT':
        result = await this.executeCustomerCredit(tenantId);
        break;

      default:
        result = await this.executeSalesSummary(
          tenantId,
          dto.storeId,
          parsed.startDate,
          parsed.endDate,
          parsed.timeframeLabel,
        );
    }

    // 3. AI Executive Narrative & Recommendations Synthesis (via Gemini if available)
    let aiEnhanced = {
      narrative: result.narrative,
      executiveTakeaway: undefined as string | undefined,
      actionItems: undefined as string[] | undefined,
      suggestedFollowUps: result.suggestedFollowUps,
      aiModel: 'Deterministic Engine',
    };

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const briefing = await this.synthesizeBriefingWithGemini(
          geminiKey,
          cleanQuestion,
          parsed.intent,
          parsed.timeframeLabel,
          result.summaryMetrics,
          (result.tableData || result.chartData || []) as Array<Record<string, unknown>>,
        );
        if (briefing.narrative) aiEnhanced.narrative = briefing.narrative;
        if (briefing.executiveTakeaway) aiEnhanced.executiveTakeaway = briefing.executiveTakeaway;
        if (briefing.actionItems && briefing.actionItems.length > 0) aiEnhanced.actionItems = briefing.actionItems;
        if (briefing.suggestedFollowUps && briefing.suggestedFollowUps.length > 0) {
          aiEnhanced.suggestedFollowUps = briefing.suggestedFollowUps;
        }
        aiEnhanced.aiModel = 'Dispenco Intelligence';
      } catch (err: unknown) {
        this.logger.warn(`Gemini executive synthesis fallback to deterministic: ${err}`);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      question: cleanQuestion,
      intent: parsed.intent,
      timeframeLabel: parsed.timeframeLabel,
      ...result,
      narrative: aiEnhanced.narrative,
      executiveTakeaway: aiEnhanced.executiveTakeaway,
      actionItems: aiEnhanced.actionItems,
      suggestedFollowUps: aiEnhanced.suggestedFollowUps,
      aiModel: aiEnhanced.aiModel,
      executionTimeMs,
    };
  }

  /**
   * Translates free-form question into a safe intent using LLM or smart semantic rules
   */
  private async classifyAndParseIntent(
    question: string,
    overrideTimeframe?: string,
  ): Promise<ParsedIntentDetails> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let classifiedIntent: SafeAnalyticsIntent = 'SALES_SUMMARY';
    let rawTimeframe = overrideTimeframe || 'this_month';
    let limit = 5;

    // 1. Try Gemini classification if key is configured
    if (geminiKey) {
      try {
        const llmResult = await this.classifyWithGemini(geminiKey, question);
        if (llmResult.intent) classifiedIntent = llmResult.intent;
        if (llmResult.timeframe) rawTimeframe = llmResult.timeframe;
        if (llmResult.limit) limit = llmResult.limit;
      } catch (err: unknown) {
        this.logger.warn(`Gemini intent translation failed: ${err}`);
      }
    } else if (openaiKey) {
      try {
        const llmResult = await this.classifyWithOpenAi(openaiKey, question);
        if (llmResult.intent) classifiedIntent = llmResult.intent;
        if (llmResult.timeframe) rawTimeframe = llmResult.timeframe;
        if (llmResult.limit) limit = llmResult.limit;
      } catch (err: unknown) {
        this.logger.warn(`OpenAI intent translation failed: ${err}`);
      }
    } else {
      // 2. Deterministic Semantic Classifier
      const q = question.toLowerCase();

      if (q.includes('expiry') || q.includes('expir') || q.includes('shelf life') || q.includes('risk')) {
        classifiedIntent = 'EXPIRY_RISK_SUMMARY';
      } else if (q.includes('reorder') || q.includes('low stock') || q.includes('replenish') || q.includes('out of stock')) {
        classifiedIntent = 'REORDER_SUGGESTIONS';
      } else if (q.includes('credit') || q.includes('khata') || q.includes('debt') || q.includes('owe') || q.includes('udhar')) {
        classifiedIntent = 'CUSTOMER_CREDIT';
      } else if (q.includes('store') || q.includes('branch') || q.includes('location') || q.includes('compare stores')) {
        classifiedIntent = 'STORE_COMPARISON';
      } else if (q.includes('category') || q.includes('categories') || q.includes('syrup') || q.includes('tablet') || q.includes('injection')) {
        classifiedIntent = 'CATEGORY_BREAKDOWN';
      } else if (q.includes('slow') || q.includes('least') || q.includes('dead') || q.includes('worst') || q.includes('unsold')) {
        classifiedIntent = 'SLOW_MOVING_PRODUCTS';
      } else if (q.includes('top') || q.includes('best') || q.includes('popular') || q.includes('highest selling')) {
        classifiedIntent = 'TOP_SELLING_PRODUCTS';
      } else {
        classifiedIntent = 'SALES_SUMMARY';
      }

      // Timeframe extraction
      if (q.includes('today')) rawTimeframe = 'today';
      else if (q.includes('yesterday')) rawTimeframe = 'yesterday';
      else if (q.includes('this week') || q.includes('current week')) rawTimeframe = 'this_week';
      else if (q.includes('last week')) rawTimeframe = 'last_week';
      else if (q.includes('last 30 days') || q.includes('past month')) rawTimeframe = 'last_30_days';
      else if (q.includes('this year') || q.includes('year to date')) rawTimeframe = 'this_year';
      else if (q.includes('month') || q.includes('this month')) rawTimeframe = 'this_month';

      // Limit extraction (e.g., top 10)
      const limitMatch = q.match(/\b(?:top|best|first)\s+(\d{1,2})\b/);
      if (limitMatch) {
        limit = Math.min(20, Math.max(1, parseInt(limitMatch[1], 10)));
      }
    }

    const { startDate, endDate, timeframeLabel } = this.resolveDateRange(rawTimeframe);

    return {
      intent: classifiedIntent,
      timeframe: rawTimeframe,
      startDate,
      endDate,
      timeframeLabel,
      limit,
    };
  }

  /**
   * Safe date range resolver
   */
  private resolveDateRange(timeframe: string): {
    startDate: Date;
    endDate: Date;
    timeframeLabel: string;
  } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    let timeframeLabel = 'This Month';

    switch (timeframe) {
      case 'today':
        timeframeLabel = 'Today';
        break;

      case 'yesterday': {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        timeframeLabel = 'Yesterday';
        break;
      }

      case 'this_week': {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate.setDate(diff);
        timeframeLabel = 'This Week';
        break;
      }

      case 'last_week': {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day - 6;
        startDate.setDate(diff);
        endDate.setDate(startDate.getDate() + 6);
        timeframeLabel = 'Last Week';
        break;
      }

      case 'last_30_days': {
        startDate.setDate(startDate.getDate() - 30);
        timeframeLabel = 'Last 30 Days';
        break;
      }

      case 'this_year': {
        startDate.setMonth(0, 1);
        timeframeLabel = `Year ${startDate.getFullYear()}`;
        break;
      }

      case 'this_month':
      default: {
        startDate.setDate(1);
        timeframeLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        break;
      }
    }

    return { startDate, endDate, timeframeLabel };
  }

  /**
   * LLM Intent Classifier via Gemini
   */
  private async classifyWithGemini(apiKey: string, question: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const prompt = `Classify this pharmacy analytics query into safe intent:
Available intents:
- SALES_SUMMARY
- TOP_SELLING_PRODUCTS
- SLOW_MOVING_PRODUCTS
- CATEGORY_BREAKDOWN
- STORE_COMPARISON
- EXPIRY_RISK_SUMMARY
- REORDER_SUGGESTIONS
- CUSTOMER_CREDIT

Question: "${question}"

Return strict JSON:
{
  "intent": "SALES_SUMMARY",
  "timeframe": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_30_days" | "this_year",
  "limit": 5
}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);
    const json = (await res.json()) as any;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  }

  /**
   * AI Executive Synthesis via Gemini
   */
  private async synthesizeBriefingWithGemini(
    apiKey: string,
    question: string,
    intent: SafeAnalyticsIntent,
    timeframeLabel: string,
    metrics: Array<{ label: string; value: string | number }>,
    sampleRecords: Array<Record<string, unknown>>,
  ): Promise<{
    narrative?: string;
    executiveTakeaway?: string;
    actionItems?: string[];
    suggestedFollowUps?: string[];
  }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const prompt = `You are the Lead Healthcare & Pharmacy Business Intelligence Analyst for Dispenco.
A pharmacy owner asked: "${question}"
Domain Intent: ${intent} (${timeframeLabel})
Verified Live Database Metrics:
${JSON.stringify(metrics, null, 2)}
Sample Verified Data Records:
${JSON.stringify(sampleRecords.slice(0, 8), null, 2)}

Provide an executive, highly professional briefing in strict JSON:
{
  "narrative": "A concise, impactful 2-3 sentence markdown summary highlighting the exact numbers, rupee amounts (Rs.), percentages, and critical items. Use **bold** for metrics.",
  "executiveTakeaway": "1 sentence high-impact strategic takeaway for the pharmacy owner.",
  "actionItems": [
    "Immediate operational or clinical action 1 (e.g. stock replenishment, supplier return, pricing, or collection)",
    "Immediate action 2"
  ],
  "suggestedFollowUps": [
    "Contextual follow-up question 1",
    "Contextual follow-up question 2",
    "Contextual follow-up question 3"
  ]
}
Return ONLY valid JSON matching this schema.`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) throw new Error(`Gemini status ${res.status}`);
    const json = (await res.json()) as any;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  }

  /**
   * LLM Intent Classifier via OpenAI
   */
  private async classifyWithOpenAi(apiKey: string, question: string) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Classify pharmacy analytics questions into safe predefined intents: SALES_SUMMARY, TOP_SELLING_PRODUCTS, SLOW_MOVING_PRODUCTS, CATEGORY_BREAKDOWN, STORE_COMPARISON, EXPIRY_RISK_SUMMARY, REORDER_SUGGESTIONS, CUSTOMER_CREDIT.',
          },
          { role: 'user', content: question },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) throw new Error(`OpenAI status ${res.status}`);
    const json = (await res.json()) as any;
    return JSON.parse(json.choices?.[0]?.message?.content);
  }

  // ==========================================
  // SAFE PRE-APPROVED EXECUTION IMPLEMENTATIONS
  // ==========================================

  /**
   * 1. SALES_SUMMARY
   */
  private async executeSalesSummary(
    tenantId: string,
    storeId: string | undefined,
    startDate: Date,
    endDate: Date,
    timeframeLabel: string,
  ) {
    const where: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (storeId) where.storeId = storeId;

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        saleItems: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const totalOrders = sales.length;

    sales.forEach((s) => {
      totalRevenue += Number(s.totalAmount);
      s.saleItems.forEach((it) => {
        totalItemsSold += it.quantity;
      });
    });

    const aov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    // Group by day for trendline
    const dayMap = new Map<string, { date: string; revenue: number; orders: number }>();
    sales.forEach((s) => {
      const d = s.createdAt.toISOString().split('T')[0];
      const cur = dayMap.get(d) || { date: d, revenue: 0, orders: 0 };
      cur.revenue += Number(s.totalAmount);
      cur.orders += 1;
      dayMap.set(d, cur);
    });

    const chartData = Array.from(dayMap.values()).map((item) => ({
      ...item,
      revenue: Math.round(item.revenue),
    }));

    const narrative = `During **${timeframeLabel}**, total sales reached **Rs. ${totalRevenue.toLocaleString()}** across **${totalOrders} transactions**, with **${totalItemsSold} medicine units** dispensed. The average transaction value was **Rs. ${aov.toLocaleString()}**.`;

    return {
      narrative,
      chartType: 'line' as const,
      summaryMetrics: [
        { label: 'Total Revenue', value: `Rs. ${totalRevenue.toLocaleString()}` },
        { label: 'Completed Orders', value: totalOrders },
        { label: 'Units Dispensed', value: totalItemsSold },
        { label: 'Average Order Value', value: `Rs. ${aov.toLocaleString()}` },
      ],
      chartData,
      tableColumns: [
        { key: 'date', label: 'Date', format: 'date' as const },
        { key: 'orders', label: 'Transactions', format: 'number' as const },
        { key: 'revenue', label: 'Revenue', format: 'currency' as const },
      ],
      tableData: chartData,
      suggestedFollowUps: [
        'What were our top 5 selling medicines in this period?',
        'Show revenue breakdown by category',
        'Compare performance across all stores',
      ],
    };
  }

  /**
   * 2. TOP_SELLING_PRODUCTS
   */
  private async executeTopProducts(
    tenantId: string,
    storeId: string | undefined,
    startDate: Date,
    endDate: Date,
    timeframeLabel: string,
    limit: number,
  ) {
    const where: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (storeId) where.storeId = storeId;

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        saleItems: {
          include: {
            product: { select: { id: true, name: true, category: true, unit: true } },
          },
        },
      },
    });

    const statsMap = new Map<
      string,
      {
        name: string;
        category: string;
        unit: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    sales.forEach((s) => {
      s.saleItems.forEach((it) => {
        const pId = it.productId;
        const cur = statsMap.get(pId) || {
          name: it.product?.name || 'Unknown Item',
          category: it.product?.category || 'General',
          unit: it.product?.unit || 'Unit',
          unitsSold: 0,
          revenue: 0,
        };
        cur.unitsSold += it.quantity;
        cur.revenue += Number(it.unitPrice) * it.quantity - Number(it.discount);
        statsMap.set(pId, cur);
      });
    });

    const sorted = Array.from(statsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((item) => ({
        ...item,
        revenue: Math.round(item.revenue),
      }));

    const topItem = sorted[0];
    const narrative = topItem
      ? `In **${timeframeLabel}**, the highest-grossing medicine was **${topItem.name}** generating **Rs. ${topItem.revenue.toLocaleString()}** (${topItem.unitsSold} ${topItem.unit}s sold). The top ${sorted.length} medicines collectively contributed **Rs. ${sorted.reduce((acc, i) => acc + i.revenue, 0).toLocaleString()}**.`
      : `No product sales were recorded for **${timeframeLabel}**.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Top Performer', value: topItem ? topItem.name : 'N/A' },
        { label: 'Top Item Revenue', value: topItem ? `Rs. ${topItem.revenue.toLocaleString()}` : 0 },
        { label: 'Top Item Units', value: topItem ? topItem.unitsSold : 0 },
      ],
      chartData: sorted.map((s) => ({ name: s.name, revenue: s.revenue, unitsSold: s.unitsSold })),
      tableColumns: [
        { key: 'name', label: 'Medicine Name', format: 'text' as const },
        { key: 'category', label: 'Category', format: 'text' as const },
        { key: 'unitsSold', label: 'Units Sold', format: 'number' as const },
        { key: 'revenue', label: 'Revenue', format: 'currency' as const },
      ],
      tableData: sorted,
      suggestedFollowUps: [
        'Which medicines have the slowest sales?',
        'What is our total revenue this month?',
        'Show batches at risk of expiry for top products',
      ],
    };
  }

  /**
   * 3. SLOW_MOVING_PRODUCTS
   */
  private async executeSlowMovingProducts(
    tenantId: string,
    storeId: string | undefined,
    startDate: Date,
    endDate: Date,
    timeframeLabel: string,
    limit: number,
  ) {
    const allProducts = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, category: true, unit: true },
    });

    const where: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (storeId) where.storeId = storeId;

    const sales = await this.prisma.sale.findMany({
      where,
      include: { saleItems: true },
    });

    const soldMap = new Map<string, number>();
    sales.forEach((s) => {
      s.saleItems.forEach((it) => {
        soldMap.set(it.productId, (soldMap.get(it.productId) || 0) + it.quantity);
      });
    });

    const slowItems = allProducts
      .map((p) => ({
        name: p.name,
        category: p.category,
        unit: p.unit,
        unitsSold: soldMap.get(p.id) || 0,
      }))
      .sort((a, b) => a.unitsSold - b.unitsSold)
      .slice(0, limit);

    const zeroCount = slowItems.filter((i) => i.unitsSold === 0).length;
    const narrative = `Found **${slowItems.length} slow-moving medicines** during **${timeframeLabel}**, including **${zeroCount} products with zero sales**. Consider promotional discounting or checking expiration dates to prevent inventory obsolescence.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Zero Sales Count', value: zeroCount },
        { label: 'Analyzed Catalog Size', value: allProducts.length },
      ],
      chartData: slowItems.map((s) => ({ name: s.name, unitsSold: s.unitsSold })),
      tableColumns: [
        { key: 'name', label: 'Medicine', format: 'text' as const },
        { key: 'category', label: 'Category', format: 'text' as const },
        { key: 'unitsSold', label: 'Units Sold', format: 'number' as const },
      ],
      tableData: slowItems,
      suggestedFollowUps: [
        'Check expiry risk for these slow moving products',
        'Show top 5 best selling medicines instead',
        'What should we reorder soon?',
      ],
    };
  }

  /**
   * 4. CATEGORY_BREAKDOWN
   */
  private async executeCategoryBreakdown(
    tenantId: string,
    storeId: string | undefined,
    startDate: Date,
    endDate: Date,
    timeframeLabel: string,
  ) {
    const where: any = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (storeId) where.storeId = storeId;

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        saleItems: {
          include: {
            product: { select: { category: true } },
          },
        },
      },
    });

    const categoryMap = new Map<string, { category: string; revenue: number; units: number }>();
    let totalRev = 0;

    sales.forEach((s) => {
      s.saleItems.forEach((it) => {
        const cat = it.product?.category || 'General OTC';
        const cur = categoryMap.get(cat) || { category: cat, revenue: 0, units: 0 };
        const rev = Number(it.unitPrice) * it.quantity - Number(it.discount);
        cur.revenue += rev;
        cur.units += it.quantity;
        totalRev += rev;
        categoryMap.set(cat, cur);
      });
    });

    const chartData = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue),
        sharePercent: totalRev > 0 ? Math.round((c.revenue / totalRev) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topCategory = chartData[0];
    const narrative = topCategory
      ? `**${topCategory.category}** represents the largest revenue driver in **${timeframeLabel}** with **Rs. ${topCategory.revenue.toLocaleString()}** (${topCategory.sharePercent}% of total sales), followed by other pharmaceutical categories.`
      : `No categorized sales found for **${timeframeLabel}**.`;

    return {
      narrative,
      chartType: 'pie' as const,
      summaryMetrics: [
        { label: 'Top Category', value: topCategory ? topCategory.category : 'N/A' },
        { label: 'Top Category Share', value: topCategory ? `${topCategory.sharePercent}%` : '0%' },
        { label: 'Total Categories Sold', value: chartData.length },
      ],
      chartData: chartData.map((c) => ({ name: c.category, value: c.revenue, units: c.units })),
      tableColumns: [
        { key: 'category', label: 'Category', format: 'text' as const },
        { key: 'revenue', label: 'Revenue', format: 'currency' as const },
        { key: 'units', label: 'Units Sold', format: 'number' as const },
        { key: 'sharePercent', label: 'Revenue Share %', format: 'number' as const },
      ],
      tableData: chartData,
      suggestedFollowUps: [
        'Which specific medicines drove the top category?',
        'Show sales performance across all branches',
        'What are our overall monthly sales?',
      ],
    };
  }

  /**
   * 5. STORE_COMPARISON
   */
  private async executeStoreComparison(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    timeframeLabel: string,
  ) {
    const stores = await this.prisma.store.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, address: true },
    });

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { storeId: true, totalAmount: true },
    });

    const storeMap = new Map<string, { storeName: string; revenue: number; orders: number }>();
    stores.forEach((st) => {
      storeMap.set(st.id, { storeName: st.name, revenue: 0, orders: 0 });
    });

    sales.forEach((s) => {
      const cur = storeMap.get(s.storeId);
      if (cur) {
        cur.revenue += Number(s.totalAmount);
        cur.orders += 1;
      }
    });

    const chartData = Array.from(storeMap.values()).map((st) => ({
      ...st,
      revenue: Math.round(st.revenue),
      aov: st.orders > 0 ? Math.round(st.revenue / st.orders) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    const leader = chartData[0];
    const narrative = leader
      ? `Across **${stores.length} store locations** in **${timeframeLabel}**, **${leader.storeName}** led branch sales generating **Rs. ${leader.revenue.toLocaleString()}** across **${leader.orders} customer orders**.`
      : `No active stores recorded sales during **${timeframeLabel}**.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Leading Store', value: leader ? leader.storeName : 'N/A' },
        { label: 'Leading Revenue', value: leader ? `Rs. ${leader.revenue.toLocaleString()}` : 0 },
        { label: 'Active Branches', value: stores.length },
      ],
      chartData: chartData.map((st) => ({ name: st.storeName, revenue: st.revenue, orders: st.orders })),
      tableColumns: [
        { key: 'storeName', label: 'Branch Name', format: 'text' as const },
        { key: 'revenue', label: 'Total Revenue', format: 'currency' as const },
        { key: 'orders', label: 'Orders', format: 'number' as const },
        { key: 'aov', label: 'Average Order Value', format: 'currency' as const },
      ],
      tableData: chartData,
      suggestedFollowUps: [
        'Show top selling medicines in the leading store',
        'Compare customer credit balances across stores',
        'What are our total sales this week?',
      ],
    };
  }

  /**
   * 6. EXPIRY_RISK_SUMMARY
   */
  private async executeExpiryRiskSummary(tenantId: string, storeId: string | undefined) {
    const where: any = {
      tenantId,
      quantityRemaining: { gt: 0 },
    };
    if (storeId) where.storeId = storeId;

    const batches = await this.prisma.batch.findMany({
      where,
      include: {
        product: { select: { name: true, category: true, unit: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringBatches = batches.filter((b) => b.expiryDate <= ninetyDays);
    let capitalAtRisk = 0;

    const chartData = expiringBatches.slice(0, 8).map((b) => {
      const riskAmount = Number(b.costPrice) * b.quantityRemaining;
      capitalAtRisk += riskAmount;
      const days = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        medicine: b.product?.name || 'Item',
        batchNumber: b.batchNumber,
        daysToExpiry: days > 0 ? days : 0,
        quantityRemaining: b.quantityRemaining,
        riskAmount: Math.round(riskAmount),
        expiryDate: b.expiryDate.toISOString().split('T')[0],
      };
    });

    const narrative = `There are **${expiringBatches.length} batches** expiring within the next 90 days, representing **Rs. ${Math.round(capitalAtRisk).toLocaleString()} of pharmacy capital at risk**. We advise prioritizing FEFO sales or requesting supplier returns for near-expiry lots.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Batches Expiring Soon', value: expiringBatches.length },
        { label: 'Capital at Expiry Risk', value: `Rs. ${Math.round(capitalAtRisk).toLocaleString()}` },
        { label: 'Total Active Batches', value: batches.length },
      ],
      chartData: chartData.map((b) => ({ name: b.medicine, value: b.riskAmount, days: b.daysToExpiry })),
      tableColumns: [
        { key: 'medicine', label: 'Medicine', format: 'text' as const },
        { key: 'batchNumber', label: 'Batch #', format: 'text' as const },
        { key: 'daysToExpiry', label: 'Days Left', format: 'number' as const },
        { key: 'quantityRemaining', label: 'Remaining Stock', format: 'number' as const },
        { key: 'riskAmount', label: 'Capital at Risk', format: 'currency' as const },
      ],
      tableData: chartData,
      suggestedFollowUps: [
        'Show supplier details for expiring batches',
        'What medicines should we reorder right now?',
        'What were our top selling medicines this week?',
      ],
    };
  }

  /**
   * 7. REORDER_SUGGESTIONS
   */
  private async executeReorderAlerts(tenantId: string, storeId: string | undefined) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        batches: {
          where: storeId ? { storeId, quantityRemaining: { gt: 0 } } : { quantityRemaining: { gt: 0 } },
        },
      },
    });

    const lowStockItems: Array<{
      name: string;
      category: string;
      unit: string;
      currentStock: number;
      lowStockThreshold: number;
      suggestedReorder: number;
    }> = [];

    products.forEach((p) => {
      const stock = p.batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
      if (stock <= p.lowStockThreshold) {
        lowStockItems.push({
          name: p.name,
          category: p.category,
          unit: p.unit,
          currentStock: stock,
          lowStockThreshold: p.lowStockThreshold,
          suggestedReorder: Math.max(20, p.lowStockThreshold * 2 - stock),
        });
      }
    });

    const sorted = lowStockItems.sort((a, b) => a.currentStock - b.currentStock).slice(0, 10);
    const outOfStockCount = sorted.filter((s) => s.currentStock === 0).length;

    const narrative = `Found **${lowStockItems.length} medicines below safety replenishment thresholds**, including **${outOfStockCount} completely out-of-stock items**. We recommend generating purchase orders to prevent lost sales.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Low / Depleted Items', value: lowStockItems.length },
        { label: 'Critical Out-of-Stock', value: outOfStockCount },
      ],
      chartData: sorted.map((s) => ({ name: s.name, currentStock: s.currentStock, suggestedReorder: s.suggestedReorder })),
      tableColumns: [
        { key: 'name', label: 'Medicine', format: 'text' as const },
        { key: 'currentStock', label: 'Current Stock', format: 'number' as const },
        { key: 'lowStockThreshold', label: 'Min Threshold', format: 'number' as const },
        { key: 'suggestedReorder', label: 'Suggested Order Qty', format: 'number' as const },
      ],
      tableData: sorted,
      suggestedFollowUps: [
        'Open Smart Reorder Suggestions view',
        'Which medicines have the highest sales velocity?',
        'Show batches expiring in the next 90 days',
      ],
    };
  }

  /**
   * 8. CUSTOMER_CREDIT
   */
  private async executeCustomerCredit(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        creditBalance: { gt: 0 },
      },
      orderBy: { creditBalance: 'desc' },
      take: 10,
    });

    const allDebtors = await this.prisma.customer.findMany({
      where: { tenantId, creditBalance: { gt: 0 } },
      select: { creditBalance: true },
    });

    const totalOutstanding = allDebtors.reduce(
      (sum, c) => sum + Number(c.creditBalance),
      0,
    );

    const chartData = customers.map((c) => ({
      name: c.name,
      phone: c.phone || 'N/A',
      balance: Math.round(Number(c.creditBalance)),
    }));

    const topDebtor = chartData[0];
    const narrative = `Total outstanding customer credit across your pharmacy ledger stands at **Rs. ${Math.round(totalOutstanding).toLocaleString()}** across **${allDebtors.length} debtors**. The largest outstanding balance is held by **${topDebtor ? topDebtor.name : 'N/A'}** with **Rs. ${topDebtor ? topDebtor.balance.toLocaleString() : 0}**.`;

    return {
      narrative,
      chartType: 'bar' as const,
      summaryMetrics: [
        { label: 'Total Outstanding Khata', value: `Rs. ${Math.round(totalOutstanding).toLocaleString()}` },
        { label: 'Active Credit Debtors', value: allDebtors.length },
        { label: 'Largest Balance', value: topDebtor ? `Rs. ${topDebtor.balance.toLocaleString()}` : 0 },
      ],
      chartData: chartData.map((c) => ({ name: c.name, balance: c.balance })),
      tableColumns: [
        { key: 'name', label: 'Customer Name', format: 'text' as const },
        { key: 'phone', label: 'Phone', format: 'text' as const },
        { key: 'balance', label: 'Credit Balance', format: 'currency' as const },
      ],
      tableData: chartData,
      suggestedFollowUps: [
        'What were our total sales this month?',
        'Show top 5 selling medicines',
        'What items need replenishment?',
      ],
    };
  }
}
