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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { posLocalDataService } from '../services/pos-local-data.service';
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
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Offline IndexedDB Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);

  // Pack Size Edit Dialog State (replaces native prompt)
  const [packSizeModal, setPackSizeModal] = useState<{
    isOpen: boolean;
    itemIndex: number;
    productName: string;
    packSize: string;
  }>({
    isOpen: false,
    itemIndex: -1,
    productName: '',
    packSize: '100',
  });

  const handleOpenPackSizeModal = (idx: number, name: string, currentSize: number) => {
    setPackSizeModal({
      isOpen: true,
      itemIndex: idx,
      productName: name,
      packSize: String(currentSize > 1 ? currentSize : 100),
    });
  };

  const handleSavePackSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(packSizeModal.packSize, 10);
    if (!isNaN(parsed) && parsed > 0 && packSizeModal.itemIndex >= 0) {
      updatePackSize(packSizeModal.itemIndex, parsed);
      toast.success(`Pack size for "${packSizeModal.productName}" updated to ${parsed} units/box`);
    } else {
      toast.error('Please enter a valid positive number for pack size.');
    }
    setPackSizeModal((prev) => ({ ...prev, isOpen: false }));
  };

  const checkPendingOfflineSales = useCallback(async () => {
    try {
      const status = await posLocalDataService.getStatus();
      setPendingOfflineCount(status.pendingSalesCount + status.conflictSalesCount);
    } catch (err) {
      console.error('Failed to check pending offline sales count:', err);
    }
  }, []);

  // Background catalog cache sync on mount or branch change
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      const targetStore = !isAllStores && activeStoreId ? activeStoreId : undefined;
      posLocalDataService.syncCatalogToLocal(targetStore).catch((err) => {
        console.warn('Initial offline catalog sync failed:', err);
      });
    }
  }, [activeStoreId, isAllStores]);

  // Read prescription or customer parameters from URL (e.g. from Prescriptions Manager)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const custName = params.get('customerName');
      const custPhone = params.get('customerPhone');
      if (custName) {
        setCustomerName(custName);
        toast.info(`Loaded patient "${custName}" for POS billing.`);
      }
      if (custPhone) setCustomerPhone(custPhone);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checkPendingOfflineSales();

      const handleOnline = async () => {
        setIsOnline(true);
        toast.success('Internet reconnected! Syncing offline sales queue...');
        const res = await posLocalDataService.syncPendingSales();
        if (res.successCount > 0) {
          toast.success(`Auto-synced ${res.successCount} offline transaction(s)!`);
        }
        if (res.conflictCount > 0) {
          toast.warning(`${res.conflictCount} sale(s) have inventory conflicts.`);
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

  // Reset selected search index when search results change
  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchResults]);

  // Search input keyboard navigation (ArrowUp, ArrowDown, Enter, Esc)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults[selectedResultIndex] || searchResults[0];
        if (selected) {
          addToCart(selected, 'BOX');
          setSearchQuery('');
          setSearchResults([]);
          setSelectedResultIndex(0);
          focusSearchInput();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchResults([]);
        setSelectedResultIndex(0);
      }
    }
  };

  // Global Keyboard Shortcuts (F2: Search, F4: Payment Mode, F8: Cash Tendered, F9: Checkout, Esc: Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearchInput();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMethod((prev) => {
          if (prev === 'CASH') return 'DIGITAL';
          if (prev === 'DIGITAL') return 'CREDIT';
          return 'CASH';
        });
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (paymentMethod !== 'CASH') setPaymentMethod('CASH');
        setTimeout(() => cashInputRef.current?.focus(), 60);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting && !isReceiptOpen) {
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        if (searchResults.length > 0) {
          setSearchResults([]);
          setSelectedResultIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting, isReceiptOpen, searchResults, paymentMethod]);

  // Live product search effect with instantaneous local-first read (<5ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchQuery.trim();
    let isCancelled = false;

    // 1. Instant local IndexedDB query (<5ms latency)
    posLocalDataService
      .searchLocalProducts(term)
      .then((localMatches) => {
        if (!isCancelled && localMatches.length > 0) {
          setSearchResults(localMatches);
          setSelectedResultIndex(0);
        }
      })
      .catch(() => {});

    // 2. Debounced remote network search for freshest stock & cloud inventory
    const timer = setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      setIsSearching(true);
      try {
        const res = await productsApi.getProducts({
          search: term,
          storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
        });
        const items: ProductData[] = res?.data || [];
        if (!isCancelled && items.length > 0) {
          setSearchResults(items);
          setSelectedResultIndex(0);
        }
      } catch (err) {
        console.error('Search products network error:', err);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
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

  // Handle barcode scan with zero-latency local-first lookup
  const handleBarcodeScan = async (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    try {
      // 1. Check local IndexedDB first for instant (<1ms) offline barcode scan
      const localProduct = await posLocalDataService.getLocalProductByBarcode(code);
      if (localProduct) {
        addToCart(localProduct);
        setSearchQuery('');
        focusSearchInput();
        return;
      }

      // 2. Fallback to online API lookup if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await productsApi.lookupByBarcode(
          code,
          !isAllStores && activeStoreId ? activeStoreId : undefined,
        );
        if (res?.product) {
          addToCart(res.product);
        } else {
          toast.error(`No medicine found with barcode "${code}"`);
        }
      } else {
        toast.error(`Barcode "${code}" not found in local offline cache`);
      }
    } catch {
      toast.error(`Barcode "${code}" not registered in catalog`);
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

    // If browser is offline, directly save locally to IndexedDB queue with instant local stock decrement
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { sale } = await posLocalDataService.recordLocalSale(payload, totals);
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

    // Try online API checkout, fallback to local IndexedDB queue with stock decrement if network error
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
          const { sale } = await posLocalDataService.recordLocalSale(payload, totals);
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
            <Badge variant="outline" className="text-micro font-semibold border-primary/30 text-primary bg-primary/10">
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

          <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-micro font-mono font-medium text-muted-foreground shadow-2xs">
              F2 Search
            </kbd>
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-micro font-mono font-medium text-muted-foreground shadow-2xs">
              ↑↓ / ↵ Select
            </kbd>
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-micro font-mono font-medium text-muted-foreground shadow-2xs">
              F4 Payment Mode
            </kbd>
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-micro font-mono font-medium text-muted-foreground shadow-2xs">
              F8 Tender Cash
            </kbd>
            <kbd className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md text-micro font-mono font-semibold shadow-2xs">
              F9 Complete Sale
            </kbd>
            <kbd className="px-2 py-1 bg-muted border border-border rounded-md text-micro font-mono font-medium text-muted-foreground shadow-2xs">
              Esc Dismiss
            </kbd>
          </div>
        </div>
      </div>

      {/* Edge-case Store Selection Alerts */}
      {stores.length === 0 && (
        <div className="bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-warning shrink-0" />
            <span>
              <strong>No active store branch found:</strong> You must create or activate a store branch in the header switcher before processing sales.
            </span>
          </div>
        </div>
      )}
      {isAllStores && (
        <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-primary shrink-0" />
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
                    onKeyDown={handleSearchKeyDown}
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
                      <Star className="size-3.5 fill-warning text-warning" />
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
                          className="h-7 text-xs gap-1.5 bg-warning/10 hover:bg-warning/20 border-warning/30 text-warning font-semibold rounded-lg shadow-2xs"
                        >
                          <Star className="size-3 fill-warning text-warning" />
                          <span>{prod.name}</span>
                          {prod.latestSellPrice !== null && prod.latestSellPrice !== undefined && (
                            <span className="text-micro text-warning font-bold">
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
                                {isPriority && <Star className="size-3 fill-warning text-warning shrink-0" />}
                                {prod.genericName && (
                                  <span className="text-micro text-muted-foreground truncate">({prod.genericName})</span>
                                )}
                                <Badge variant="outline" className="text-micro px-1.5 py-0 font-medium shrink-0">
                                  {prod.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-micro text-muted-foreground flex-wrap">
                                {packSize > 1 ? (
                                  <span className="text-success font-medium">
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
                              className="h-8 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial bg-success/10 hover:bg-success/20 text-success border-success/30 whitespace-nowrap"
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
                                  className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap ${
                                    item.unitType === 'BOX'
                                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                  }`}
                                >
                                  📦 Box
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleUnitType(idx, 'UNIT')}
                                  className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap ${
                                    item.unitType === 'UNIT'
                                      ? 'bg-success/15 text-success border border-success/30 shadow-2xs'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                  }`}
                                >
                                  💊 Tablet / Unit
                                </button>
                              </div>

                              {/* Minimal Single-Line Subtext */}
                              <div className="text-micro pt-0.5 truncate">
                                {item.unitType === 'UNIT' ? (
                                  <span className="text-success font-medium flex items-center gap-1.5 flex-wrap">
                                    <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                                    {packSize === 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPackSizeModal(idx, item.product.name, packSize)}
                                        className="text-micro underline font-bold text-warning hover:underline"
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
                              aria-label="Remove item from cart"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          {/* Controls Row: Qty, Unit Price, Discount & Line Total */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                            {/* Quantity Controls */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-micro text-muted-foreground font-medium">Qty ({item.unitType === 'UNIT' ? 'Units' : 'Boxes'}):</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantity(idx, item.quantity - 1)}
                                  className="size-8 shrink-0 text-muted-foreground"
                                  aria-label="Decrease quantity"
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
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Unit Price */}
                            <div className="space-y-1 text-right">
                              <span className="text-micro text-muted-foreground font-medium">Unit Price (PKR):</span>
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
                              <span className="text-micro text-muted-foreground font-medium">Discount:</span>
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
                                  className="h-8 text-micro px-1.5 font-bold text-muted-foreground hover:text-primary"
                                >
                                  {item.discountType === 'PERCENT' ? '%' : 'PKR'}
                                </Button>
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="space-y-1 text-right flex flex-col justify-end">
                              <span className="text-micro text-muted-foreground font-medium">Line Total:</span>
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
                      <thead className="bg-muted/40 text-muted-foreground text-micro font-semibold uppercase tracking-wider">
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
                                      className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap ${
                                        item.unitType === 'BOX'
                                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-2xs'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                      }`}
                                    >
                                      📦 Box
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleUnitType(idx, 'UNIT')}
                                      className={`px-2 py-0.5 text-micro font-bold rounded transition-all whitespace-nowrap ${
                                        item.unitType === 'UNIT'
                                          ? 'bg-success/15 text-success border border-success/30 shadow-2xs'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40 border border-transparent'
                                      }`}
                                    >
                                      💊 Tablet / Unit
                                    </button>
                                  </div>

                                  {/* Minimal Single-Line Subtext */}
                                  <div className="text-micro pt-0.5 truncate">
                                    {item.unitType === 'UNIT' ? (
                                      <span className="text-success font-medium flex items-center gap-1.5 flex-wrap">
                                        <span>{singleUnitPrice.toFixed(2)} PKR/unit • 1/{packSize} Box</span>
                                        {packSize === 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenPackSizeModal(idx, item.product.name, packSize)}
                                            className="text-micro underline font-bold text-warning hover:underline"
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
          <Card id="payment-summary-card" className="shadow-xs border-border/80 bg-card overflow-hidden scroll-mt-20">
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
                      <span className="text-micro text-destructive font-bold">* Required for Khata</span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="h-6 px-2 text-micro gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer font-medium"
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
                            className="text-micro py-0 px-1.5 h-4.5 font-semibold shrink-0"
                          >
                            {selectedCustomer.creditBalance > 0
                              ? `Debt: ${Number(selectedCustomer.creditBalance).toLocaleString('en-PK')} PKR`
                              : 'Khata: 0 PKR'}
                          </Badge>
                        </div>
                        {selectedCustomer.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
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
                      aria-label="Deselect Customer"
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
                          aria-label="Clear customer search"
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
                                <p className="text-xs text-muted-foreground">{cust.phone || 'No phone'}</p>
                              </div>
                              <Badge
                                variant={cust.creditBalance > 0 ? 'destructive' : 'outline'}
                                className="text-micro py-0 px-1.5 h-4.5 font-semibold shrink-0"
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
                      className="h-6 text-micro px-2"
                    >
                      Flat PKR
                    </Button>
                    <Button
                      type="button"
                      variant={overallDiscountType === 'PERCENT' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setOverallDiscountType('PERCENT')}
                      className="h-6 text-micro px-2"
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
                    ? 'bg-warning/10 border-warning/30 text-foreground'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <BookOpen className="size-4 shrink-0" />
                    <span>Khata (Customer Credit Ledger)</span>
                  </div>
                  {selectedCustomer ? (
                    <div className="space-y-1 text-xs">
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
                    <p className="text-xs leading-relaxed">
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
                      ref={cashInputRef}
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
                        className="h-6 text-micro px-1.5 font-medium"
                      >
                        {amt}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashTendered(Math.ceil(totals.grandTotal).toString())}
                      className="h-6 text-micro px-1.5 font-bold text-primary"
                    >
                      Exact
                    </Button>
                  </div>

                  {tenderedNum > 0 && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50 font-bold">
                      <span className="text-muted-foreground">Change Due:</span>
                      <span className={changeDue >= 0 ? 'text-success' : 'text-destructive'}>
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
                  <div className="flex justify-between text-success">
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

      {/* Pack Size Configuration Dialog Modal */}
      <Dialog
        open={packSizeModal.isOpen}
        onOpenChange={(open) => setPackSizeModal((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <span>Configure Medicine Pack Size</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define how many tablets or single units are contained in 1 full box of <strong>{packSizeModal.productName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePackSize} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-pack-size-input" className="text-xs font-semibold">
                Units / Tablets per Box:
              </Label>
              <Input
                id="pos-pack-size-input"
                type="number"
                min="1"
                step="1"
                autoFocus
                value={packSizeModal.packSize}
                onChange={(e) => setPackSizeModal((prev) => ({ ...prev, packSize: e.target.value }))}
                placeholder="e.g. 10, 20, 100"
                className="h-10 text-sm font-semibold"
              />
              <p className="text-micro text-muted-foreground">
                This enables loose-strip and single tablet POS dispensing with automatic FEFO fractional box deductions.
              </p>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPackSizeModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold gap-1.5">
                <CheckCircle2 className="size-3.5" />
                <span>Save Pack Size</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Sticky Checkout Bar (Screens < lg) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border p-3 flex lg:hidden items-center justify-between shadow-xl gap-3">
          <div className="min-w-0">
            <span className="text-micro text-muted-foreground uppercase tracking-wider block font-semibold truncate">
              {cart.reduce((acc, it) => acc + it.quantity, 0)} item{cart.length > 1 ? 's' : ''} in Cart
            </span>
            <span className="text-base font-extrabold text-foreground tracking-tight">
              {totals.grandTotal.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">PKR</span>
            </span>
          </div>
          <Button
            type="button"
            onClick={() => {
              const paySection = document.getElementById('payment-summary-card');
              if (paySection) {
                paySection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="h-9 sm:h-10 px-3.5 text-xs font-bold gap-1.5 shadow-xs shrink-0"
          >
            <span>Review & Pay</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export const PosTerminal = POSTerminal;

