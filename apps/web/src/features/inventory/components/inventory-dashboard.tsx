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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { productsApi } from '../services/products-api';
import { ProductList, formatCategory, formatUnitPlural } from './product-list';
import { ProductBatchesModal } from './product-batches-modal';
import { getProductSeoUrl } from '../utils/seo-utils';

export function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'expiring-soon' | 'full-catalog'>('low-stock');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{
    totalProducts: number;
    summary: {
      totalCatalogItems: number;
      outOfStockCount: number;
      lowStockCount: number;
      expiringSoonCount: number;
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
    }>;
  }>({
    totalProducts: 0,
    summary: {
      totalCatalogItems: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
    },
    products: [],
  });

  // Batch inspect modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<{ id: string; name: string } | null>(null);

  const fetchAggregation = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productsApi.getInventoryAggregation({
        lowStockOnly: activeTab === 'low-stock' ? true : undefined,
        expiringSoonOnly: activeTab === 'expiring-soon' ? true : undefined,
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
    if (activeTab !== 'full-catalog') {
      fetchAggregation();
    }
  }, [fetchAggregation, activeTab]);

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
            <Boxes className="size-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Inventory & Exception Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            FEFO-compliant inventory monitoring, stock alerts, and procurement management
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button asChild size="sm" className="gap-2 font-semibold shadow-xs">
            <Link href="/inventory/receive">
              <Boxes className="size-4" />
              <span>Receive Stock Batch</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2 font-semibold">
            <Link href="/products/create">
              <Plus className="size-4" />
              <span>Add New Product</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Low Stock Exceptions */}
        <Card
          onClick={() => setActiveTab('low-stock')}
          className={`cursor-pointer transition-all hover:border-amber-500/50 ${activeTab === 'low-stock' ? 'ring-2 ring-amber-500/40 border-amber-500/50 bg-amber-500/5' : 'bg-card'
            }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Low Stock Alerts
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-amber-600">
                  {data.summary.lowStockCount}
                </span>
                <span className="text-xs text-muted-foreground">items</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Expiring Soon */}
        <Card
          onClick={() => setActiveTab('expiring-soon')}
          className={`cursor-pointer transition-all hover:border-rose-500/50 ${activeTab === 'expiring-soon' ? 'ring-2 ring-rose-500/40 border-rose-500/50 bg-rose-500/5' : 'bg-card'
            }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expiring (90 Days)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-rose-600">
                  {data.summary.expiringSoonCount}
                </span>
                <span className="text-xs text-muted-foreground">batches</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Out of Stock */}
        <Card className="bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Out of Stock
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-destructive">
                  {data.summary.outOfStockCount}
                </span>
                <span className="text-xs text-muted-foreground">items</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <TrendingDown className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Full Catalog */}
        <Card
          onClick={() => setActiveTab('full-catalog')}
          className={`cursor-pointer transition-all hover:border-primary/50 ${activeTab === 'full-catalog' ? 'ring-2 ring-primary/40 border-primary/50 bg-primary/5' : 'bg-card'
            }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Catalog
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">
                  {data.summary.totalCatalogItems}
                </span>
                <span className="text-xs text-muted-foreground">medicines</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Package className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'low-stock' | 'expiring-soon' | 'full-catalog')}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="low-stock" className="gap-2 font-medium text-xs sm:text-sm">
              <AlertTriangle className="size-3.5 text-amber-500" />
              <span>Low Stock ({data.summary.lowStockCount})</span>
            </TabsTrigger>
            <TabsTrigger value="expiring-soon" className="gap-2 font-medium text-xs sm:text-sm">
              <Clock className="size-3.5 text-rose-500" />
              <span>Expiring Soon ({data.summary.expiringSoonCount})</span>
            </TabsTrigger>
            <TabsTrigger value="full-catalog" className="gap-2 font-medium text-xs sm:text-sm">
              <Package className="size-3.5 text-primary" />
              <span>Full Catalog ({data.summary.totalCatalogItems})</span>
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
          <ProductList />
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
    </div>
  );
}
