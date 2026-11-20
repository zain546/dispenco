'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Clock,
  Boxes,
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  FileSpreadsheet,
  Star,
  Sparkles,
  X,
  FileDown,
  ChevronDown,
  FileText,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatCurrency, formatNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { productsApi } from '../services/products-api';
import { useInventoryAggregation } from '../hooks/use-inventory-queries';
import { ProductList, formatCategory, formatUnitPlural } from './product-list';
import { ProductBatchesModal } from './product-batches-modal';
import { ImportProductsModal } from './import-products-modal';
import { ExpiryRiskView } from './expiry-risk-view';
import { getProductSeoUrl } from '../utils/seo-utils';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { generateInventoryStockPdfDoc } from '../utils/inventory-report-pdf';

export type InventoryTab = 'in-stock' | 'full-catalog' | 'priority-top-sellers' | 'unstocked' | 'expiry-risk' | 'expiring-soon' | 'low-stock';

const DEFAULT_AGGREGATION_DATA = {
  totalProducts: 0,
  summary: {
    totalCatalogItems: 0,
    stockedCount: 0,
    unstockedCount: 0,
    priorityUnstockedCount: 0,
    completionPercentage: 100,
    totalPurchaseCost: 0,
    totalRetailValue: 0,
    totalPotentialProfit: 0,
    potentialMarginPercent: 0,
    totalStockUnits: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    priorityCount: 0,
  },
  products: [],
};

export function InventoryDashboard() {
  const { activeStore, activeStoreId, isAllStores } = useStore();
  const { user } = useAuth();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<InventoryTab>(!isAllStores ? 'in-stock' : 'full-catalog');
  const [search, setSearch] = useState('');

  // Read URL query parameter on mount for tab selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'expiry-risk' || tabParam === 'risk-forecast' || tabParam === 'risk') {
        setActiveTab('expiry-risk');
      } else if (tabParam === 'unstocked') {
        setActiveTab('unstocked');
      } else if (tabParam === 'priority-top-sellers' || tabParam === 'priority') {
        setActiveTab('priority-top-sellers');
      } else if (tabParam === 'expiring') {
        setActiveTab('expiring-soon');
      } else if (tabParam === 'low_stock') {
        setActiveTab('low-stock');
      } else if (tabParam === 'in-stock' || tabParam === 'in_stock') {
        setActiveTab('in-stock');
      } else if (tabParam === 'catalog' || tabParam === 'full-catalog') {
        setActiveTab('full-catalog');
      }
    }
  }, []);

  // Batch inspect & CSV Import modal states
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<{ id: string; name: string } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch: fetchAggregation,
  } = useInventoryAggregation({
    storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
    inStockOnly: activeTab === 'in-stock' ? true : undefined,
    lowStockOnly: activeTab === 'low-stock' ? true : undefined,
    expiringSoonOnly: activeTab === 'expiring-soon' ? true : undefined,
    priorityOnly: activeTab === 'priority-top-sellers' ? true : undefined,
    unstockedOnly: activeTab === 'unstocked' ? true : undefined,
    search: (activeTab !== 'full-catalog' && activeTab !== 'expiry-risk') ? (search.trim() || undefined) : undefined,
  });

  const data = queryData ?? DEFAULT_AGGREGATION_DATA;
  const fetchError = queryError
    ? getErrorMessage(queryError, 'Failed to load inventory aggregation metrics')
    : null;


  const handleExportStockPdf = async (scope: 'all' | 'in-stock' | 'low-stock' | 'expiring' = 'all') => {
    try {
      setIsExportingPdf(true);
      toast.loading('Compiling stock audit report PDF...', { id: 'stock-pdf-export' });

      let exportProducts = data.products;
      let exportSummary = data.summary;

      // When downloading 'all', fetch complete store catalog regardless of UI tab/search
      if (scope === 'all') {
        const fullRes = await productsApi.getInventoryAggregation({
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
        });
        exportProducts = fullRes.products;
        exportSummary = fullRes.summary;
      } else if (scope === 'in-stock') {
        const inStockRes = await productsApi.getInventoryAggregation({
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
          inStockOnly: true,
        });
        exportProducts = inStockRes.products;
        exportSummary = inStockRes.summary;
      } else if (scope === 'low-stock') {
        const lowStockRes = await productsApi.getInventoryAggregation({
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
          lowStockOnly: true,
        });
        exportProducts = lowStockRes.products;
        exportSummary = lowStockRes.summary;
      } else if (scope === 'expiring') {
        const expRes = await productsApi.getInventoryAggregation({
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
          expiringSoonOnly: true,
        });
        exportProducts = expRes.products;
        exportSummary = expRes.summary;
      }

      const { doc, filename } = await generateInventoryStockPdfDoc({
        storeName: isAllStores ? 'All Pharmacy Branches' : (activeStore?.name || 'Dispenco Pharmacy'),
        storeAddress: isAllStores ? 'Consolidated Organization-Wide Inventory' : activeStore?.address,
        reportScope: scope,
        generatedBy: user?.name || 'Pharmacy Staff',
        summary: exportSummary,
        products: exportProducts,
      });

      doc.save(filename);
      toast.success('Stock report PDF downloaded successfully!', { id: 'stock-pdf-export' });
    } catch (err: unknown) {
      console.error('Failed to export stock PDF:', err);
      toast.error('Failed to generate stock report PDF', { id: 'stock-pdf-export' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleInspectBatches = (productId: string, productName: string) => {
    setSelectedProductForModal({ id: productId, name: productName });
    setBatchModalOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Inventory & Exception Hub"
        description="FEFO-compliant inventory monitoring, stock alerts, and procurement management"
        icon={Boxes}
        headerRight={
          <Button
            variant="outline"
            size="icon"
            onClick={() => { void fetchAggregation(); }}
            disabled={isFetching}
            className="size-8 sm:hidden bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs shrink-0 cursor-pointer"
            title="Refresh inventory data"
          >
            <RefreshCw className={`size-3.5 text-muted-foreground ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </Button>
        }
        actions={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            {/* 1. Primary Action: Receive Stock */}
            <Button
              asChild
              size="sm"
              className="h-9 px-3.5 gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs justify-center cursor-pointer whitespace-nowrap w-full sm:w-auto"
            >
              <Link href="/inventory/receive">
                <Boxes className="size-4 shrink-0" />
                <span>Receive Stock</span>
              </Link>
            </Button>

            {/* Secondary Actions: Compact 3-Column on Mobile, Inline Flex on Desktop */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* 2. Catalog Action: Add Product */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-2 sm:px-3.5 gap-1.5 font-semibold text-xs bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs justify-center cursor-pointer whitespace-nowrap"
              >
                <Link href="/inventory/new">
                  <Plus className="size-3.5 text-primary shrink-0" />
                  <span className="hidden sm:inline">Add Product</span>
                  <span className="sm:hidden">Add</span>
                </Link>
              </Button>

              {/* 3. Data Intake: Import CSV */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
                className="h-9 px-2 sm:px-3 gap-1.5 font-semibold text-xs bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs justify-center cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="size-3.5 text-muted-foreground shrink-0" />
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </Button>

              {/* 4. Document Export: Export PDF with Dropdown Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExportingPdf}
                    className="h-9 px-2 sm:px-3 gap-1.5 font-semibold text-xs bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs justify-center cursor-pointer whitespace-nowrap"
                    title="Export inventory stock report in PDF"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                    ) : (
                      <FileDown className="size-3.5 text-primary shrink-0" />
                    )}
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                    <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs font-bold text-muted-foreground">
                    Stock PDF Reports
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleExportStockPdf('all')}
                    className="text-xs py-2 cursor-pointer flex flex-col items-start gap-0.5"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary shrink-0" />
                      <span>Entire Stock Report (All Items)</span>
                    </div>
                    <span className="text-micro text-muted-foreground">
                      Complete catalog with all active batches and stock levels
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportStockPdf('in-stock')}
                    className="text-xs py-2 cursor-pointer flex flex-col items-start gap-0.5"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Boxes className="size-3.5 text-success shrink-0" />
                      <span>In-Stock Items Only</span>
                    </div>
                    <span className="text-micro text-muted-foreground">
                      Medicines currently holding active non-zero stock
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportStockPdf('low-stock')}
                    className="text-xs py-2 cursor-pointer flex flex-col items-start gap-0.5"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-warning shrink-0" />
                      <span>Low Stock / Reorder Sheet</span>
                    </div>
                    <span className="text-micro text-muted-foreground">
                      Depleted items needing purchase reorders
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportStockPdf('expiring')}
                    className="text-xs py-2 cursor-pointer flex flex-col items-start gap-0.5"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-destructive shrink-0" />
                      <span>Expiring Soon (&lt; 180 Days)</span>
                    </div>
                    <span className="text-micro text-muted-foreground">
                      Batches requiring supplier return or markdown
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 5. Desktop Refresh Button on the right side */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => { void fetchAggregation(); }}
              disabled={isFetching}
              className="size-9 hidden sm:inline-flex bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs shrink-0 cursor-pointer"
              title="Refresh inventory data"
            >
              <RefreshCw className={`size-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      {/* Unified Executive KPI Strip: Capital Asset Valuation & Real-Time Operational Signals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Stock Asset Valuation & Retail Realizable Potential */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.03] p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-foreground/85 shrink-0">
                Stock Valuation
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-muted-foreground border-border/60 max-w-[75px] sm:max-w-none truncate shrink min-w-0">
                {!isAllStores ? (activeStore?.name || 'Branch') : 'All'}
              </Badge>
              {search.trim() && activeTab !== 'full-catalog' && activeTab !== 'expiry-risk' && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 text-primary border-primary/30 bg-primary/5 shrink-0 hidden sm:inline-flex">
                  Filtered
                </Badge>
              )}
            </div>
            <div className="size-7 sm:size-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Wallet className="size-3.5 sm:size-4" />
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
              {formatCurrency(data.summary.totalPurchaseCost ?? 0)}
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span>MRP: <strong className="text-foreground font-semibold">{formatCurrency(data.summary.totalRetailValue ?? 0)}</strong></span>
              <span className="text-border">•</span>
              <span
                className={`font-semibold flex items-center gap-0.5 ${
                  (data.summary.potentialMarginPercent ?? 0) >= 0
                    ? 'text-success'
                    : 'text-destructive'
                }`}
              >
                {(data.summary.potentialMarginPercent ?? 0) >= 0 ? (
                  <TrendingUp className="size-3 shrink-0" />
                ) : null}
                {(data.summary.potentialMarginPercent ?? 0) >= 0
                  ? `+${data.summary.potentialMarginPercent ?? 0}%`
                  : `${data.summary.potentialMarginPercent}%`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Available In-Stock Medicines & Active Units */}
        <div
          onClick={() => setActiveTab(!isAllStores ? 'in-stock' : 'full-catalog')}
          className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all ${
            activeTab === 'in-stock' || (isAllStores && activeTab === 'full-catalog')
              ? 'ring-1 ring-primary/50 border-primary bg-primary/[0.04] shadow-2xs'
              : 'border-border/80 bg-gradient-to-br from-card via-card to-success/[0.02] hover:border-primary/40 hover:bg-muted/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-foreground/85">
              {!isAllStores ? 'Available In-Stock' : 'Master Catalog'}
            </span>
            <div className="size-7 sm:size-8 rounded-lg bg-success/10 text-success ring-1 ring-success/20 flex items-center justify-center shrink-0">
              <Boxes className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1.5">
              <div className="text-lg sm:text-2xl font-black tracking-tight text-foreground tabular-nums">
                {!isAllStores ? (data.summary.stockedCount ?? 0) : data.summary.totalCatalogItems}
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1">Items</span>
              </div>
              <span className="text-[10px] font-semibold text-success bg-success/15 border border-success/25 px-1.5 py-0.5 rounded-md shrink-0">
                Active
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-1 leading-snug">
              {formatNumber(data.summary.totalStockUnits ?? 0)} physical units on hand
            </div>
          </div>
        </div>

        {/* 3. Expiring Soon Batches (< 180 Days FEFO Alert) */}
        <div
          onClick={() => setActiveTab('expiring-soon')}
          className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all ${
            activeTab === 'expiring-soon'
              ? 'ring-1 ring-destructive/50 border-destructive bg-destructive/[0.04] shadow-2xs'
              : 'border-border/80 bg-gradient-to-br from-card via-card to-destructive/[0.02] hover:border-destructive/40 hover:bg-muted/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-foreground/85">
              Expiring Soon
            </span>
            <div
              className={`size-7 sm:size-8 rounded-lg flex items-center justify-center shrink-0 ring-1 ${
                data.summary.expiringSoonCount > 0
                  ? 'bg-destructive/10 text-destructive ring-destructive/20'
                  : 'bg-muted text-muted-foreground ring-border/50'
              }`}
            >
              <Clock className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1.5">
              <div
                className={`text-lg sm:text-2xl font-black tracking-tight tabular-nums ${
                  data.summary.expiringSoonCount > 0 ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {data.summary.expiringSoonCount}
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1">Batches</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${
                  data.summary.expiringSoonCount > 0
                    ? 'text-destructive bg-destructive/15 border-destructive/25'
                    : 'text-muted-foreground bg-muted/60 border-border/60'
                }`}
              >
                &lt; 180 Days
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-1 leading-snug">
              {data.summary.expiringSoonCount > 0 ? 'FEFO markdown / return needed' : 'Zero near-expiry risk'}
            </div>
          </div>
        </div>

        {/* 4. Low Stock & Depleted Inventory Restock Alerts */}
        <div
          onClick={() => setActiveTab('low-stock')}
          className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all ${
            activeTab === 'low-stock'
              ? 'ring-1 ring-warning/50 border-warning bg-warning/[0.04] shadow-2xs'
              : 'border-border/80 bg-gradient-to-br from-card via-card to-warning/[0.02] hover:border-warning/40 hover:bg-muted/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-foreground/85">
              Low Stock Alerts
            </span>
            <div
              className={`size-7 sm:size-8 rounded-lg flex items-center justify-center shrink-0 ring-1 ${
                data.summary.lowStockCount > 0
                  ? 'bg-warning/10 text-warning ring-warning/20'
                  : 'bg-muted text-muted-foreground ring-border/50'
              }`}
            >
              <AlertTriangle className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1.5">
              <div
                className={`text-lg sm:text-2xl font-black tracking-tight tabular-nums ${
                  data.summary.lowStockCount > 0 ? 'text-warning' : 'text-foreground'
                }`}
              >
                {data.summary.lowStockCount}
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground ml-1">Items</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${
                  data.summary.lowStockCount > 0
                    ? 'text-warning bg-warning/15 border-warning/25'
                    : 'text-muted-foreground bg-muted/60 border-border/60'
                }`}
              >
                {data.summary.lowStockCount > 0 ? 'Needs Restock' : 'Healthy'}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-1 leading-snug">
              {data.summary.lowStockCount > 0 ? 'Reorder threshold triggered' : 'All stock levels healthy'}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as InventoryTab)}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 custom-scrollbar pb-1 sm:pb-0">
            <TabsList className="flex items-center gap-1 p-1 h-auto border border-border/60 bg-muted/40 rounded-lg w-max">
              <TabsTrigger value="in-stock" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <Boxes className="size-3.5 text-success shrink-0" />
                <span>In-Stock ({data.summary.stockedCount ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="full-catalog" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <Package className="size-3.5 text-primary shrink-0" />
                <span>Master Catalog ({data.summary.totalCatalogItems})</span>
              </TabsTrigger>
              <TabsTrigger value="priority-top-sellers" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <Star className="size-3.5 text-warning fill-warning shrink-0" />
                <span>Top Sellers ({data.summary.priorityCount})</span>
              </TabsTrigger>
              <TabsTrigger value="unstocked" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <TrendingDown className="size-3.5 text-warning shrink-0" />
                <span>Unstocked ({data.summary.unstockedCount ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="expiring-soon" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <Clock className="size-3.5 text-destructive shrink-0" />
                <span>Expiring ({data.summary.expiringSoonCount})</span>
              </TabsTrigger>
              <TabsTrigger value="expiry-risk" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 text-primary data-[state=active]:bg-primary/10 shrink-0 whitespace-nowrap cursor-pointer">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span>Risk Forecast</span>
              </TabsTrigger>
              <TabsTrigger value="low-stock" className="gap-1.5 font-semibold text-xs px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <AlertTriangle className="size-3.5 text-warning shrink-0" />
                <span>Low Stock ({data.summary.lowStockCount})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {activeTab !== 'full-catalog' && activeTab !== 'expiry-risk' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines & inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          )}
        </div>

        {/* Tab: In-Stock Available Products */}
        <TabsContent value="in-stock" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Boxes className="size-4 text-success" />
                  <span>
                    {!isAllStores ? 'Available Branch Inventory' : 'Available Network Stock'}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {!isAllStores
                    ? 'Medicines currently stocked with active, non-zero quantity batches in this branch'
                    : 'Medicines with active stock across your company store locations'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAggregation()}
                disabled={isLoading}
                className="size-8 p-0 shrink-0"
                aria-label="Refresh in-stock medicines"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to Load Available Inventory"
                    description={fetchError}
                    onRetry={() => fetchAggregation()}
                  />
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={4} rows={5} />
                </div>
              ) : data.products.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title="No Medicines In Stock Yet"
                  description={
                    !isAllStores
                      ? `This branch has 0 stocked medicines. You have ${data.summary.totalCatalogItems} medicines in your Master Catalog ready for stock intake.`
                      : 'No stocked medicines found across your active store locations.'
                  }
                  action={
                    <Button asChild size="sm" className="gap-1.5 font-semibold text-xs shadow-xs">
                      <Link href="/inventory/receive">
                        <Boxes className="size-3.5" />
                        <span>Receive Stock</span>
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{product.name}</span>
                          <Badge variant="secondary" className="text-micro">
                            {formatCategory(product.category)}
                          </Badge>
                          {product.isPriority && (
                            <StatusBadge
                              variant="warning"
                              dot={false}
                              size="xs"
                              className="font-bold cursor-default"
                              title="Top Seller Priority Onboarding Item"
                            >
                              <Star className="size-3 fill-warning text-warning inline mr-1" />
                              Top Seller
                            </StatusBadge>
                          )}
                          <StatusBadge variant="success" size="xs">
                            In Stock ({formatUnitPlural(product.unit, product.totalStock)})
                          </StatusBadge>
                          {product.isLowStock && (
                            <StatusBadge variant="warning" size="xs">
                              Low Stock
                            </StatusBadge>
                          )}
                          {product.isExpiringSoon && (
                            <StatusBadge variant="danger" size="xs">
                              Expiring Soon
                            </StatusBadge>
                          )}
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5 flex-wrap">
                          <span>Available Stock: <strong className="text-foreground">{formatUnitPlural(product.unit, product.totalStock)}</strong></span>
                          <span>•</span>
                          <span>Active Batches: <strong className="text-foreground">{product.batchCount}</strong></span>
                          {product.earliestExpiryDate && (
                            <>
                              <span>•</span>
                              <span>Nearest Expiry: <strong className="text-foreground">{formatDate(product.earliestExpiryDate)}</strong></span>
                            </>
                          )}
                          {product.avgCostPrice !== undefined && product.avgSellPrice !== undefined && product.avgSellPrice > 0 && (
                            <>
                              <span>•</span>
                              <span>Cost: <strong className="text-foreground">{formatCurrency(product.avgCostPrice)}</strong></span>
                              <span>•</span>
                              <span>MRP: <strong className="text-foreground">{formatCurrency(product.avgSellPrice)}</strong></span>
                              {product.totalRetailValue !== undefined && product.totalRetailValue > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Valuation: <strong className="text-success">{formatCurrency(product.totalRetailValue)}</strong></span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspectBatches(product.id, product.name)}
                          className="gap-1.5 h-8.5 text-xs font-semibold flex-1 sm:flex-initial justify-center"
                        >
                          <Layers className="size-3.5 text-primary" />
                          <span>Batches</span>
                        </Button>
                        <Button asChild size="sm" className="gap-1.5 h-8.5 text-xs font-semibold flex-1 sm:flex-initial justify-center">
                          <Link href={`/inventory/receive?productId=${product.id}`}>
                            <Boxes className="size-3.5" />
                            <span>Receive Stock</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Priority Top Sellers Queue */}
        <TabsContent value="priority-top-sellers" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Star className="size-4 text-warning fill-warning" />
                  <span>Top-Selling Medicines & Priority Products Queue</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  High-turnover products flagged for fast-track stock intake during tenant onboarding
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAggregation()}
                disabled={isLoading}
                className="size-8 p-0 shrink-0"
                aria-label="Refresh priority top sellers"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to Load Priority Queue"
                    description={fetchError}
                    onRetry={() => fetchAggregation()}
                  />
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={4} rows={5} />
                </div>
              ) : data.products.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No Top Sellers Flagged"
                  description="Import a CSV with top-sellers marked or click the star icon on catalog items to flag them."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setImportModalOpen(true)}
                      className="gap-1.5 font-semibold text-xs border-success/40 text-success hover:bg-success/10"
                    >
                      <FileSpreadsheet className="size-3.5" />
                      <span>Import CSV</span>
                    </Button>
                  }
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{product.name}</span>
                          <Badge variant="secondary" className="text-micro">
                            {formatCategory(product.category)}
                          </Badge>
                          <StatusBadge
                            variant="warning"
                            dot={false}
                            size="xs"
                            className="font-bold cursor-default"
                          >
                            <Star className="size-3 fill-warning text-warning inline mr-1" />
                            Top Seller
                          </StatusBadge>
                          {product.isOutofStock ? (
                            <StatusBadge variant="danger" size="xs">
                              Stock Intake Needed
                            </StatusBadge>
                          ) : product.isLowStock ? (
                            <StatusBadge variant="warning" size="xs">
                              Low Stock
                            </StatusBadge>
                          ) : (
                            <StatusBadge variant="success" size="xs">
                              In Stock ({formatUnitPlural(product.unit, product.totalStock)})
                            </StatusBadge>
                          )}
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5 flex-wrap">
                          {product.vendorName ? (
                            <span className="bg-warning/10 text-warning px-2 py-0.5 rounded border border-warning/20 font-medium text-xs">
                              Vendor / Supplier: <strong className="text-foreground">{product.vendorName}</strong>
                            </span>
                          ) : product.manufacturer ? (
                            <span className="bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium text-xs">
                              Manufacturer: <strong className="text-foreground">{product.manufacturer}</strong>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/80 font-medium text-xs">
                              Vendor / Supplier: <span className="text-muted-foreground italic">Listed per Batch</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>Available Stock: <strong className="text-foreground">{formatUnitPlural(product.unit, product.totalStock)}</strong></span>
                          <span>•</span>
                          <span>Active Batches: <strong className="text-foreground">{product.batchCount}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectBatches(product.id, product.name)}
                            className="gap-1.5 h-8 text-xs font-semibold"
                          >
                            <Layers className="size-3.5 text-primary" />
                            <span>Batches</span>
                          </Button>
                          <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Link href={`/inventory/receive?productId=${product.id}`}>
                              <Boxes className="size-3.5" />
                              <span>Intake Stock</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Unstocked Products Queue */}
        <TabsContent value="unstocked" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingDown className="size-4 text-warning" />
                  <span>Unstocked Catalog Queue (Pending Initial Batch Setup)</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Products registered in store catalog that do not have active inventory batches yet
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAggregation()}
                disabled={isLoading}
                className="size-8 p-0 shrink-0"
                aria-label="Refresh unstocked items queue"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to Load Unstocked Queue"
                    description={fetchError}
                    onRetry={() => fetchAggregation()}
                  />
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={4} rows={5} />
                </div>
              ) : data.products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Catalog 100% Stocked!"
                  description="All products in your inventory catalog have active stock batches."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{product.name}</span>
                          <Badge variant="secondary" className="text-micro">
                            {formatCategory(product.category)}
                          </Badge>
                          {product.isPriority && (
                            <StatusBadge
                              variant="warning"
                              dot={false}
                              size="xs"
                              className="font-bold cursor-default"
                            >
                              <Star className="size-3 fill-warning text-warning inline mr-1" />
                              Top Seller
                            </StatusBadge>
                          )}
                          <StatusBadge variant="warning" size="xs">
                            0 Stock / 0 Batches
                          </StatusBadge>
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <p className="text-xs text-muted-foreground pt-0.5">
                          Unit: <strong className="text-foreground">{product.unit}</strong> | Low Stock Threshold: <strong className="text-foreground">{product.lowStockThreshold}</strong>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                          <Link href={`/inventory/receive?productId=${product.id}`}>
                            <Boxes className="size-3.5" />
                            <span>Intake Initial Batch</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Low Stock Exceptions */}
        <TabsContent value="low-stock" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="size-4 text-warning" />
                  <span>Low & Out of Stock Exception Queue</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Products requiring immediate stock replenishment or purchase order creation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5">
                  <Link href="/purchases?tab=suggestions">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Smart Reorder</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchAggregation()}
                  disabled={isLoading}
                  className="size-8 p-0 shrink-0"
                  aria-label="Refresh stock alert exceptions"
                >
                  <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to Load Low Stock Alerts"
                    description={fetchError}
                    onRetry={() => fetchAggregation()}
                  />
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={4} rows={5} />
                </div>
              ) : data.products.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No Low Stock Alerts"
                  description="All active medicine items meet or exceed minimum stock thresholds."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{product.name}</span>
                          <Badge variant="secondary" className="text-micro">
                            {formatCategory(product.category)}
                          </Badge>
                          {product.isOutofStock ? (
                            <StatusBadge variant="danger" size="xs">
                              Out of Stock
                            </StatusBadge>
                          ) : (
                            <StatusBadge variant="warning" size="xs">
                              Low Stock
                            </StatusBadge>
                          )}
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span>Threshold: <strong className="text-foreground">{formatUnitPlural(product.unit, product.lowStockThreshold)}</strong></span>
                          <span>Active Batches: <strong className="text-foreground">{product.batchCount}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Current Available</p>
                          <p className={`text-base font-extrabold ${product.isOutofStock ? 'text-destructive' : 'text-warning'}`}>
                            {formatUnitPlural(product.unit, product.totalStock)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold">
                            <Link href={`/inventory/receive?productId=${product.id}`}>
                              <Boxes className="size-3.5" />
                              <span>Receive Stock</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Expiring Soon Exceptions */}
        <TabsContent value="expiring-soon" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="size-4 text-destructive" />
                  <span>FEFO Expiry Warning Queue (180 Days Window)</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Batches approaching expiration date to prioritize for sales or vendor returns
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAggregation()}
                disabled={isLoading}
                className="size-8 p-0 shrink-0"
                aria-label="Refresh expiry warnings"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {fetchError ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to Load Expiry Alerts"
                    description={fetchError}
                    onRetry={() => fetchAggregation()}
                  />
                </div>
              ) : isLoading ? (
                <div className="p-4">
                  <TableSkeleton columns={4} rows={5} />
                </div>
              ) : data.products.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No Near-Expiry Batches"
                  description="All active stock batches have clean shelf life remaining."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.products.map((product) => {
                    const days = product.daysUntilEarliestExpiry ?? 999;
                    const isCritical = days <= 30;

                    return (
                      <div
                        key={product.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{product.name}</span>
                            <Badge variant="secondary" className="text-micro">
                              {formatCategory(product.category)}
                            </Badge>
                            {product.earliestBatchNumber && (
                              <Badge variant="outline" className="text-micro font-mono">
                                Batch #{product.earliestBatchNumber}
                              </Badge>
                            )}
                          </div>
                          {product.genericName && (
                            <p className="text-xs text-muted-foreground">{product.genericName}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span>Expiry Date: <strong className="text-foreground">{formatDate(product.earliestExpiryDate)}</strong></span>
                            <span>Remaining Stock: <strong className="text-foreground">{formatUnitPlural(product.unit, product.totalStock)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">Shelf Life</p>
                            <StatusBadge
                              variant={isCritical ? 'danger' : 'warning'}
                              size="sm"
                            >
                              <Calendar className="size-3 inline mr-1" />
                              {days <= 0 ? 'EXPIRED' : `${days} Days Left`}
                            </StatusBadge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspectBatches(product.id, product.name)}
                            className="gap-1.5 h-8 text-xs font-semibold"
                          >
                            <Layers className="size-3.5 text-primary" />
                            <span>Inspect Batches</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Advanced Expiry-Risk Forecast (Velocity-driven) */}
        <TabsContent value="expiry-risk" className="mt-0 space-y-4">
          <ExpiryRiskView onNavigateToCatalog={() => setActiveTab('full-catalog')} />
        </TabsContent>

        {/* Tab 3: Full Catalog */}
        <TabsContent value="full-catalog" className="mt-0">
          <ProductList hideHeader />
        </TabsContent>
      </Tabs>

      {/* Batch Inspection Modal */}
      {selectedProductForModal && (
        <ProductBatchesModal
          open={batchModalOpen}
          onOpenChange={(open) => {
            setBatchModalOpen(open);
            if (!open) setSelectedProductForModal(null);
          }}
          productId={selectedProductForModal.id}
          storeId={(!isAllStores && activeStoreId) ? activeStoreId : undefined}
        />
      )}

      {/* CSV Import Modal */}
      <ImportProductsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => fetchAggregation()}
      />
    </div>
  );
}
