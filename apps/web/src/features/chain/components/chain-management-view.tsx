'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Store,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  RefreshCw,
  Layers,
  CheckCircle2,
  Tag,
  Sliders,
  PlusCircle,
  ArrowUpRight,
  BarChart3,
  Search,
  Check,
  Percent,
  Sparkles,
  ShieldCheck,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storesApi, ChainOverviewData, ChainStoreSummary } from '@/lib/stores-api';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { CreateStoreModal } from '@/components/create-store-modal';
import { useStore } from '@/context/store-context';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export function ChainManagementView() {
  const { stores, isMultiStore, setActiveStoreId, refreshStores } = useStore();
  const [data, setData] = useState<ChainOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Bulk Price Push State
  const [pricePushMode, setPricePushMode] = useState<'SINGLE' | 'CATEGORY'>('SINGLE');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<ProductData[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [percentAdjustmentInput, setPercentAdjustmentInput] = useState<string>('');
  const [selectedTargetStores, setSelectedTargetStores] = useState<string[]>([]);
  const [pricePushReason, setPricePushReason] = useState<string>('');
  const [isSubmittingPricePush, setIsSubmittingPricePush] = useState(false);

  // Broadcast Settings State
  const [broadcastTargetStores, setBroadcastTargetStores] = useState<string[]>([]);
  const [broadcastTaxRate, setBroadcastTaxRate] = useState<string>('');
  const [broadcastReceiptFooter, setBroadcastReceiptFooter] = useState<string>('');
  const [broadcastExpiryDays, setBroadcastExpiryDays] = useState<string>('');
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await storesApi.getChainOverview();
      if (res?.data) {
        setData(res.data);
        // Default target all stores
        const allIds = res.data.stores.map((s) => s.id);
        setSelectedTargetStores(allIds);
        setBroadcastTargetStores(allIds);
      }
    } catch (err) {
      console.error('Failed to load chain overview:', err);
      toast.error('Failed to load multi-store chain metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Search product for single-product price push
  useEffect(() => {
    if (!productSearchQuery.trim() || productSearchQuery.length < 2) {
      setProductSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      try {
        const res = await productsApi.getProducts({ search: productSearchQuery.trim(), limit: 8 });
        setProductSearchResults(res?.data || []);
      } catch (err) {
        console.error('Product search error:', err);
      } finally {
        setIsSearchingProduct(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOverview(), refreshStores()]);
    toast.success('Multi-store data refreshed');
  };

  const handleToggleStoreSelection = (storeId: string) => {
    setSelectedTargetStores((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSelectAllStores = () => {
    if (data?.stores) {
      if (selectedTargetStores.length === data.stores.length) {
        setSelectedTargetStores([]);
      } else {
        setSelectedTargetStores(data.stores.map((s) => s.id));
      }
    }
  };

  const handleExecutePricePush = async () => {
    if (selectedTargetStores.length === 0) {
      toast.error('Please select at least one branch store to push prices to.');
      return;
    }

    if (pricePushMode === 'SINGLE' && !selectedProduct) {
      toast.error('Please search and select a medicine to adjust.');
      return;
    }

    if (pricePushMode === 'CATEGORY' && !selectedCategory.trim()) {
      toast.error('Please enter or select a medicine category.');
      return;
    }

    if (adjustmentType === 'FIXED') {
      const p = Number(newPriceInput);
      if (isNaN(p) || p <= 0) {
        toast.error('Please provide a valid fixed price greater than 0.');
        return;
      }
    } else {
      const pct = Number(percentAdjustmentInput);
      if (isNaN(pct) || pct === 0) {
        toast.error('Please provide a valid non-zero percentage adjustment (e.g. +5 or -10).');
        return;
      }
    }

    setIsSubmittingPricePush(true);
    try {
      const payload = {
        productId: pricePushMode === 'SINGLE' ? selectedProduct?.id : undefined,
        category: pricePushMode === 'CATEGORY' ? selectedCategory.trim() : undefined,
        newSellPrice: adjustmentType === 'FIXED' ? Number(newPriceInput) : undefined,
        percentageAdjustment: adjustmentType === 'PERCENT' ? Number(percentAdjustmentInput) : undefined,
        targetStoreIds: selectedTargetStores,
        reason: pricePushReason.trim() || undefined,
      };

      const res = await storesApi.bulkPricePush(payload);
      toast.success(res.message || 'Pushed prices across branch stores successfully!');
      setNewPriceInput('');
      setPercentAdjustmentInput('');
      setSelectedProduct(null);
      setProductSearchQuery('');
      setPricePushReason('');
      await fetchOverview();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to push price update';
      toast.error(msg);
    } finally {
      setIsSubmittingPricePush(false);
    }
  };

  const handleExecuteBroadcastSettings = async () => {
    if (broadcastTargetStores.length === 0) {
      toast.error('Please select at least one branch to receive settings.');
      return;
    }

    const payload: {
      targetStoreIds: string[];
      taxRate?: number;
      receiptFooter?: string;
      expiryAlertDays?: number;
    } = {
      targetStoreIds: broadcastTargetStores,
    };

    if (broadcastTaxRate !== '') {
      payload.taxRate = Number(broadcastTaxRate);
    }
    if (broadcastReceiptFooter.trim() !== '') {
      payload.receiptFooter = broadcastReceiptFooter.trim();
    }
    if (broadcastExpiryDays !== '') {
      payload.expiryAlertDays = Number(broadcastExpiryDays);
    }

    if (Object.keys(payload).length === 1) {
      toast.error('Please fill at least one setting to broadcast (Tax Rate, Footer, or Expiry Threshold).');
      return;
    }

    setIsSubmittingBroadcast(true);
    try {
      const res = await storesApi.broadcastSetting(payload);
      toast.success(res.message || 'Settings broadcasted across branches successfully!');
      setBroadcastTaxRate('');
      setBroadcastReceiptFooter('');
      setBroadcastExpiryDays('');
      await fetchOverview();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to broadcast settings';
      toast.error(msg);
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  // If user operates a single store, show a lean, welcoming state without clutter
  if (!isMultiStore && stores.length <= 1) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="p-8 sm:p-12 text-center rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="size-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Single-Store Pharmacy Setup
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are currently operating <strong>{stores[0]?.name || 'a single pharmacy branch'}</strong>.
              All daily sales, stock management, and reports are streamlined directly for your counter.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 font-semibold shadow-xs"
            >
              <PlusCircle className="size-4" />
              <span>Register 2nd Branch to Unlock Chain Operations</span>
            </Button>
          </div>
        </div>

        <CreateStoreModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={() => {
            refreshStores();
            fetchOverview();
          }}
        />
      </div>
    );
  }

  const consolidated = data?.consolidated;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Chain Operations & Multi-Store Command
              </h1>
              <p className="text-xs text-muted-foreground">
                Consolidated multi-branch performance analytics, central price pushes, and store controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8.5 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <PlusCircle className="size-3.5" />
            <span>Add Branch Store</span>
          </Button>
        </div>
      </div>

      {/* Multi-Store Consolidated KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Chain Sales Today</span>
              <div className="size-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <DollarSign className="size-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
              {formatCurrency(consolidated?.totalSalesToday ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across {data?.totalStoresCount ?? stores.length} active branches
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Chain Sales (Month)</span>
              <div className="size-8 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
              {formatCurrency(consolidated?.totalSalesMonth ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">MTD consolidated revenue</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Chain Inventory Valuation</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Package className="size-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
              {formatCurrency(consolidated?.totalInventoryCostValue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Retail: {formatCurrency(consolidated?.totalRetailValue ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Cross-Store Alerts</span>
              <div className="size-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <AlertTriangle className="size-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2">
              {consolidated?.totalLowStockCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {consolidated?.totalPendingTransfers ?? 0} stock transfer(s) in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance Comparison */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <span>Branch Outlets Performance</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time stock valuation and revenue breakdown across all retail outlets
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {data?.stores.length || stores.length} Branches
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground bg-muted/30">
                  <th className="py-2.5 px-3 font-semibold">Branch Name</th>
                  <th className="py-2.5 px-3 font-semibold">Today&apos;s Sales</th>
                  <th className="py-2.5 px-3 font-semibold">Month&apos;s Sales</th>
                  <th className="py-2.5 px-3 font-semibold">Stock Valuation</th>
                  <th className="py-2.5 px-3 font-semibold">Low Stock</th>
                  <th className="py-2.5 px-3 font-semibold">Transfers</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading multi-store branches...
                    </td>
                  </tr>
                ) : data?.stores.map((branch) => (
                  <tr key={branch.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground">{branch.name}</div>
                      {branch.address ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{branch.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{branch.currency} branch</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <div className="text-foreground font-semibold">{formatCurrency(branch.salesToday)}</div>
                      <div className="text-micro text-muted-foreground">{branch.salesCountToday} orders</div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <div className="text-foreground font-semibold">{formatCurrency(branch.salesMonth)}</div>
                      <div className="text-micro text-muted-foreground">{branch.salesCountMonth} orders</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground">{formatCurrency(branch.inventoryCostValue)}</div>
                      <div className="text-micro text-muted-foreground">
                        {branch.totalUnitsInStock} units ({branch.activeBatchesCount} batches)
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {branch.lowStockCount > 0 ? (
                        <StatusBadge variant="warning" size="sm" dot>
                          {branch.lowStockCount} items
                        </StatusBadge>
                      ) : (
                        <StatusBadge variant="success" size="sm" dot>
                          Optimal
                        </StatusBadge>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {branch.pendingTransfers > 0 ? (
                        <StatusBadge variant="info" size="sm">
                          {branch.pendingTransfers} pending
                        </StatusBadge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveStoreId(branch.id);
                          toast.success(`Active branch switched to "${branch.name}"`);
                        }}
                        className="h-7 text-xs font-medium gap-1 cursor-pointer"
                        aria-label={`Switch active branch to ${branch.name}`}
                      >
                        <span>Switch</span>
                        <ArrowUpRight className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Central Controls */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>Enterprise Central Control Center</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Apply master pricing updates and operational settings across multiple stores in a single operation
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="price-push" className="space-y-4">
            <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
              <TabsTrigger value="price-push" className="text-xs gap-1.5 font-semibold">
                <Tag className="size-3.5" />
                <span>Bulk Price Push</span>
              </TabsTrigger>
              <TabsTrigger value="broadcast-settings" className="text-xs gap-1.5 font-semibold">
                <ShieldCheck className="size-3.5" />
                <span>Broadcast Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: BULK PRICE PUSH */}
            <TabsContent value="price-push" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Scope */}
                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/70">
                  <Label className="text-xs font-semibold">1. Select Target Medicine / Category</Label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="pricePushMode"
                        checked={pricePushMode === 'SINGLE'}
                        onChange={() => setPricePushMode('SINGLE')}
                        className="accent-primary"
                      />
                      <span>Specific Medicine</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="pricePushMode"
                        checked={pricePushMode === 'CATEGORY'}
                        onChange={() => setPricePushMode('CATEGORY')}
                        className="accent-primary"
                      />
                      <span>Medicine Category</span>
                    </label>
                  </div>

                  {pricePushMode === 'SINGLE' ? (
                    <div className="space-y-2 relative">
                      <div className="relative">
                        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search medicine by name or formula..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="h-8.5 pl-8 text-xs"
                        />
                      </div>

                      {selectedProduct && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                          <span className="font-semibold text-primary">{selectedProduct.name}</span>
                          <span className="text-muted-foreground text-micro">
                            Current: {selectedProduct.latestSellPrice?.toFixed(2) ?? 'N/A'} PKR
                          </span>
                        </div>
                      )}

                      {productSearchResults.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-border/60">
                          {productSearchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductSearchQuery('');
                                setProductSearchResults([]);
                              }}
                              className="w-full text-left p-2 hover:bg-accent text-xs flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-medium text-foreground">{p.name}</span>
                              <span className="text-micro text-muted-foreground">
                                {p.latestSellPrice ? `${p.latestSellPrice.toFixed(2)} PKR` : 'No price'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        placeholder="Category name (e.g., Antibiotics, Analgesics, Cardiac)..."
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-8.5 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Adjustment Mode */}
                <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/70">
                  <Label className="text-xs font-semibold">2. Pricing Adjustment Mode</Label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={adjustmentType === 'FIXED'}
                        onChange={() => setAdjustmentType('FIXED')}
                        className="accent-primary"
                      />
                      <span>Fixed Sell Price (PKR)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="adjustmentType"
                        checked={adjustmentType === 'PERCENT'}
                        onChange={() => setAdjustmentType('PERCENT')}
                        className="accent-primary"
                      />
                      <span>Percentage Adjustment (% )</span>
                    </label>
                  </div>

                  {adjustmentType === 'FIXED' ? (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        placeholder="e.g. 150.00 PKR"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="h-8.5 text-xs font-mono"
                      />
                      <p className="text-micro text-muted-foreground">
                        Sets the exact retail selling price across all active batches in target stores.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        type="number"
                        placeholder="e.g. +5 for 5% increase or -10 for discount"
                        value={percentAdjustmentInput}
                        onChange={(e) => setPercentAdjustmentInput(e.target.value)}
                        className="h-8.5 text-xs font-mono"
                      />
                      <p className="text-micro text-muted-foreground">
                        Adjusts each batch selling price upward or downward by the specified percentage.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Stores Checkboxes */}
              <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/70">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">3. Target Store Branches</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllStores}
                    className="h-6 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    {selectedTargetStores.length === (data?.stores.length || 0)
                      ? 'Deselect All'
                      : 'Select All Branches'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                  {data?.stores.map((s) => {
                    const isChecked = selectedTargetStores.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        onClick={() => handleToggleStoreSelection(s.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-primary/10 border-primary/40 text-foreground font-semibold'
                            : 'bg-card border-border/80 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-primary size-3.5"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Audit Reason & Execute */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Input
                  placeholder="Audit reason (e.g., Annual manufacturer price revision, VAT rate change)..."
                  value={pricePushReason}
                  onChange={(e) => setPricePushReason(e.target.value)}
                  className="h-8.5 text-xs flex-1"
                />

                <Button
                  onClick={handleExecutePricePush}
                  disabled={isSubmittingPricePush}
                  className="h-8.5 text-xs font-semibold gap-1.5 shadow-xs w-full sm:w-auto shrink-0 cursor-pointer"
                >
                  <Tag className="size-3.5" />
                  <span>{isSubmittingPricePush ? 'Pushing Prices...' : 'Push Price to Selected Branches'}</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: BROADCAST SETTINGS */}
            <TabsContent value="broadcast-settings" className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 0 or 5 or 18"
                    value={broadcastTaxRate}
                    onChange={(e) => setBroadcastTaxRate(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                  />
                  <p className="text-micro text-muted-foreground">Standard branch sales tax rate</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Receipt Footer Message</Label>
                  <Input
                    placeholder="e.g. Thank you for shopping with us!"
                    value={broadcastReceiptFooter}
                    onChange={(e) => setBroadcastReceiptFooter(e.target.value)}
                    className="h-8.5 text-xs"
                  />
                  <p className="text-micro text-muted-foreground">Printed at bottom of POS receipts</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expiry Alert Threshold (Days)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 60 or 90 days"
                    value={broadcastExpiryDays}
                    onChange={(e) => setBroadcastExpiryDays(e.target.value)}
                    className="h-8.5 text-xs font-mono"
                  />
                  <p className="text-micro text-muted-foreground">Days before expiry to trigger alert</p>
                </div>
              </div>

              {/* Target Stores Checkboxes */}
              <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/70">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Target Store Branches</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (broadcastTargetStores.length === (data?.stores.length || 0)) {
                        setBroadcastTargetStores([]);
                      } else {
                        setBroadcastTargetStores(data?.stores.map((s) => s.id) || []);
                      }
                    }}
                    className="h-6 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    {broadcastTargetStores.length === (data?.stores.length || 0)
                      ? 'Deselect All'
                      : 'Select All Branches'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                  {data?.stores.map((s) => {
                    const isChecked = broadcastTargetStores.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        onClick={() =>
                          setBroadcastTargetStores((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-primary/10 border-primary/40 text-foreground font-semibold'
                            : 'bg-card border-border/80 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-primary size-3.5"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleExecuteBroadcastSettings}
                  disabled={isSubmittingBroadcast}
                  className="h-8.5 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>{isSubmittingBroadcast ? 'Broadcasting...' : 'Broadcast Settings to Selected Branches'}</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal for creating a new branch */}
      <CreateStoreModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          refreshStores();
          fetchOverview();
        }}
      />
    </div>
  );
}
