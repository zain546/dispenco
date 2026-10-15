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
  Pill,
  Package,
  UserPlus,
  UserCheck,
  X,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScannerInput } from '@/components/ui/scanner-input';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { customersApi, CustomerItem } from '@/features/customers/services/customers-api';
import { CustomerModal } from '@/features/customers/components/customer-modal';
import { getMedicineIconConfig } from '@/features/inventory/components/product-list';
import { posOfflineService } from '../services/pos-offline-service';
import { OfflineSyncModal } from './offline-sync-modal';
import { ReceiptModal } from './receipt-modal';
import { RecentSalesModal } from './recent-sales-modal';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';
import { toast } from 'sonner';

export interface CartItem {
  product: ProductData;
  quantity: number;
  unitPrice: number;
  unitType: 'BOX' | 'UNIT';
  discount: number;
  discountType: 'FLAT' | 'PERCENT';
  taxRatePercent: number;
}

const getPackSize = (product: ProductData): number => {
  const attrs = (product.attributes || {}) as Record<string, unknown>;
  return Math.max(1, Number(attrs.packSize) || 1);
};

const getSingleUnitPrice = (product: ProductData): number => {
  const boxPrice = product.latestSellPrice ?? 0;
  const packSize = getPackSize(product);
  return packSize > 0 ? Number((boxPrice / packSize).toFixed(2)) : boxPrice;
};

export function POSTerminal() {
  const { activeStoreId, activeStore, isAllStores, stores } = useStore();

  // Cart & Search State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  // Customer & Payment State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerItem[]>([]);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DIGITAL' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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

  // Live Customer Search for POS & Outside Click Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.trim().length < 2) {
      setCustomerSearchResults([]);
      setIsCustomerSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCustomerSearching(true);
      try {
        const results = await customersApi.searchCustomers(customerSearchQuery.trim());
        setCustomerSearchResults((results || []) as CustomerItem[]);
        setIsCustomerDropdownOpen(true);
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setIsCustomerSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Recent Sales History State
  const [isRecentSalesOpen, setIsRecentSalesOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([]);
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(false);

  const fetchRecentSales = async () => {
    setIsLoadingRecentSales(true);
    try {
      const res = await salesApi.getRecentSales(25, !isAllStores && activeStoreId ? activeStoreId : undefined);
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
        const res = await productsApi.getProducts({
          limit: 50,
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
        });
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
  }, [activeStoreId, isAllStores]);

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
        const res = await productsApi.getProducts({
          search: searchQuery.trim(),
          storeId: (!isAllStores && activeStoreId) ? activeStoreId : undefined,
        });
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
  }, [searchQuery, activeStoreId, isAllStores]);

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

  // Handle adding product to cart (supports full Box or Single Tablet/Sub-unit)
  const addToCart = (product: ProductData, initialUnitType: 'BOX' | 'UNIT' = 'BOX') => {
    const packSize = getPackSize(product);
    const boxPrice = product.latestSellPrice ?? 0;
    const singleUnitPrice = getSingleUnitPrice(product);
    const defaultPrice = initialUnitType === 'UNIT' ? singleUnitPrice : boxPrice;
    const defaultTaxRate = resolveTaxRateFromCode(product.taxCode);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.unitType === initialUnitType
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const availableStock = product.totalStock ?? 999;
        const maxStockAllowed = initialUnitType === 'UNIT' ? availableStock * packSize : availableStock;

        if (currentQty + 1 > maxStockAllowed) {
          toast.warning(
            `Maximum available stock reached for ${product.name} (${maxStockAllowed} ${
              initialUnitType === 'UNIT' ? 'tablet/unit' : product.unit
            }s)`
          );
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
            unitType: initialUnitType,
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
    toast.success(
      `Added "${product.name}" (${initialUnitType === 'UNIT' ? 'Single Tablet/Unit' : 'Full Box'}) to cart`,
      { duration: 1500 }
    );
    focusSearchInput();
  };

  // Toggle cart line item unit type (Box vs Single Unit)
  const toggleUnitType = (index: number, targetUnitType: 'BOX' | 'UNIT') => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (item.unitType === targetUnitType) return prev;

      const packSize = getPackSize(item.product);
      const boxPrice = item.product.latestSellPrice ?? 0;
      const singleUnitPrice = getSingleUnitPrice(item.product);

      if (targetUnitType === 'UNIT') {
        updated[index] = {
          ...item,
          unitType: 'UNIT',
          unitPrice: singleUnitPrice,
          quantity: item.quantity === 1 ? 1 : item.quantity,
        };
        toast.info(`Switched ${item.product.name} to Single Tablet/Unit (${singleUnitPrice.toFixed(2)} PKR/unit)`);
      } else {
        updated[index] = {
          ...item,
          unitType: 'BOX',
          unitPrice: boxPrice,
          quantity: Math.max(1, Math.round(item.quantity / packSize)),
        };
        toast.info(`Switched ${item.product.name} to Full ${item.product.unit} (${boxPrice.toFixed(2)} PKR/box)`);
      }

      return updated;
    });
  };

  // Dynamically update pack size (units per box) for a product directly from cart
  const updatePackSize = async (index: number, newPackSize: number) => {
    if (newPackSize <= 0) return;
    const item = cart[index];
    if (!item) return;

    const existingAttrs = (item.product.attributes || {}) as Record<string, unknown>;
    const updatedAttrs = { ...existingAttrs, packSize: newPackSize };
    const boxPrice = item.product.latestSellPrice ?? 0;
    const newSingleUnitPrice = Number((boxPrice / newPackSize).toFixed(2));

    setCart((prev) => {
      const updated = [...prev];
      const cur = updated[index];
      if (!cur) return prev;
      updated[index] = {
        ...cur,
        product: {
          ...cur.product,
          attributes: updatedAttrs,
        },
        unitPrice: cur.unitType === 'UNIT' ? newSingleUnitPrice : cur.unitPrice,
      };
      return updated;
    });

    try {
      await productsApi.updateProduct(item.product.id, {
        attributes: updatedAttrs,
      });
      toast.success(
        `Updated ${item.product.name} to ${newPackSize} units/box (${newSingleUnitPrice.toFixed(2)} PKR/unit)`
      );
    } catch {
      toast.info(`Updated pack size to ${newPackSize} units/box locally`);
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (scannedCode: string) => {
    if (!scannedCode.trim()) return;
    try {
      const res = await productsApi.lookupByBarcode(
        scannedCode.trim(),
        (!isAllStores && activeStoreId) ? activeStoreId : undefined,
      );
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
      const item = updated[index];
      const packSize = getPackSize(item.product);
      const availableStockBoxes = item.product.totalStock ?? 999;
      const maxStock = item.unitType === 'UNIT' ? availableStockBoxes * packSize : availableStockBoxes;

      if (newQty > maxStock) {
        toast.warning(
          `Cannot exceed available stock of ${maxStock} ${item.unitType === 'UNIT' ? 'tablet/unit' : item.product.unit}(s)`
        );
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
      toast.error(`Cash tendered (${formatCurrency(tenderedNum)}) is less than total amount (${formatCurrency(totals.grandTotal)})`);
      return;
    }

    if (stores.length === 0) {
      toast.error('No active store branch found. Please add a store branch in settings before processing sales.');
      return;
    }

    if (isAllStores) {
      toast.error('Please select a specific store branch from the header switcher to process sales.');
      return;
    }

    const currentBranchId = activeStoreId || stores[0]?.id;
    if (!currentBranchId) {
      toast.error('No valid store branch selected. Please select a branch to process sales.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      toast.error('A registered customer must be selected from the ledger to complete a sale on credit (Khata).');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      storeId: currentBranchId || undefined,
      customerId: selectedCustomer?.id || undefined,
      customerName: (selectedCustomer ? selectedCustomer.name : customerName.trim()) || undefined,
      customerPhone: (selectedCustomer ? (selectedCustomer.phone || undefined) : customerPhone.trim()) || undefined,
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
        setSelectedCustomer(null);
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
        setSelectedCustomer(null);
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
          setSelectedCustomer(null);
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
        const errMsg = getErrorMessage(err, 'Failed to complete sale checkout');
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
            <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 text-primary bg-primary/10">
              {isAllStores ? 'Org Overview (Select branch to bill)' : (activeStore?.name || 'Main Counter')}
            </Badge>
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
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : pendingOfflineCount > 0
                ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-background text-foreground'
            }`}
          >
            {!isOnline ? (
              <WifiOff className="size-3.5 text-destructive animate-pulse" />
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

      {/* Edge-case Store Selection Alerts */}
      {stores.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-lg text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>No active store branch found:</strong> You must create or activate a store branch in the header switcher before processing sales.
            </span>
          </div>
        </div>
      )}
      {isAllStores && (
        <div className="bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 px-4 py-3 rounded-lg text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-purple-600 shrink-0" />
            <span>
              <strong>Org Overview Active:</strong> Sales must be linked to a physical store branch for FEFO batch deductions. Please select a specific branch from the header to transact.
            </span>
          </div>
        </div>
      )}

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
                <div className="border border-border rounded-xl bg-card shadow-xl divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {searchResults.map((prod, idx) => {
                    const itemConfig = getMedicineIconConfig(prod.category, prod.name, prod.unit);
                    const ItemIcon = itemConfig.Icon;
                    const stock = prod.totalStock ?? 0;
                    const boxPrice = prod.latestSellPrice ?? 0;
                    const packSize = getPackSize(prod);
                    const singlePrice = getSingleUnitPrice(prod);
                    const isPriority = Boolean((prod.attributes as Record<string, unknown>)?.isPriority);

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 hover:bg-primary/5 transition-colors text-xs sm:text-sm ${
                          idx === selectedResultIndex ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                          {/* Product Info Column */}
                          <div
                            onClick={() => addToCart(prod, 'BOX')}
                            className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className={`size-8 sm:size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${itemConfig.bgClass}`}>
                              <ItemIcon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground leading-snug break-words">
                                  {prod.name}
                                </span>
                                {isPriority && <Star className="size-3 fill-amber-500 text-amber-500 shrink-0" />}
                                {prod.genericName && (
                                  <span className="text-[11px] text-muted-foreground truncate">({prod.genericName})</span>
                                )}
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium shrink-0">
                                  {prod.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                                {packSize > 1 ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    {packSize} units/box • {singlePrice.toFixed(2)} PKR/unit
                                  </span>
                                ) : (
                                  <span>Stock: {stock} {prod.unit}s</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Add Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/30">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(prod, 'UNIT');
                              }}
                              className="h-8 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 whitespace-nowrap"
                              title={`Add 1 Tablet/Unit (${singlePrice.toFixed(2)} PKR)`}
                            >
                              <Pill className="size-3.5" />
                              <span>+1 Unit ({singlePrice.toFixed(0)} PKR)</span>
                            </Button>

                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(prod, 'BOX');
                              }}
                              className="h-8 text-xs font-bold gap-1.5 flex-1 sm:flex-initial shadow-2xs whitespace-nowrap"
                              title={`Add full ${prod.unit} (${boxPrice.toFixed(2)} PKR)`}
                            >
                              <Package className="size-3.5" />
                              <span>+ Box ({boxPrice.toFixed(0)} PKR)</span>
                            </Button>
                          </div>
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
                      const packSize = getPackSize(item.product);
                      const boxPrice = item.product.latestSellPrice ?? 0;
                      const singleUnitPrice = getSingleUnitPrice(item.product);
                      const availableStockBoxes = item.product.totalStock ?? 999;
                      const maxStock = item.unitType === 'UNIT' ? availableStockBoxes * packSize : availableStockBoxes;

                      return (
                        <div key={`${item.product.id}-${item.unitType}`} className="p-3.5 space-y-2.5 bg-card hover:bg-muted/20 transition-colors">
                          {/* Card Header: Product Name, Unit Mode Toggle & Trash Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="font-bold text-sm text-foreground leading-snug break-words">
                                {item.product.name}
                              </p>

                              {/* Minimal Glassmorphic Segmented Toggle Control */}
                              <div className="inline-flex items-center p-0.5 rounded-md bg-muted/50 border border-border/30 gap-0.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleUnitType(idx, 'BOX')}
                                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all whitespace-nowrap ${
                                    item.unitType === 'BOX'
                                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs dark:bg-primary/25 dark:text-primary-foreground'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                  }`}
                                >
                                  📦 Box
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleUnitType(idx, 'UNIT')}
                                  className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all whitespace-nowrap ${
                                    item.unitType === 'UNIT'
                                      ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 shadow-2xs dark:bg-emerald-500/25 dark:text-emerald-300'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                  }`}
                                >
                                  💊 Tablet / Unit
                                </button>
                              </div>

                              {/* Minimal Single-Line Subtext */}
                              <div className="text-[10px] pt-0.5 truncate">
                                {item.unitType === 'UNIT' ? (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 flex-wrap">
                                    <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                                    {packSize === 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const sizeStr = prompt(`Set Pack Size (Units/Box) for ${item.product.name}:`, '100');
                                          if (sizeStr) {
                                            const parsed = parseInt(sizeStr, 10);
                                            if (parsed > 0) updatePackSize(idx, parsed);
                                          }
                                        }}
                                        className="text-[9px] underline font-bold text-amber-600 dark:text-amber-400 hover:underline"
                                      >
                                        ⚙️ Set Pack Size
                                      </button>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {packSize} units/box • Stock: {availableStockBoxes}
                                  </span>
                                )}
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
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">Qty ({item.unitType === 'UNIT' ? 'Units' : 'Boxes'}):</span>
                              </div>
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
                                  max={maxStock}
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                                  className="h-8 w-14 text-xs text-center font-bold px-1"
                                />

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(idx, item.quantity + 1)}
                                  disabled={item.quantity >= maxStock}
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
                          <th className="p-3 pl-4">Item & Unit Type</th>
                          <th className="p-3 w-28 text-center">Unit Price</th>
                          <th className="p-3 w-36 text-center">Quantity</th>
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
                          const packSize = getPackSize(item.product);
                          const boxPrice = item.product.latestSellPrice ?? 0;
                          const singleUnitPrice = getSingleUnitPrice(item.product);
                          const availableStockBoxes = item.product.totalStock ?? 999;
                          const maxStock = item.unitType === 'UNIT' ? availableStockBoxes * packSize : availableStockBoxes;

                          return (
                            <tr key={`${item.product.id}-${item.unitType}`} className="hover:bg-muted/30 transition-colors">
                              {/* Medicine Name & Unit Mode Toggle */}
                              <td className="p-3 pl-4 align-middle min-w-[240px]">
                                <div className="space-y-1">
                                  <p className="font-bold text-foreground leading-snug break-words">
                                    {item.product.name}
                                  </p>

                                  {/* Minimal Glassmorphic Segmented Toggle Control */}
                                  <div className="inline-flex items-center p-0.5 rounded-md bg-muted/50 border border-border/30 gap-0.5 mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => toggleUnitType(idx, 'BOX')}
                                      className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all whitespace-nowrap ${
                                        item.unitType === 'BOX'
                                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs dark:bg-primary/25 dark:text-primary-foreground'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                      }`}
                                    >
                                      📦 Box
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleUnitType(idx, 'UNIT')}
                                      className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all whitespace-nowrap ${
                                        item.unitType === 'UNIT'
                                          ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 shadow-2xs dark:bg-emerald-500/25 dark:text-emerald-300'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                      }`}
                                    >
                                      💊 Tablet / Unit
                                    </button>
                                  </div>

                                  {/* Minimal Single-Line Subtext */}
                                  <div className="text-[10px] pt-0.5 truncate">
                                    {item.unitType === 'UNIT' ? (
                                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5 flex-wrap">
                                        <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                                        {packSize === 1 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const sizeStr = prompt(`Set Pack Size (Units/Box) for ${item.product.name}:`, '100');
                                              if (sizeStr) {
                                                const parsed = parseInt(sizeStr, 10);
                                                if (parsed > 0) updatePackSize(idx, parsed);
                                              }
                                            }}
                                            className="text-[9px] underline font-bold text-amber-600 dark:text-amber-400 hover:underline"
                                          >
                                            ⚙️ Set Pack Size
                                          </button>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {packSize} units/box • Stock: {availableStockBoxes}
                                      </span>
                                    )}
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
                                <div className="space-y-1">
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
                                      max={maxStock}
                                      value={item.quantity}
                                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                                      className="h-8 w-14 text-xs text-center font-bold px-1 focus-visible:ring-1"
                                    />

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                                      disabled={item.quantity >= maxStock}
                                      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <Plus className="size-3" />
                                    </Button>
                                  </div>
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
              {/* Customer Account & Khata Credit Section */}
              <div className="space-y-2" ref={customerSearchRef}>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    <span>Customer Account</span>
                    {paymentMethod === 'CREDIT' && (
                      <span className="text-[10px] text-destructive font-bold">* Required for Khata</span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer font-medium"
                  >
                    <UserPlus className="size-3" />
                    <span>+ New Customer</span>
                  </Button>
                </div>

                {selectedCustomer ? (
                  /* Selected Customer Card */
                  <div className="p-2.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {selectedCustomer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{selectedCustomer.name}</p>
                          <Badge
                            variant={selectedCustomer.creditBalance > 0 ? 'destructive' : 'secondary'}
                            className="text-[10px] py-0 px-1.5 h-4.5 font-semibold shrink-0"
                          >
                            {selectedCustomer.creditBalance > 0
                              ? `Debt: ${Number(selectedCustomer.creditBalance).toLocaleString('en-PK')} PKR`
                              : 'Khata: 0 PKR'}
                          </Badge>
                        </div>
                        {selectedCustomer.phone && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="size-2.5" />
                            <span>{selectedCustomer.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerName('');
                        setCustomerPhone('');
                      }}
                      className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                      title="Deselect Customer"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  /* Customer Search & Manual Input */
                  <div className="space-y-2 relative">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search customer by name or phone..."
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          if (!e.target.value) {
                            setIsCustomerDropdownOpen(false);
                          }
                        }}
                        onFocus={() => {
                          if (customerSearchResults.length > 0) {
                            setIsCustomerDropdownOpen(true);
                          }
                        }}
                        className="h-9 pl-8 pr-8 text-xs"
                      />
                      {isCustomerSearching && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin" />
                      )}
                      {!isCustomerSearching && customerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery('');
                            setCustomerSearchResults([]);
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>

                    {/* Customer Search Dropdown Results */}
                    {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-10 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                        <div className="p-1">
                          {customerSearchResults.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomerName(cust.name);
                                setCustomerPhone(cust.phone || '');
                                setCustomerSearchQuery('');
                                setIsCustomerDropdownOpen(false);
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{cust.name}</p>
                                <p className="text-[11px] text-muted-foreground">{cust.phone || 'No phone'}</p>
                              </div>
                              <Badge
                                variant={cust.creditBalance > 0 ? 'destructive' : 'outline'}
                                className="text-[10px] py-0 px-1.5 h-4.5 font-semibold shrink-0"
                              >
                                {cust.creditBalance > 0 ? `${cust.creditBalance} PKR debt` : '0 PKR debt'}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Walk-in Customer Fallback Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      <Input
                        placeholder="Or walk-in name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                      />
                      <Input
                        placeholder="Walk-in phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="h-8 text-xs bg-muted/20"
                      />
                    </div>
                  </div>
                )}
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

              {/* Credit / Khata Validation Notice */}
              {paymentMethod === 'CREDIT' && (
                <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                  selectedCustomer
                    ? 'bg-amber-500/10 border-amber-500/30 text-foreground'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <BookOpen className="size-4 shrink-0" />
                    <span>Khata (Customer Credit Ledger)</span>
                  </div>
                  {selectedCustomer ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Outstanding Debt:</span>
                        <span className="font-semibold text-destructive">{Number(selectedCustomer.creditBalance).toFixed(2)} PKR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ This Purchase:</span>
                        <span className="font-semibold text-foreground">{totals.grandTotal.toFixed(2)} PKR</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                        <span>New Outstanding Balance:</span>
                        <span className="text-destructive">
                          {(Number(selectedCustomer.creditBalance) + totals.grandTotal).toFixed(2)} PKR
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed">
                      ⚠️ Khata credit sales require a registered customer. Please search or register a customer above before completing this transaction.
                    </p>
                  )}
                </div>
              )}

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
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        sale={completedSale}
        storeName={activeStore?.name}
        onNextSale={() => {
          setIsReceiptOpen(false);
          setCompletedSale(null);
          focusSearchInput();
        }}
      />

      {/* Recent Sales History & Void Dialog Modal */}
      <RecentSalesModal
        open={isRecentSalesOpen}
        onOpenChange={setIsRecentSalesOpen}
        recentSales={recentSales}
        isLoading={isLoadingRecentSales}
        onRefresh={fetchRecentSales}
        storeName={activeStore?.name}
      />

      {/* IndexedDB Offline Transaction Queue Modal */}
      <OfflineSyncModal
        open={isOfflineModalOpen}
        onOpenChange={setIsOfflineModalOpen}
        onSyncComplete={checkPendingOfflineSales}
      />

      {/* Quick Customer Registration Modal */}
      <CustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSuccess={(newCust) => {
          if (newCust) {
            setSelectedCustomer(newCust);
            setCustomerName(newCust.name);
            setCustomerPhone(newCust.phone || '');
            toast.success(`Customer "${newCust.name}" selected.`);
          }
        }}
      />
    </div>
  );
}

export const PosTerminal = POSTerminal;

