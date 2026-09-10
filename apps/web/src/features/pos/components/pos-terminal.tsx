'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  Receipt,
  User,
  Phone,
  Zap,
  ArrowRight,
  RotateCcw,
  Loader2,
  Sparkles,
  Percent,
  DollarSign,
  AlertCircle,
  Tag,
  Download,
  Star,
  History,
  Ban,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScannerInput } from '@/components/ui/scanner-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { getMedicineIconConfig } from '@/features/inventory/components/product-list';
import { posOfflineService } from '../services/pos-offline-service';
import { OfflineSyncModal } from './offline-sync-modal';
import { toast } from 'sonner';

export interface CartItem {
  product: ProductData;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'FLAT' | 'PERCENT';
  taxRatePercent: number;
}

export function POSTerminal() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Customer & Payment State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DIGITAL' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Offline IndexedDB Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);

  const checkPendingOfflineSales = useCallback(async () => {
    try {
      const count = await posOfflineService.getPendingCount();
      setPendingOfflineCount(count);
    } catch (err) {
      console.error('Failed to check pending offline sales count:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checkPendingOfflineSales();

      const handleOnline = async () => {
        setIsOnline(true);
        toast.success('Internet reconnected! Syncing offline sales queue...');
        const res = await posOfflineService.syncQueuedSales();
        if (res.successCount > 0) {
          toast.success(`Auto-synced ${res.successCount} offline transaction(s)!`);
        }
        checkPendingOfflineSales();
      };

      const handleOffline = () => {
        setIsOnline(false);
        toast.warning('Internet connection lost. Switched to Local-First Offline POS Mode.', { duration: 4000 });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [checkPendingOfflineSales]);

  // Recent Sales History State
  const [isRecentSalesOpen, setIsRecentSalesOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([]);
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(false);
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);

  const fetchRecentSales = async () => {
    setIsLoadingRecentSales(true);
    try {
      const res = await salesApi.getRecentSales(25);
      setRecentSales(res?.sales || []);
    } catch (err) {
      console.error('Failed to fetch recent sales:', err);
      toast.error('Failed to load recent sales history');
    } finally {
      setIsLoadingRecentSales(false);
    }
  };

  const handleOpenRecentSales = () => {
    setIsRecentSalesOpen(true);
    fetchRecentSales();
  };

  const handleVoidSale = async (saleId: string) => {
    const reasonPrompt = window.prompt('Enter reason for voiding this sale (e.g. Customer Return, Entry Error):');
    if (reasonPrompt === null) return;

    setVoidingSaleId(saleId);
    try {
      await salesApi.voidSale(saleId, reasonPrompt || 'Cashier Void');
      toast.success('Sale voided successfully! Stock restored.');
      fetchRecentSales();
    } catch (err: any) {
      console.error('Void sale error:', err);
      toast.error(err?.response?.data?.message || 'Failed to void sale');
    } finally {
      setVoidingSaleId(null);
    }
  };

  const handleDownloadSalePdf = async (sale: SaleResponse) => {
    try {
      setIsDownloadingPdf(true);
      const { jsPDF } = await import('jspdf');

      const items = sale.items || [];
      const itemRowsCount = items.length;
      const pdfHeight = Math.max(160, 90 + itemRowsCount * 10);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pdfHeight],
      });

      // Store Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Pharmacy Store', 40, 12, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      let currentY = 17;
      pdf.text(`Receipt #: ${sale.receiptNumber}`, 40, currentY, { align: 'center' });
      currentY += 5;

      // Divider Line
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Metadata
      const formattedDate = new Date(sale.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      pdf.setFontSize(8);
      pdf.text(`Date & Time: ${formattedDate}`, 5, currentY);
      currentY += 4;
      pdf.text(`Cashier: ${sale.cashierName || 'Pharmacy Staff'}`, 5, currentY);
      currentY += 4;
      if (sale.customerName) {
        pdf.text(`Customer: ${sale.customerName}`, 5, currentY);
        currentY += 4;
      }

      // Divider Line
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Table Header
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITEM', 5, currentY);
      pdf.text('QTY × PRICE', 42, currentY);
      pdf.text('TOTAL', 75, currentY, { align: 'right' });
      currentY += 2;
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Table Line Items
      pdf.setFont('helvetica', 'normal');
      items.forEach((item) => {
        const lineTotal = item.lineTotal;
        const nameTruncated = item.productName.length > 20 ? item.productName.substring(0, 20) + '...' : item.productName;
        pdf.text(nameTruncated, 5, currentY);
        pdf.text(`${item.quantity} ${item.unit || 'pc'} × ${item.unitPrice.toFixed(0)}`, 42, currentY);
        pdf.text(`${lineTotal.toFixed(2)} PKR`, 75, currentY, { align: 'right' });
        currentY += 5;
      });

      // Divider Line
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Totals Summary
      pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal:', 5, currentY);
      pdf.text(`${sale.subtotal.toFixed(2)} PKR`, 75, currentY, { align: 'right' });
      currentY += 5;

      if (sale.discountAmount > 0) {
        pdf.text('Discount:', 5, currentY);
        pdf.text(`-${sale.discountAmount.toFixed(2)} PKR`, 75, currentY, { align: 'right' });
        currentY += 5;
      }

      if (sale.taxAmount > 0) {
        pdf.text('Tax:', 5, currentY);
        pdf.text(`+${sale.taxAmount.toFixed(2)} PKR`, 75, currentY, { align: 'right' });
        currentY += 5;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('GRAND TOTAL:', 5, currentY);
      pdf.text(`${sale.totalAmount.toFixed(2)} PKR`, 75, currentY, { align: 'right' });
      currentY += 7;

      // Payment Details
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Payment Method: ${sale.paymentMethod || 'CASH'} (PAID)`, 5, currentY);
      currentY += 8;

      // Footer
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      const footerLines = pdf.splitTextToSize(
        'Thank you for choosing us! Please retain receipt for returns within 7 days.',
        70
      );
      pdf.text(footerLines, 40, currentY, { align: 'center' });

      pdf.save(`Receipt-${sale.receiptNumber}.pdf`);
      toast.success('Thermal Receipt PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF receipt.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Search Input Ref for keyboard focusing
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount and after actions
  const focusSearchInput = () => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const [topSellers, setTopSellers] = useState<ProductData[]>([]);

  // Load top seller products for quick-add speed dial bar
  useEffect(() => {
    const loadTopSellers = async () => {
      try {
        const res = await productsApi.getProducts({ limit: 50 });
        const items: ProductData[] = res?.data || [];
        const priorityItems = items.filter((p) =>
          Boolean((p.attributes as Record<string, unknown>)?.isPriority)
        );
        setTopSellers(priorityItems);
      } catch (err) {
        console.error('Failed to load top seller quick-add products:', err);
      }
    };
    loadTopSellers();
  }, []);

  useEffect(() => {
    focusSearchInput();
  }, []);

  // Global Keyboard Shortcuts (F2: Focus Search, F9: Checkout, Esc: Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearchInput();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting && !isReceiptOpen) {
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        if (searchResults.length > 0) {
          setSearchResults([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting, isReceiptOpen, searchResults]);

  // Live product search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await productsApi.getProducts({ search: searchQuery.trim() });
        const items: ProductData[] = res?.data || [];
        setSearchResults(items);
        setSelectedResultIndex(0);
      } catch (err) {
        console.error('Search products error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resolveTaxRateFromCode = (taxCode?: string | null): number => {
    if (!taxCode) return 0;
    const clean = taxCode.toUpperCase().trim();
    switch (clean) {
      case 'EXEMPT':
      case 'ZERO':
        return 0;
      case 'REDUCED_5':
      case 'REDUCED':
        return 5;
      case 'STANDARD':
      case 'GST_18':
      case 'DEFAULT':
        return 18;
      default:
        return 0;
    }
  };

  // Handle adding product to cart
  const addToCart = (product: ProductData) => {
    const defaultPrice = product.latestSellPrice ?? 0;
    const defaultTaxRate = resolveTaxRateFromCode(product.taxCode);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const availableStock = product.totalStock ?? 999;

        if (currentQty + 1 > availableStock) {
          toast.warning(`Maximum available stock reached for ${product.name} (${availableStock} ${product.unit}s)`);
          return prev;
        }

        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: defaultPrice,
            discount: 0,
            discountType: 'FLAT',
            taxRatePercent: defaultTaxRate,
          },
        ];
      }
    });

    setSearchQuery('');
    setSearchResults([]);
    toast.success(`Added "${product.name}" to cart`, { duration: 1500 });
    focusSearchInput();
  };

  // Handle barcode scan
  const handleBarcodeScan = async (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    try {
      const res = await productsApi.lookupByBarcode(scannedCode.trim());
      if (res?.product) {
        addToCart(res.product);
      } else {
        toast.error(`No medicine found with barcode "${scannedCode}"`);
      }
    } catch {
      toast.error(`Barcode "${scannedCode}" not registered in catalog`);
    } finally {
      setSearchQuery('');
      focusSearchInput();
    }
  };

  // Cart actions
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const maxStock = updated[index].product.totalStock ?? 999;
      if (newQty > maxStock) {
        toast.warning(`Cannot exceed available stock of ${maxStock} ${updated[index].product.unit}(s)`);
        updated[index].quantity = maxStock;
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  const updateUnitPrice = (index: number, newPrice: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].unitPrice = Math.max(0, newPrice);
      return updated;
    });
  };

  const updateItemDiscount = (index: number, val: number, type?: 'FLAT' | 'PERCENT') => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].discount = Math.max(0, val);
      if (type) updated[index].discountType = type;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    toast.info('Item removed from cart');
    focusSearchInput();
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCashTendered('');
    setOverallDiscount(0);
    toast.info('Cart cleared');
    focusSearchInput();
  };

  // Calculations
  const calculateCartTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let taxTotal = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      let lineDiscount = 0;

      if (item.discount > 0) {
        if (item.discountType === 'PERCENT') {
          lineDiscount = (lineSubtotal * item.discount) / 100;
        } else {
          lineDiscount = Math.min(lineSubtotal, item.discount);
        }
      }

      const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = (taxableAmount * item.taxRatePercent) / 100;

      subtotal += lineSubtotal;
      itemDiscounts += lineDiscount;
      taxTotal += lineTax;
    });

    let overallDiscAmount = 0;
    if (overallDiscount > 0) {
      if (overallDiscountType === 'PERCENT') {
        overallDiscAmount = (subtotal * overallDiscount) / 100;
      } else {
        overallDiscAmount = Math.min(subtotal, overallDiscount);
      }
    }

    const totalDiscount = itemDiscounts + overallDiscAmount;
    const grandTotal = Math.max(0, subtotal - totalDiscount + taxTotal);

    return {
      subtotal,
      itemDiscounts,
      overallDiscAmount,
      totalDiscount,
      taxTotal,
      grandTotal,
    };
  };

  const totals = calculateCartTotals();
  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totals.grandTotal);

  // Handle Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Scan or search medicines to add.');
      return;
    }

    if (paymentMethod === 'CASH' && cashTendered && tenderedNum < totals.grandTotal) {
      toast.error(`Cash tendered (${tenderedNum} PKR) is less than total amount (${totals.grandTotal.toFixed(2)} PKR)`);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      overallDiscount: overallDiscount > 0 ? overallDiscount : undefined,
      overallDiscountType,
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount > 0 ? item.discount : undefined,
        discountType: item.discountType,
        taxRatePercent: item.taxRatePercent > 0 ? item.taxRatePercent : undefined,
      })),
    };

    // If browser is offline, directly save locally to IndexedDB queue
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { sale } = await posOfflineService.saveOfflineSale(payload, totals);
        setCompletedSale(sale);
        setIsReceiptOpen(true);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCashTendered('');
        setOverallDiscount(0);
        checkPendingOfflineSales();
        toast.success(`Offline Sale Saved! Local Receipt #${sale.receiptNumber}`);
      } catch (err) {
        console.error('Offline sale save error:', err);
        toast.error('Failed to store sale in offline IndexedDB database');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Try online API checkout, fallback to IndexedDB if network error
    try {
      const res = await salesApi.createSale(payload);

      if (res?.sale) {
        setCompletedSale(res.sale);
        setIsReceiptOpen(true);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCashTendered('');
        setOverallDiscount(0);
        toast.success(`Sale completed! Receipt #${res.sale.receiptNumber}`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const isNetworkError = !err?.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';

      if (isNetworkError) {
        try {
          const { sale } = await posOfflineService.saveOfflineSale(payload, totals);
          setCompletedSale(sale);
          setIsReceiptOpen(true);
          setCart([]);
          setCustomerName('');
          setCustomerPhone('');
          setCashTendered('');
          setOverallDiscount(0);
          checkPendingOfflineSales();
          toast.warning(`Network disconnect. Sale saved locally to IndexedDB! #${sale.receiptNumber}`);
        } catch (saveErr) {
          console.error('Offline fallback save error:', saveErr);
          toast.error('Failed to store sale in offline database');
        }
      } else {
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to complete sale checkout';
        toast.error(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 px-1 sm:px-0">
      {/* Top Header & Keyboard Shortcut Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="size-5 sm:size-6 text-primary shrink-0" />
              <span>POS Billing Counter</span>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Fast keyboard & scanner-driven pharmacy sales counter with local-first offline resilience.
          </p>
        </div>

        {/* Quick Keyboard Hints & Recent Sales / Offline Queue */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOfflineModalOpen(true)}
            className={`h-8 text-xs font-semibold gap-1.5 border-border ${
              !isOnline
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                : pendingOfflineCount > 0
                ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                : 'bg-background text-foreground'
            }`}
          >
            {!isOnline ? (
              <WifiOff className="size-3.5 text-rose-500 animate-pulse" />
            ) : (
              <Database className="size-3.5 text-primary" />
            )}
            <span>
              {!isOnline
                ? 'Offline Mode'
                : pendingOfflineCount > 0
                ? `Offline Queue (${pendingOfflineCount})`
                : 'Offline Queue'}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenRecentSales}
            className="h-8 text-xs font-semibold gap-1.5 border-border bg-background hover:bg-muted/40 text-foreground"
          >
            <History className="size-3.5 text-primary" />
            <span>Recent Transactions</span>
          </Button>

          <div className="hidden md:flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-mono font-medium text-muted-foreground shadow-2xs">
              F2 Focus Search
            </kbd>
            <kbd className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md text-[11px] font-mono font-semibold shadow-2xs">
              F9 Complete Sale
            </kbd>
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-[11px] font-mono font-medium text-muted-foreground shadow-2xs">
              Esc Clear Search
            </kbd>
          </div>
        </div>
      </div>

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Search & Cart Table (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Live Search & Barcode Scanner Header */}
          <Card className="shadow-2xs border-border/80 bg-card overflow-visible">
            <CardContent className="p-2.5 sm:p-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="pos-search" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground px-0.5">
                  <Search className="size-3.5 text-primary" />
                  <span>Scan Medicine Barcode or Search Catalog</span>
                </Label>
                <div className="relative">
                  <ScannerInput
                    ref={searchInputRef}
                    id="pos-search"
                    placeholder="Scan barcode or type medicine name / generic formula..."
                    value={searchQuery}
                    onChange={(val) => setSearchQuery(val)}
                    onScan={handleBarcodeScan}
                    className="h-11 text-sm bg-background"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-14 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin pointer-events-none" />
                  )}
                </div>

                {/* Top Seller Speed-Dial Quick-Add Bar */}
                {topSellers.length > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-1.5">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" />
                      <span>Top Seller Speed Dial:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {topSellers.map((prod) => (
                        <Button
                          key={prod.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(prod)}
                          className="h-7 text-xs gap-1.5 bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/30 text-foreground font-semibold rounded-lg shadow-2xs"
                        >
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          <span>{prod.name}</span>
                          {prod.latestSellPrice !== null && prod.latestSellPrice !== undefined && (
                            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                              ({prod.latestSellPrice.toFixed(0)} PKR)
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown List */}
              {searchResults.length > 0 && (
                <div className="border border-border rounded-xl bg-card shadow-xl divide-y divide-border/60 max-h-72 overflow-y-auto">
                  {searchResults.map((prod, idx) => {
                    const itemConfig = getMedicineIconConfig(prod.category, prod.name, prod.unit);
                    const ItemIcon = itemConfig.Icon;
                    const stock = prod.totalStock ?? 0;
                    const price = prod.latestSellPrice ?? 0;
                    const isPriority = Boolean((prod.attributes as Record<string, unknown>)?.isPriority);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => addToCart(prod)}
                        className={`p-3 hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs sm:text-sm ${idx === selectedResultIndex ? 'bg-primary/10' : ''
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${itemConfig.bgClass}`}>
                            <ItemIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground leading-snug truncate flex items-center gap-1">
                                {prod.name}
                                {isPriority && <Star className="size-3 fill-amber-500 text-amber-500 shrink-0" />}
                              </span>
                              {prod.genericName && (
                                <span className="text-[11px] text-muted-foreground truncate">({prod.genericName})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {prod.category}
                              </Badge>
                              {prod.barcode && <span>EAN: {prod.barcode}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary text-sm">{price.toFixed(2)} PKR</p>
                          <p className={`text-[11px] font-medium ${stock > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                            {stock > 0 ? `${stock} ${prod.unit}s in stock` : 'Out of stock'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Running Cart Table */}
          <Card className="shadow-2xs border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                  <Receipt className="size-4 text-primary shrink-0" />
                  <span>Running Cart ({cart.length} item{cart.length === 1 ? '' : 's'})</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Adjust quantities, apply discounts, or remove items before final receipt checkout.
                </CardDescription>
              </div>

              {cart.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Clear Cart
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {cart.length === 0 ? (
                /* Empty Cart Placeholder */
                <div className="p-8 sm:p-12 text-center text-muted-foreground space-y-3">
                  <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border">
                    <ShoppingCart className="size-6" />
                  </div>
                  <div className="space-y-1 max-w-xs mx-auto">
                    <p className="text-sm font-semibold text-foreground">Cart is currently empty</p>
                    <p className="text-xs text-muted-foreground">
                      Use your barcode scanner or the search bar above to add medicines to this transaction.
                    </p>
                  </div>
                </div>
              ) : (
                /* Active Cart List */
                <div>
                  {/* Mobile Touch Cards (Visible on screens < md) */}
                  <div className="block md:hidden divide-y divide-border/60">
                    {cart.map((item, idx) => {
                      const lineSub = item.unitPrice * item.quantity;
                      let lineDisc = 0;
                      if (item.discount > 0) {
                        lineDisc =
                          item.discountType === 'PERCENT'
                            ? (lineSub * item.discount) / 100
                            : Math.min(lineSub, item.discount);
                      }
                      const lineTotal = Math.max(0, lineSub - lineDisc);
                      const availableStock = item.product.totalStock ?? 999;

                      return (
                        <div key={item.product.id} className="p-3.5 space-y-2.5 bg-card hover:bg-muted/20 transition-colors">
                          {/* Card Header: Product Name, Category & Trash Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="font-bold text-sm text-foreground leading-snug break-words">
                                {item.product.name}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                  {item.product.unit}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  Stock: {availableStock}
                                </span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(idx)}
                              className="size-8 shrink-0 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 -mr-1 -mt-1"
                              title="Remove item"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          {/* Controls Row: Qty, Unit Price, Discount & Line Total */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                            {/* Quantity Controls */}
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground font-medium">Quantity:</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(idx, item.quantity - 1)}
                                  className="size-8 shrink-0 text-muted-foreground"
                                >
                                  <Minus className="size-3.5" />
                                </Button>

                                <Input
                                  type="number"
                                  min="1"
                                  max={availableStock}
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                                  className="h-8 w-12 text-xs text-center font-bold px-1"
                                />

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(idx, item.quantity + 1)}
                                  disabled={item.quantity >= availableStock}
                                  className="size-8 shrink-0 text-muted-foreground"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Unit Price */}
                            <div className="space-y-1 text-right">
                              <span className="text-[11px] text-muted-foreground font-medium">Unit Price (PKR):</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs text-right font-semibold ml-auto max-w-[100px]"
                              />
                            </div>

                            {/* Discount Input */}
                            <div className="space-y-1">
                              <span className="text-[11px] text-muted-foreground font-medium">Discount:</span>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.discount || ''}
                                  placeholder="0"
                                  onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                                  className="h-8 text-xs text-center font-medium max-w-[70px]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateItemDiscount(
                                      idx,
                                      item.discount,
                                      item.discountType === 'FLAT' ? 'PERCENT' : 'FLAT',
                                    )
                                  }
                                  className="h-8 text-[11px] px-1.5 font-bold text-muted-foreground hover:text-primary"
                                >
                                  {item.discountType === 'PERCENT' ? '%' : 'PKR'}
                                </Button>
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="space-y-1 text-right flex flex-col justify-end">
                              <span className="text-[11px] text-muted-foreground font-medium">Line Total:</span>
                              <p className="font-extrabold text-sm text-primary">
                                {lineTotal.toFixed(2)} PKR
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (Visible on screens >= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-3 pl-4">Item & Formula</th>
                          <th className="p-3 w-28 text-center">Unit Price</th>
                          <th className="p-3 w-32 text-center">Quantity</th>
                          <th className="p-3 w-32 text-center">Discount</th>
                          <th className="p-3 pr-4 text-right">Line Total</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {cart.map((item, idx) => {
                          const lineSub = item.unitPrice * item.quantity;
                          let lineDisc = 0;
                          if (item.discount > 0) {
                            lineDisc =
                              item.discountType === 'PERCENT'
                                ? (lineSub * item.discount) / 100
                                : Math.min(lineSub, item.discount);
                          }
                          const lineTotal = Math.max(0, lineSub - lineDisc);
                          const availableStock = item.product.totalStock ?? 999;

                          return (
                            <tr key={item.product.id} className="hover:bg-muted/30 transition-colors">
                              {/* Medicine Name & Category */}
                              <td className="p-3 pl-4 align-middle min-w-[160px]">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-foreground leading-snug break-words">
                                    {item.product.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                      {item.product.unit}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                      Stock: {availableStock}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Unit Price */}
                              <td className="p-3 align-middle text-center">
                                <div className="relative inline-block w-20">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs text-center font-semibold focus-visible:ring-1"
                                  />
                                </div>
                              </td>

                              {/* Quantity Controls */}
                              <td className="p-3 align-middle text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Minus className="size-3" />
                                  </Button>

                                  <Input
                                    type="number"
                                    min="1"
                                    max={availableStock}
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                                    className="h-8 w-12 text-xs text-center font-bold px-1 focus-visible:ring-1"
                                  />

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                                    disabled={item.quantity >= availableStock}
                                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              </td>

                              {/* Per-Item Discount */}
                              <td className="p-3 align-middle text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={item.discount || ''}
                                    placeholder="0"
                                    onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                                    className="h-8 w-16 text-xs text-center font-medium px-1 focus-visible:ring-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      updateItemDiscount(
                                        idx,
                                        item.discount,
                                        item.discountType === 'FLAT' ? 'PERCENT' : 'FLAT',
                                      )
                                    }
                                    className="size-7 shrink-0 text-xs font-bold text-muted-foreground hover:text-primary"
                                    title="Toggle Flat ($) vs Percent (%) discount"
                                  >
                                    {item.discountType === 'PERCENT' ? '%' : 'PKR'}
                                  </Button>
                                </div>
                              </td>

                              {/* Line Total */}
                              <td className="p-3 pr-4 align-middle text-right font-bold text-foreground">
                                {lineTotal.toFixed(2)} PKR
                              </td>

                              {/* Remove Item */}
                              <td className="p-3 align-middle text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFromCart(idx)}
                                  className="size-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                                  title="Remove item (Delete)"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checkout Sidebar (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Billing & Payment Details Card */}
          <Card className="shadow-xs border-border/80 bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                <Banknote className="size-4 text-primary shrink-0" />
                <span>Payment Summary</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Select payment method and complete customer checkout.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Optional Customer Information */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" /> Customer Details (Optional)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Overall Discount Toggle */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <Label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" /> Order Discount
                  </Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={overallDiscountType === 'FLAT' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setOverallDiscountType('FLAT')}
                      className="h-6 text-[10px] px-2"
                    >
                      Flat PKR
                    </Button>
                    <Button
                      type="button"
                      variant={overallDiscountType === 'PERCENT' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setOverallDiscountType('PERCENT')}
                      className="h-6 text-[10px] px-2"
                    >
                      Percent %
                    </Button>
                  </div>
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={overallDiscount || ''}
                  onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-xs font-semibold text-foreground">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'DIGITAL', label: 'Digital', icon: CreditCard },
                    { id: 'CREDIT', label: 'Credit', icon: Receipt },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as 'CASH' | 'DIGITAL' | 'CREDIT')}
                        className={`h-11 rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${isActive
                            ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs ring-1 ring-primary/30'
                            : 'bg-card border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground font-medium'
                          }`}
                      >
                        <Icon className={`size-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Tendered & Change Due Calculator */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Cash Received:</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="h-8 w-28 text-xs text-right font-bold"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1 justify-end pt-1">
                    {[500, 1000, 5000].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCashTendered(amt.toString())}
                        className="h-6 text-[10px] px-1.5 font-medium"
                      >
                        {amt}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashTendered(Math.ceil(totals.grandTotal).toString())}
                      className="h-6 text-[10px] px-1.5 font-bold text-primary"
                    >
                      Exact
                    </Button>
                  </div>

                  {tenderedNum > 0 && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 font-bold">
                      <span className="text-muted-foreground">Change Due:</span>
                      <span className={changeDue >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                        {changeDue.toFixed(2)} PKR
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Totals Breakdown */}
              <div className="space-y-1.5 pt-3 border-t border-border/80 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium text-foreground">{totals.subtotal.toFixed(2)} PKR</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{totals.totalDiscount.toFixed(2)} PKR</span>
                  </div>
                )}
                {totals.taxTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span className="font-medium text-foreground">+{totals.taxTotal.toFixed(2)} PKR</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold pt-2 border-t border-border/80 text-foreground">
                  <span>Grand Total:</span>
                  <span className="text-primary">{totals.grandTotal.toFixed(2)} PKR</span>
                </div>
              </div>

              {/* Complete Checkout Action Button */}
              <Button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full h-12 text-sm font-bold shadow-md gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Processing Sale...
                  </>
                ) : (
                  <>
                    <span>Complete Sale <span className="hidden md:inline">(F9)</span></span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Post-Checkout Receipt Success Modal Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader className="text-center space-y-2">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Sale Completed Successfully!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Receipt <strong className="text-foreground">{completedSale?.receiptNumber}</strong> recorded in pharmacy ledger.
            </DialogDescription>
          </DialogHeader>

          {completedSale && (
            <div className="space-y-4 my-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Receipt #:</span>
                  <span className="font-bold text-foreground">{completedSale.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Customer:</span>
                  <span className="font-semibold text-foreground">{completedSale.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment Method:</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {completedSale.paymentMethod}
                  </Badge>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/60">
                  <span>Total Amount Paid:</span>
                  <span className="font-extrabold text-sm text-primary">
                    {completedSale.totalAmount.toFixed(2)} PKR
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                  Purchased Items ({completedSale.items.length})
                </p>
                <div className="max-h-40 overflow-y-auto divide-y divide-border/60 border border-border/60 rounded-lg p-2 bg-card">
                  {completedSale.items.map((item) => (
                    <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.quantity} {item.unit} x {item.unitPrice.toFixed(2)} PKR (Batch {item.batchNumber})
                        </p>
                      </div>
                      <span className="font-bold text-foreground">{item.lineTotal.toFixed(2)} PKR</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 w-full">
            {completedSale && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadSalePdf(completedSale)}
                  disabled={isDownloadingPdf}
                  className="w-full h-9 text-xs font-semibold gap-1.5"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5 text-primary" />
                  )}
                  Download PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    window.open(`/pos/receipt/${completedSale.id}`, '_blank');
                  }}
                  className="w-full h-9 text-xs gap-1.5"
                >
                  <Printer className="size-3.5" /> Print Receipt
                </Button>
              </div>
            )}
            <Button
              type="button"
              onClick={() => {
                setIsReceiptOpen(false);
                setCompletedSale(null);
                focusSearchInput();
              }}
              className="w-full h-10 text-xs font-bold gap-1.5"
            >
              Next Sale (Esc)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Sales History & Void Dialog Modal */}
      <Dialog open={isRecentSalesOpen} onOpenChange={setIsRecentSalesOpen}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4.5 text-primary" />
                <span>Recent Pharmacy Transactions</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Audit past customer sales, reprint thermal receipt PDFs, or void transactions with automatic stock restoration.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchRecentSales}
              disabled={isLoadingRecentSales}
              className="size-8 p-0 shrink-0"
            >
              <RefreshCw className={`size-4 ${isLoadingRecentSales ? 'animate-spin' : ''}`} />
            </Button>
          </DialogHeader>

          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {isLoadingRecentSales ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading sales history ledger...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <History className="size-8 text-muted-foreground/50 mx-auto" />
                <p className="font-semibold text-sm text-foreground">No Sales Logged Yet</p>
                <p className="text-xs">Completed transactions will appear here for reprint and void management.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden bg-card">
                {recentSales.map((sale) => {
                  const isVoided = sale.status === 'VOIDED';
                  const formattedDate = new Date(sale.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <div
                      key={sale.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isVoided ? 'bg-destructive/5 opacity-75' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">#{sale.receiptNumber}</span>
                          <Badge variant={isVoided ? 'destructive' : 'outline'} className="text-[10px] font-semibold">
                            {sale.paymentMethod} • {isVoided ? 'VOIDED' : 'COMPLETED'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Customer: <strong className="text-foreground">{sale.customerName || 'Walk-in Customer'}</strong> • Cashier: <strong className="text-foreground">{sale.cashierName || 'Staff'}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Items ({sale.itemsCount}): {sale.items?.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-right mr-1">
                          <p className={`font-extrabold text-sm ${isVoided ? 'line-through text-muted-foreground' : 'text-primary'}`}>
                            {sale.totalAmount.toFixed(2)} PKR
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSalePdf(sale)}
                            disabled={isDownloadingPdf}
                            className="h-8 text-xs gap-1 font-semibold"
                          >
                            <Download className="size-3.5 text-primary" />
                            <span className="hidden xs:inline">PDF</span>
                          </Button>
                          {!isVoided && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleVoidSale(sale.id)}
                              disabled={voidingSaleId === sale.id}
                              className="h-8 text-xs gap-1 font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              {voidingSaleId === sale.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Ban className="size-3.5" />
                              )}
                              <span>Void</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* IndexedDB Offline Transaction Queue Modal */}
      <OfflineSyncModal
        open={isOfflineModalOpen}
        onOpenChange={setIsOfflineModalOpen}
        onSyncComplete={checkPendingOfflineSales}
      />
    </div>
  );
}
