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
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { productsApi } from '../services/products-api';
import { ProductList, formatCategory, formatUnitPlural } from './product-list';
import { ProductBatchesModal } from './product-batches-modal';
import { ImportProductsModal } from './import-products-modal';
import { ExpiryRiskView } from './expiry-risk-view';
import { getProductSeoUrl } from '../utils/seo-utils';
import { useStore } from '@/context/store-context';

export type InventoryTab = 'in-stock' | 'full-catalog' | 'priority-top-sellers' | 'unstocked' | 'expiry-risk' | 'expiring-soon' | 'low-stock';

export function InventoryDashboard() {
  const { activeStoreId, isAllStores } = useStore();
  const [activeTab, setActiveTab] = useState<InventoryTab>(!isAllStores ? 'in-stock' : 'full-catalog');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
      vendorName?: string | null;
      manufacturer?: string | null;
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

  const fetchAggregation = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await productsApi.getInventoryAggregation({
        storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
        inStockOnly: activeTab === 'in-stock' ? true : undefined,
        lowStockOnly: activeTab === 'low-stock' ? true : undefined,
        expiringSoonOnly: activeTab === 'expiring-soon' ? true : undefined,
        priorityOnly: activeTab === 'priority-top-sellers' ? true : undefined,
        unstockedOnly: activeTab === 'unstocked' ? true : undefined,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to load inventory aggregation metrics');
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, search, activeStoreId, isAllStores]);

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
      <PageHeader
        title="Inventory & Exception Hub"
        description="FEFO-compliant inventory monitoring, stock alerts, and procurement management"
        icon={Boxes}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              asChild
              size="sm"
              className="h-9 px-3 gap-1.5 font-semibold text-xs shadow-xs"
            >
              <Link href="/inventory/receive">
                <Boxes className="size-4 shrink-0" />
                <span>Receive Stock</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/5"
            >
              <Link href="/inventory/new">
                <Plus className="size-4 shrink-0" />
                <span>Add Product</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="h-9 px-3 gap-1.5 font-semibold text-xs border-success/40 text-success hover:bg-success/10"
            >
              <FileSpreadsheet className="size-4 shrink-0" />
              <span>Import CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAggregation()}
              disabled={isLoading}
              className="h-9 px-3 gap-1.5 text-xs font-semibold"
              title="Refresh inventory data"
            >
              <RefreshCw className={`size-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div onClick={() => setActiveTab(!isAllStores ? 'in-stock' : 'full-catalog')} className="cursor-pointer">
          <StatCard
            label={!isAllStores ? 'Branch In-Stock' : 'Total Catalog'}
            value={!isAllStores ? (data.summary.stockedCount ?? 0) : data.summary.totalCatalogItems}
            caption={!isAllStores ? `of ${data.summary.totalCatalogItems} catalog items` : 'medicines'}
            icon={Boxes}
            className={(activeTab === 'in-stock' || (isAllStores && activeTab === 'full-catalog')) ? 'ring-2 ring-primary/40 border-primary/50 bg-primary/5' : undefined}
          />
        </div>

        <div onClick={() => setActiveTab('priority-top-sellers')} className="cursor-pointer">
          <StatCard
            label="Top Sellers"
            value={data.summary.priorityCount}
            caption={data.summary.priorityCount === 1 ? 'product' : 'products'}
            icon={Star}
            variant="warning"
            className={activeTab === 'priority-top-sellers' ? 'ring-2 ring-warning/40 border-warning/50 bg-warning/5' : undefined}
          />
        </div>

        <div onClick={() => setActiveTab('expiring-soon')} className="cursor-pointer">
          <StatCard
            label="Expiring (180 Days)"
            value={data.summary.expiringSoonCount}
            caption="batches"
            icon={Clock}
            variant="destructive"
            className={activeTab === 'expiring-soon' ? 'ring-2 ring-destructive/40 border-destructive/50 bg-destructive/5' : undefined}
          />
        </div>

        <div onClick={() => setActiveTab('low-stock')} className="cursor-pointer">
          <StatCard
            label="Low Stock Alerts"
            value={data.summary.lowStockCount}
            caption="items"
            icon={AlertTriangle}
            variant="warning"
            className={activeTab === 'low-stock' ? 'ring-2 ring-warning/40 border-warning/50 bg-warning/5' : undefined}
          />
        </div>
      </div>

      {/* Dashboard Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as InventoryTab)}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 h-auto border border-border/40 scrollbar-none snap-x">
            <TabsTrigger value="in-stock" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <Boxes className="size-3.5 text-success shrink-0" />
              <span>In-Stock ({data.summary.stockedCount ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="full-catalog" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <Package className="size-3.5 text-primary shrink-0" />
              <span>Master Catalog ({data.summary.totalCatalogItems})</span>
            </TabsTrigger>
            <TabsTrigger value="priority-top-sellers" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <Star className="size-3.5 text-warning fill-warning shrink-0" />
              <span>Top Sellers ({data.summary.priorityCount})</span>
            </TabsTrigger>
            <TabsTrigger value="unstocked" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <TrendingDown className="size-3.5 text-warning shrink-0" />
              <span>Unstocked ({data.summary.unstockedCount ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="expiring-soon" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <Clock className="size-3.5 text-destructive shrink-0" />
              <span>Expiring ({data.summary.expiringSoonCount})</span>
            </TabsTrigger>
            <TabsTrigger value="expiry-risk" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 text-primary data-[state=active]:bg-primary/10 shrink-0 whitespace-nowrap snap-start">
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <span>Risk Forecast</span>
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 shrink-0 whitespace-nowrap snap-start">
              <AlertTriangle className="size-3.5 text-warning shrink-0" />
              <span>Low Stock ({data.summary.lowStockCount})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'full-catalog' && activeTab !== 'expiry-risk' && (
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
                            In Stock ({product.totalStock} {product.unit}s)
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
                              In Stock ({product.totalStock} {product.unit}s)
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
                          <span>Threshold: <strong className="text-foreground">{product.lowStockThreshold} {product.unit}s</strong></span>
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
