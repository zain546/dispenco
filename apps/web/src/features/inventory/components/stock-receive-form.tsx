'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Boxes,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Search,
  Sparkles,
  Calendar,
  DollarSign,
  Truck,
  FileText,
  Pill,
  TrendingUp,
  MapPin,
  Building2,
  Hash,
  Layers,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScannerInput } from '@/components/ui/scanner-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  productsApi,
  type ProductData,
  type ReceiveStockPayload,
} from '../services/products-api';
import { formatCategory, getMedicineIconConfig, formatUnitPlural } from './product-list';

export function StockReceiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get('productId');

  // Search & Product Selection State
  const [productSearch, setProductSearch] = useState('');
  const [matchingProducts, setMatchingProducts] = useState<ProductData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  // Form Field State
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [expiryDate, setExpiryDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [vendorName, setVendorName] = useState('');
  const [rackNumber, setRackNumber] = useState('');
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load preselected product if query parameter exists
  useEffect(() => {
    if (preselectedProductId) {
      productsApi
        .getProductById(preselectedProductId)
        .then((res: any) => {
          const product = res?.data || res;
          if (product && (product.id || product.name)) {
            setSelectedProduct(product);
            if (product.latestCostPrice) setCostPrice(product.latestCostPrice);
            if (product.latestSellPrice) setSellPrice(product.latestSellPrice);
            const attrs = (product.attributes as Record<string, string>) || {};
            if (attrs.rackNumber) setRackNumber(attrs.rackNumber);
            if (attrs.vendorName) setVendorName(attrs.vendorName);
          }
        })
        .catch(() => {
          toast.error('Failed to load preselected medicine product');
        });
    }
  }, [preselectedProductId]);

  // Search products when input changes
  useEffect(() => {
    if (!productSearch.trim()) {
      setMatchingProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await productsApi.getProducts({
          search: productSearch.trim(),
          limit: 6,
        });
        setMatchingProducts(res.data || []);
      } catch {
        // Ignore search errors
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleSelectProduct = (product: ProductData) => {
    setSelectedProduct(product);
    setProductSearch('');
    setMatchingProducts([]);

    if (product.latestCostPrice) setCostPrice(product.latestCostPrice);
    if (product.latestSellPrice) setSellPrice(product.latestSellPrice);

    const attrs = (product.attributes as Record<string, string>) || {};
    if (attrs.rackNumber) setRackNumber(attrs.rackNumber);
    if (attrs.vendorName) setVendorName(attrs.vendorName);
  };

  const handleGenerateBatchNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 90 + 10);
    const generated = `BN-${timestamp}-${random}`;
    setBatchNumber(generated);
    toast.info(`Generated batch number: ${generated}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('Please select a medicine product first');
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      toast.error('Please enter a valid stock quantity (at least 1)');
      return;
    }

    if (!expiryDate) {
      toast.error('Please select an expiry date for this stock batch');
      return;
    }

    if (costPrice === '' || Number(costPrice) < 0) {
      toast.error('Please enter a valid purchase cost price');
      return;
    }

    if (sellPrice === '' || Number(sellPrice) < 0) {
      toast.error('Please enter a valid retail selling price (MRP)');
      return;
    }

    const payload: ReceiveStockPayload = {
      productId: selectedProduct.id,
      quantity: Number(quantity),
      expiryDate,
      costPrice: Number(costPrice),
      sellPrice: Number(sellPrice),
      batchNumber: batchNumber.trim() || undefined,
      vendorName: vendorName.trim() || undefined,
      rackNumber: rackNumber.trim() || undefined,
      mfgDate: mfgDate.trim() || undefined,
      purchaseInvoiceNumber: purchaseInvoiceNumber.trim() || undefined,
      purchaseInvoiceDate: purchaseInvoiceDate.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await productsApi.receiveStock(payload);
      toast.success(res.message || 'Stock batch received successfully!');
      router.push('/inventory');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to receive stock batch';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const preventNegativeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  // Calculate gross margin preview
  const numCost = Math.max(0, Number(costPrice) || 0);
  const numSell = Math.max(0, Number(sellPrice) || 0);
  const marginPkr = numSell - numCost;
  const marginPercent = numCost > 0 ? ((marginPkr / numCost) * 100).toFixed(1) : '0.0';

  const iconConfig = selectedProduct
    ? getMedicineIconConfig(selectedProduct.category, selectedProduct.name, selectedProduct.unit)
    : null;
  const CategoryIcon = iconConfig?.Icon || Pill;

  const formattedUnitLabel = selectedProduct?.unit
    ? selectedProduct.unit.endsWith('s')
      ? selectedProduct.unit
      : `${selectedProduct.unit}s`
    : 'Units';

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-12 px-1 sm:px-0">
      {/* Top Header */}
      <div className="flex items-start gap-3 pb-2 border-b border-border/80">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted mt-0.5"
        >
          <Link href="/inventory" title="Back to Inventory Catalog">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h1 className="text-base sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="size-4 sm:size-6 text-primary shrink-0" />
            <span>Receive Stock Batch</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
            Log incoming supplier shipment batches, update stock quantities, and record FEFO expiry dates.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Medicine Selection */}
        <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Package className="size-4 text-primary shrink-0" />
              <span>1. Select Medicine / Product</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Search your pharmacy catalog to receive a new shipment batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
            {selectedProduct ? (
              /* Selected Product Summary Card */
              <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-muted/60 text-muted-foreground/80 flex items-center justify-center shrink-0 border border-border/50 mt-0.5">
                    <CategoryIcon className="size-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground leading-snug break-words">
                        {selectedProduct.name}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                        {formatCategory(selectedProduct.category)}
                      </Badge>
                      {selectedProduct.isControlledSubstance && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-semibold shrink-0"
                        >
                          Rx Schedule
                        </Badge>
                      )}
                    </div>
                    {selectedProduct.genericName && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {selectedProduct.genericName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Current Active Stock:{' '}
                      <strong className="text-foreground font-semibold">
                        {formatUnitPlural(selectedProduct.unit, selectedProduct.totalStock ?? 0)}
                      </strong>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                  className="shrink-0 text-xs h-8 border-border hover:bg-muted self-start sm:self-center"
                >
                  Change Medicine
                </Button>
              </div>
            ) : (
              /* Medicine Live Search Input */
              <div className="space-y-3">
                <div className="relative">
                  <ScannerInput
                    placeholder="Search by medicine name, generic formula, or scan barcode..."
                    value={productSearch}
                    onChange={(val) => setProductSearch(val)}
                    onScan={async (scannedBarcode) => {
                      setProductSearch(scannedBarcode);
                      try {
                        const res = await productsApi.lookupByBarcode(scannedBarcode);
                        if (res?.product) {
                          setSelectedProduct(res.product);
                          if (res.product.latestCostPrice) setCostPrice(res.product.latestCostPrice);
                          if (res.product.latestSellPrice) setSellPrice(res.product.latestSellPrice);
                          toast.success(`Selected medicine: ${res.product.name}`);
                        }
                      } catch {
                        // Fallback to standard search if lookup fails
                      }
                    }}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin pointer-events-none" />
                  )}
                </div>

                {matchingProducts.length > 0 && (
                  <div className="border border-border rounded-lg bg-card shadow-md divide-y divide-border overflow-hidden">
                    {matchingProducts.map((prod) => {
                      const itemConfig = getMedicineIconConfig(prod.category, prod.name, prod.unit);
                      const ItemIcon = itemConfig.Icon;

                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-3 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`size-7 rounded-md flex items-center justify-center shrink-0 ${itemConfig.bgClass}`}
                            >
                              <ItemIcon className="size-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{prod.name}</p>
                              {prod.genericName && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {prod.genericName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className="text-[10px]">
                              Stock: {formatUnitPlural(prod.unit, prod.totalStock ?? 0)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Batch & Quantity Details */}
        <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Hash className="size-4 text-primary shrink-0" />
              <span>2. Shipment Batch & Quantities</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter batch numbers, quantities received, and FEFO expiry dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batchNumber" className="text-xs font-semibold">
                  Batch Number / Lot ID
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateBatchNumber}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="size-3" />
                  <span>Auto Generate</span>
                </button>
              </div>
              <Input
                id="batchNumber"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BN-2026-X801"
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            {/* Quantity Received */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs font-semibold">
                Quantity Received ({formattedUnitLabel}) *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                onKeyDown={preventNegativeKeyDown}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                placeholder="e.g. 50"
                className="h-9 text-xs sm:text-sm font-bold text-foreground"
                required
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="size-3.5 text-primary" />
                <span>Expiry Date (FEFO) *</span>
              </Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 text-xs sm:text-sm font-semibold"
                required
              />
            </div>

            {/* Manufacturing Date */}
            <div className="space-y-1.5">
              <Label htmlFor="mfgDate" className="text-xs font-semibold">
                Manufacturing Date (Optional)
              </Label>
              <Input
                id="mfgDate"
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="h-9 text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Pricing & Gross Margin */}
        <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <DollarSign className="size-4 text-primary shrink-0" />
              <span>3. Purchase Cost & Retail MRP Pricing</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Record distributor purchase costs and customer selling prices for margin auditing.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cost Price */}
              <div className="space-y-1.5">
                <Label htmlFor="costPrice" className="text-xs font-semibold">
                  Purchase Cost Price (PKR) *
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  onKeyDown={preventNegativeKeyDown}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 150.00"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>

              {/* Retail MRP */}
              <div className="space-y-1.5">
                <Label htmlFor="sellPrice" className="text-xs font-semibold">
                  Retail MRP / Selling Price (PKR) *
                </Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  onKeyDown={preventNegativeKeyDown}
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. 180.00"
                  className="h-9 text-xs sm:text-sm font-semibold text-primary"
                  required
                />
              </div>
            </div>

            {/* Estimated Margin & Loose Sub-unit Conversion Breakdown Preview */}
            {numCost > 0 && numSell > 0 && (
              <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent p-3.5 sm:p-4 space-y-3 shadow-2xs">
                {/* Top Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Layers className="size-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight truncate">
                      <span className="hidden sm:inline">Stock Receiving Profit & POS Sub-unit Breakdown</span>
                      <span className="sm:hidden font-bold">Receiving & POS Breakdown</span>
                    </span>
                  </div>
                  {(() => {
                    const rawPackSize = selectedProduct?.attributes ? (selectedProduct.attributes as Record<string, any>).packSize : null;
                    const packSizeValNum = Number(rawPackSize) || 1;
                    if (packSizeValNum <= 1) return null;
                    return (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[10px] font-bold px-2 py-0.5 shrink-0 whitespace-nowrap">
                        {packSizeValNum} Units / {selectedProduct?.unit || 'Box'}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Metrics Ribbon */}
                {(() => {
                  const rawPackSize = selectedProduct?.attributes ? (selectedProduct.attributes as Record<string, any>).packSize : null;
                  const packSizeValNum = Number(rawPackSize) || 1;
                  const recvQty = Number(quantity) || 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x divide-emerald-500/15 pt-0.5">
                      <div className="sm:px-3 first:pl-0 space-y-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Cost / {packSizeValNum > 1 ? 'Tablet' : selectedProduct?.unit || 'Unit'}</span>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          PKR {(numCost / packSizeValNum).toFixed(2)}
                        </p>
                      </div>

                      <div className="sm:px-3 space-y-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Retail / {packSizeValNum > 1 ? 'Tablet' : selectedProduct?.unit || 'Unit'}</span>
                        <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          PKR {(numSell / packSizeValNum).toFixed(2)}
                        </p>
                      </div>

                      <div className="sm:px-3 space-y-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">New Stock Total</span>
                        <p className="text-xs sm:text-sm font-bold text-foreground">
                          {(recvQty * packSizeValNum).toLocaleString()} <span className="text-[11px] font-normal text-muted-foreground">{packSizeValNum > 1 ? 'Units' : selectedProduct?.unit || 'Boxes'}</span>
                        </p>
                      </div>

                      <div className="sm:px-3 last:pr-0 space-y-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Est. Gross Margin</span>
                        <p className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400">
                          {marginPercent}% (+PKR {marginPkr.toFixed(2)})
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Micro-copy Note */}
                <div className="pt-2 border-t border-emerald-500/15 flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight">
                  <Info className="size-3.5 text-emerald-500 shrink-0" />
                  <span>
                    <span className="hidden sm:inline">Batch will be instantly registered under FEFO stock tracking for POS loose sales.</span>
                    <span className="sm:hidden">Registered under FEFO tracking for POS sales.</span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Supplier & Location Details */}
        <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Truck className="size-4 text-primary shrink-0" />
              <span>4. Supplier Invoice & Rack Location (Optional)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Track vendor distributors and storage shelf rack placement.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vendor / Distributor Name */}
            <div className="space-y-1.5">
              <Label htmlFor="vendorName" className="text-xs font-semibold flex items-center gap-1">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span>Supplier / Distributor Name</span>
              </Label>
              <Input
                id="vendorName"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. GSK Distributor Ltd."
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Rack Location */}
            <div className="space-y-1.5">
              <Label htmlFor="rackNumber" className="text-xs font-semibold flex items-center gap-1">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span>Rack / Storage Shelf Location</span>
              </Label>
              <Input
                id="rackNumber"
                value={rackNumber}
                onChange={(e) => setRackNumber(e.target.value)}
                placeholder="e.g. Shelf B-4"
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Purchase Invoice Number */}
            <div className="space-y-1.5">
              <Label htmlFor="purchaseInvoiceNumber" className="text-xs font-semibold flex items-center gap-1">
                <FileText className="size-3.5 text-muted-foreground" />
                <span>Purchase Invoice #</span>
              </Label>
              <Input
                id="purchaseInvoiceNumber"
                value={purchaseInvoiceNumber}
                onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-90412"
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            {/* Purchase Invoice Date */}
            <div className="space-y-1.5">
              <Label htmlFor="purchaseInvoiceDate" className="text-xs font-semibold">
                Invoice Date
              </Label>
              <Input
                id="purchaseInvoiceDate"
                type="date"
                value={purchaseInvoiceDate}
                onChange={(e) => setPurchaseInvoiceDate(e.target.value)}
                className="h-9 text-xs sm:text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          <Button asChild variant="outline" size="sm" className="h-10 px-5 text-xs sm:text-sm w-full sm:w-auto">
            <Link href="/inventory">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !selectedProduct}
            className="h-10 px-6 text-xs sm:text-sm gap-2 font-semibold shadow-xs w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Receiving Batch...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Confirm Stock Receive</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
