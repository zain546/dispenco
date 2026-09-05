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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { productsApi } from '../services/products-api';
import { ProductList, formatCategory, formatUnitPlural } from './product-list';
import { ProductBatchesModal } from './product-batches-modal';
import { ImportProductsModal } from './import-products-modal';
import { getProductSeoUrl } from '../utils/seo-utils';

export function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'full-catalog' | 'priority-top-sellers' | 'unstocked' | 'expiring-soon' | 'low-stock'>('full-catalog');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{
    totalProducts: number;
    summary: {
      totalCatalogItems: number;
      stockedCount?: number;
      unstockedCount?: number;
      priorityUnstockedCount?: number;
      completionPercentage?: number;
      outOfStockCount: number;
      lowStockCount: number;
      expiringSoonCount: number;
      priorityCount: number;
    };
    products: Array<{
      id: string;
      name: string;
      genericName: string | null;
      category: string;
      unit: string;
      barcode: string | null;
      lowStockThreshold: number;
      totalStock: number;
      batchCount: number;
      earliestBatchNumber: string | null;
      earliestExpiryDate: string | null;
      daysUntilEarliestExpiry: number | null;
      isOutofStock: boolean;
      isLowStock: boolean;
      isExpiringSoon: boolean;
      isPriority: boolean;
    }>;
  }>({
    totalProducts: 0,
    summary: {
      totalCatalogItems: 0,
      stockedCount: 0,
      unstockedCount: 0,
      priorityUnstockedCount: 0,
      completionPercentage: 100,
      outOfStockCount: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
      priorityCount: 0,
    },
    products: [],
  });

  // Read URL query parameter on mount for tab selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'unstocked') {
        setActiveTab('unstocked');
      } else if (tabParam === 'priority-top-sellers' || tabParam === 'priority') {
        setActiveTab('priority-top-sellers');
      } else if (tabParam === 'expiring') {
        setActiveTab('expiring-soon');
      } else if (tabParam === 'low_stock') {
        setActiveTab('low-stock');
      }
    }
  }, []);

  // Batch inspect & CSV Import modal states
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<{ id: string; name: string } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const fetchAggregation = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productsApi.getInventoryAggregation({
        lowStockOnly: activeTab === 'low-stock' ? true : undefined,
        expiringSoonOnly: activeTab === 'expiring-soon' ? true : undefined,
        priorityOnly: activeTab === 'priority-top-sellers' ? true : undefined,
        unstockedOnly: activeTab === 'unstocked' ? true : undefined,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch {
      toast.error('Failed to load inventory aggregation metrics');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchAggregation();
  }, [fetchAggregation]);

  const handleInspectBatches = (productId: string, productName: string) => {
    setSelectedProductForModal({ id: productId, name: productName });
    setBatchModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="size-6 text-primary shrink-0" />
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Inventory & Exception Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            FEFO-compliant inventory monitoring, stock alerts, and procurement management
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            asChild
            size="sm"
            className="h-9 px-3 flex-1 sm:flex-initial gap-1.5 font-semibold text-xs sm:text-sm shadow-xs"
          >
            <Link href="/inventory/receive">
              <Boxes className="size-4 shrink-0" />
              <span className="truncate">Receive Stock</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3 flex-1 sm:flex-initial gap-1.5 font-semibold text-xs sm:text-sm border-primary/30 text-primary hover:bg-primary/5"
          >
            <Link href="/inventory/new">
              <Plus className="size-4 shrink-0" />
              <span className="truncate">Add Product</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            className="h-9 px-3 flex-1 sm:flex-initial gap-1.5 font-semibold text-xs sm:text-sm border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="size-4 shrink-0" />
            <span className="truncate">Import CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAggregation()}
            disabled={isLoading}
            className="h-9 w-9 p-0 sm:w-auto sm:px-3 flex items-center justify-center shrink-0 gap-1.5 text-xs sm:text-sm"
            title="Refresh inventory data"
          >
            <RefreshCw className={`size-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Onboarding Priority Alert Banner */}
      {data.summary.priorityCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Star className="size-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-sm leading-snug">
                {data.summary.priorityCount} Top Seller Product{data.summary.priorityCount > 1 ? 's' : ''} Flagged for Onboarding Priority
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Complete stock intake and FEFO batch details for your highest turnover inventory items first.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab('priority-top-sellers')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8.5 px-3 shrink-0 gap-1.5 shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>Review Top Sellers ({data.summary.priorityCount})</span>
          </Button>
        </div>
      )}

      {/* Overview Metric Cards (Scrollable on Mobile, Grid on Tablet/Desktop) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 no-scrollbar pb-1 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
        {/* Card 1: Full Catalog */}
        <Card
          onClick={() => setActiveTab('full-catalog')}
          className={`w-[210px] xs:w-[230px] sm:w-auto shrink-0 snap-start md:shrink md:w-auto cursor-pointer transition-all hover:border-primary/50 ${
            activeTab === 'full-catalog' ? 'ring-2 ring-primary/40 border-primary/50 bg-primary/5' : 'bg-card'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Catalog
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-3xl font-bold text-foreground">
                  {data.summary.totalCatalogItems}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">medicines</span>
              </div>
            </div>
            <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="size-4.5 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Top Sellers Priority */}
        <Card
          onClick={() => setActiveTab('priority-top-sellers')}
          className={`w-[210px] xs:w-[230px] sm:w-auto shrink-0 snap-start md:shrink md:w-auto cursor-pointer transition-all hover:border-amber-500/50 ${
            activeTab === 'priority-top-sellers' ? 'ring-2 ring-amber-500/40 border-amber-500/50 bg-amber-500/5' : 'bg-card'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Top Sellers
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {data.summary.priorityCount}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">priority</span>
              </div>
            </div>
            <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="size-4.5 sm:size-5 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Expiring Soon */}
        <Card
          onClick={() => setActiveTab('expiring-soon')}
          className={`w-[210px] xs:w-[230px] sm:w-auto shrink-0 snap-start md:shrink md:w-auto cursor-pointer transition-all hover:border-rose-500/50 ${
            activeTab === 'expiring-soon' ? 'ring-2 ring-rose-500/40 border-rose-500/50 bg-rose-500/5' : 'bg-card'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expiring (90 Days)
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-3xl font-bold text-rose-600">
                  {data.summary.expiringSoonCount}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">batches</span>
              </div>
            </div>
            <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Clock className="size-4.5 sm:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Low Stock Exceptions */}
        <Card
          onClick={() => setActiveTab('low-stock')}
          className={`w-[210px] xs:w-[230px] sm:w-auto shrink-0 snap-start md:shrink md:w-auto cursor-pointer transition-all hover:border-amber-500/50 ${
            activeTab === 'low-stock' ? 'ring-2 ring-amber-500/40 border-amber-500/50 bg-amber-500/5' : 'bg-card'
          }`}
        >
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Low Stock Alerts
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-3xl font-bold text-amber-600">
                  {data.summary.lowStockCount}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground">items</span>
              </div>
            </div>
            <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4.5 sm:size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'full-catalog' | 'priority-top-sellers' | 'unstocked' | 'expiring-soon' | 'low-stock')}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 w-full sm:w-auto p-1 h-auto border border-border/40 gap-1">
            <TabsTrigger value="full-catalog" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">
              <Package className="size-3.5 text-primary shrink-0" />
              <span>Catalog ({data.summary.totalCatalogItems})</span>
            </TabsTrigger>
            <TabsTrigger value="priority-top-sellers" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">
              <Star className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>Top Sellers ({data.summary.priorityCount})</span>
            </TabsTrigger>
            <TabsTrigger value="unstocked" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">
              <TrendingDown className="size-3.5 text-amber-600 shrink-0" />
              <span>Unstocked ({data.summary.unstockedCount ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="expiring-soon" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">
              <Clock className="size-3.5 text-rose-500 shrink-0" />
              <span>Expiring ({data.summary.expiringSoonCount})</span>
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="gap-1 sm:gap-1.5 font-medium text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5">
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
              <span>Low Stock ({data.summary.lowStockCount})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'full-catalog' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search exceptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          )}
        </div>

        {/* Tab: Priority Top Sellers Queue */}
        <TabsContent value="priority-top-sellers" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="px-4 py-3 sm:p-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span>Top Sellers Onboarding Priority Queue</span>
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
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading priority top sellers...</span>
                </div>
              ) : data.products.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                    <Star className="size-6 text-amber-500" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">No Top Sellers Flagged</p>
                  <p className="text-xs">Import a CSV with top-sellers marked or click the star icon on catalog items to flag them.</p>
                </div>
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
                          <Badge variant="secondary" className="text-[10px]">
                            {formatCategory(product.category)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0 font-bold"
                          >
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                            <span>Top Seller</span>
                          </Badge>
                          {product.isOutofStock ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Stock Intake Needed
                            </Badge>
                          ) : product.isLowStock ? (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              In Stock ({product.totalStock} {product.unit}s)
                            </Badge>
                          )}
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span>Available Stock: <strong className="text-foreground">{formatUnitPlural(product.unit, product.totalStock)}</strong></span>
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
                          <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white">
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
                  <TrendingDown className="size-4 text-amber-600" />
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
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading unstocked items queue...</span>
                </div>
              ) : data.products.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Package className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Catalog 100% Stocked!</p>
                  <p className="text-xs">All products in your inventory catalog have active stock batches.</p>
                </div>
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
                          <Badge variant="secondary" className="text-[10px]">
                            {formatCategory(product.category)}
                          </Badge>
                          {product.isPriority && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 px-1.5 py-0 font-bold"
                            >
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              <span>Top Seller</span>
                            </Badge>
                          )}
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                            0 Stock / 0 Batches
                          </Badge>
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
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span>Low & Out of Stock Exception Queue</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Products requiring immediate stock replenishment or purchase order creation
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchAggregation()}
                disabled={isLoading}
                className="size-8 p-0 shrink-0"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading stock alert exceptions...</span>
                </div>
              ) : data.products.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Package className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">No Low Stock Alerts</p>
                  <p className="text-xs">All active medicine items meet or exceed minimum stock thresholds.</p>
                </div>
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
                          <Badge variant="secondary" className="text-[10px]">
                            {formatCategory(product.category)}
                          </Badge>
                          {product.isOutofStock ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        {product.genericName && (
                          <p className="text-xs text-muted-foreground">{product.genericName}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                          <span>Threshold: <strong className="text-foreground">{product.lowStockThreshold} {product.unit}s</strong></span>
                          <span>Active Batches: <strong className="text-foreground">{product.batchCount}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Current Available</p>
                          <p className={`text-base font-extrabold ${product.isOutofStock ? 'text-destructive' : 'text-amber-600'}`}>
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
                  <Clock className="size-4 text-rose-500" />
                  <span>FEFO Expiry Warning Queue (90 Days Window)</span>
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
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <span className="text-xs">Loading FEFO expiry warnings...</span>
                </div>
              ) : data.products.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Clock className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">No Near-Expiry Batches</p>
                  <p className="text-xs">All active stock batches have clean shelf life remaining.</p>
                </div>
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
                            <Badge variant="secondary" className="text-[10px]">
                              {formatCategory(product.category)}
                            </Badge>
                            {product.earliestBatchNumber && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                Batch #{product.earliestBatchNumber}
                              </Badge>
                            )}
                          </div>
                          {product.genericName && (
                            <p className="text-xs text-muted-foreground">{product.genericName}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span>Expiry Date: <strong className="text-foreground">{product.earliestExpiryDate ? new Date(product.earliestExpiryDate).toLocaleDateString() : 'N/A'}</strong></span>
                            <span>Remaining Stock: <strong className="text-foreground">{formatUnitPlural(product.unit, product.totalStock)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                          <div className="text-left sm:text-right">
                            <p className="text-xs text-muted-foreground">Shelf Life</p>
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold gap-1 px-2 py-0.5 ${isCritical
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }`}
                            >
                              <Calendar className="size-3" />
                              <span>{days <= 0 ? 'EXPIRED' : `${days} Days Left`}</span>
                            </Badge>
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
