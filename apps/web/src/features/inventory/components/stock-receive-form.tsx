'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  Pill,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  productsApi,
  type ProductData,
  type ReceiveStockPayload,
} from '../services/products-api';
import { formatCategory, getMedicineIconConfig } from './product-list';

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
        .then((res) => {
          if (res.data) {
            setSelectedProduct(res.data);
            if (res.data.latestCostPrice) setCostPrice(res.data.latestCostPrice);
            if (res.data.latestSellPrice) setSellPrice(res.data.latestSellPrice);
            const attrs = (res.data.attributes as Record<string, string>) || {};
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

  // Calculate gross margin preview
  const numCost = Number(costPrice) || 0;
  const numSell = Number(sellPrice) || 0;
  const marginPkr = numSell - numCost;
  const marginPercent = numCost > 0 ? ((marginPkr / numCost) * 100).toFixed(1) : '0.0';

  const iconConfig = selectedProduct
    ? getMedicineIconConfig(selectedProduct.category, selectedProduct.name, selectedProduct.unit)
    : null;
  const CategoryIcon = iconConfig?.Icon || Pill;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
            >
              <Link href="/inventory" title="Back to Inventory Catalog">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Boxes className="size-6 text-primary" />
              <span>Receive Incoming Stock Batch</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pl-10">
            Log incoming supplier shipment batches, update stock quantities, and record FEFO expiry dates.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Medicine Selection */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <span>1. Select Medicine / Product</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Search your pharmacy catalog to receive a new shipment batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProduct ? (
              /* Selected Product Summary Card */
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconConfig?.bgClass}`}
                  >
                    <CategoryIcon className="size-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-foreground">{selectedProduct.name}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatCategory(selectedProduct.category)}
                      </Badge>
                      {selectedProduct.isControlledSubstance && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
                          Rx Schedule
                        </Badge>
                      )}
                    </div>
                    {selectedProduct.genericName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedProduct.genericName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Current Active Stock: <strong>{selectedProduct.totalStock ?? 0} {selectedProduct.unit}s</strong>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                  className="shrink-0 text-xs h-8"
                >
                  Change Medicine
                </Button>
              </div>
            ) : (
              /* Medicine Live Search Input */
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by medicine name, generic formula (e.g. Paracetamol), or barcode..."
                    className="pl-9 h-10 text-sm"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
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
                              Stock: {prod.totalStock ?? 0} {prod.unit}s
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
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              <span>2. Shipment Batch & Quantities</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Enter batch numbers, quantities received, and FEFO expiry dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="batchNumber" className="text-xs font-semibold">
                  Batch Number
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateBatchNumber}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="size-3" />
                  Auto Generate
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
                Quantity Received ({selectedProduct?.unit ? `${selectedProduct.unit}s` : 'Units'}) *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 50"
                className="h-9 text-xs sm:text-sm"
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
                className="h-9 text-xs sm:text-sm"
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
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              <span>3. Purchase Cost & Retail MRP Pricing</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Record distributor purchase costs and customer selling prices for margin auditing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
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
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 180.00"
                  className="h-9 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Estimated Margin Preview */}
            {numCost > 0 && numSell > 0 && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between gap-2">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  Estimated Batch Profit Margin:
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +PKR {marginPkr.toFixed(2)} / unit ({marginPercent}% Margin)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Supplier & Location Details */}
        <Card className="shadow-xs border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <span>4. Supplier Invoice & Rack Location (Optional)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Track vendor distributors and storage shelf rack placement.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vendor / Distributor Name */}
            <div className="space-y-1.5">
              <Label htmlFor="vendorName" className="text-xs font-semibold">
                Supplier / Distributor Name
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
              <Label htmlFor="rackNumber" className="text-xs font-semibold">
                Rack / Storage Shelf Location
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
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline" size="sm" className="h-10 px-4 text-xs sm:text-sm">
            <Link href="/inventory">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !selectedProduct}
            className="h-10 px-6 text-xs sm:text-sm gap-2 font-semibold"
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
