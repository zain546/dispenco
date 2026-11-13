'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Receipt,
  Zap,
  ArrowRight,
  RotateCcw,
  Loader2,
  Sparkles,
  AlertCircle,
  Tag,
  Star,
  History,
  Ban,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Pill,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScannerInput, type Gs1ParsedMedicineData } from '@/components/ui/scanner-input';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { salesApi, SaleResponse } from '@/features/sales/services/sales-api';
import { customersApi, CustomerItem } from '@/features/customers/services/customers-api';
import { CustomerModal } from '@/features/customers/components/customer-modal';
import { getMedicineIconConfig, formatUnitPlural } from '@/features/inventory/components/product-list';
import { posLocalDataService } from '../services/pos-local-data.service';
import { OfflineSyncModal } from './offline-sync-modal';
import { ReceiptModal } from './receipt-modal';
import { RecentSalesModal } from './recent-sales-modal';
import { DraftQuantityInput } from './draft-quantity-input';
import { PosPackSizeModal } from './pos-pack-size-modal';
import { PosLinkBarcodeModal } from './pos-link-barcode-modal';
import { PosCartSection } from './pos-cart-section';
import { PosPaymentSidebar } from './pos-payment-sidebar';
import type { CartItem, CartTotals, PaymentMethod, UnitType, DiscountType } from '../types/pos-types';
import {
  getPackSize,
  getSingleUnitPrice,
  isValidDoctorName,
  getProductExpiryStatus,
  getCommittedUnitsInCart,
  getMaxAllowedQuantity,
  getKhataBalanceBadge,
} from '../utils/pos-helpers';
import { playScanSuccess, playScanError } from '../utils/pos-audio';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useStore } from '@/context/store-context';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';

export type { CartItem };

export function POSTerminal() {
  const queryClient = useQueryClient();
  const { activeStoreId, activeStore, isAllStores, stores } = useStore();
  const { user: currentUser } = useAuth();
  const { isOwner, isManager, canManageInventory } = usePermissions();

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
  const [doctorName, setDoctorName] = useState('Self');
  const [isSelfDoctor, setIsSelfDoctor] = useState(true);
  // Controlled Substance Compliance: detect if cart contains any Schedule G/X controlled narcotics or tranquilizers
  const hasControlledMedicine = cart.some((item) => Boolean(item.product.isControlledSubstance));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DIGITAL' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [overallDiscountType, setOverallDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const doctorInputRef = useRef<HTMLInputElement>(null);
  const productSearchContainerRef = useRef<HTMLDivElement>(null);

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Offline IndexedDB Queue State
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const isSyncingRef = useRef(false);

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

  // Link Unregistered QR / Barcode to Existing Medicine Modal State
  const [linkCodeModal, setLinkCodeModal] = useState<{
    isOpen: boolean;
    scannedCode: string;
    parsedData?: Gs1ParsedMedicineData;
    query: string;
    results: ProductData[];
    isSearching: boolean;
    isLinking: boolean;
  }>({
    isOpen: false,
    scannedCode: '',
    parsedData: undefined,
    query: '',
    results: [],
    isSearching: false,
    isLinking: false,
  });

  useEffect(() => {
    if (!linkCodeModal.isOpen) return;
    const term = linkCodeModal.query.trim();
    if (!term) {
      setLinkCodeModal((prev) => ({ ...prev, results: [], isSearching: false }));
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLinkCodeModal((prev) => ({ ...prev, isSearching: true }));
      try {
        let results: ProductData[] = [];
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        if (isOnline) {
          try {
            const res = await productsApi.getProducts({
              search: term,
              storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
              limit: 10,
            });
            results = res?.data || [];
          } catch {
            // Online search failed; proceed to offline fallback
          }
        }

        // Offline or fallback to local IndexedDB catalog
        if (results.length === 0) {
          results = await posLocalDataService.searchLocalProducts(term);
        }

        if (!cancelled) {
          setLinkCodeModal((prev) => ({
            ...prev,
            results,
            isSearching: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setLinkCodeModal((prev) => ({ ...prev, isSearching: false }));
        }
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [linkCodeModal.isOpen, linkCodeModal.query, activeStoreId, isAllStores]);

  const handleLinkCodeToProduct = async (product: ProductData) => {
    const code = linkCodeModal.scannedCode.trim();
    if (!code) return;
    setLinkCodeModal((prev) => ({ ...prev, isLinking: true }));
    try {
      // 1. Immediately update IndexedDB local cache so future offline scans match instantly
      const localUpdated = await posLocalDataService.updateLocalProductBarcode(product.id, code);
      let updatedProduct: ProductData = localUpdated || { ...product, barcode: code };

      // 2. If online, sync barcode association to backend API catalog
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        const updatedRes = await productsApi.updateProduct(product.id, {
          barcode: code,
        });
        if (updatedRes?.data) {
          updatedProduct = { ...updatedProduct, ...updatedRes.data, barcode: code };
        }
      }

      toast.success(
        `Linked QR/Barcode "${code}" to "${product.name}"${!isOnline ? ' (saved locally for offline use)' : ''}!`
      );
      playScanSuccess();
      setLinkCodeModal({
        isOpen: false,
        scannedCode: '',
        query: '',
        results: [],
        isSearching: false,
        isLinking: false,
      });
      addToCart(updatedProduct);
      const targetStore = !isAllStores && activeStoreId ? activeStoreId : undefined;
      posLocalDataService.syncCatalogToLocal(targetStore).catch(() => {});
    } catch (err) {
      playScanError();
      toast.error(getErrorMessage(err, 'Failed to link QR/barcode to medicine'));
      setLinkCodeModal((prev) => ({ ...prev, isLinking: false }));
    }
  };

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
    if (!isOwner && !isManager && !canManageInventory) {
      toast.error('Manager approval required to change pack size.');
      setPackSizeModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }
    const parsed = parseInt(packSizeModal.packSize, 10);
    if (!isNaN(parsed) && parsed > 0 && packSizeModal.itemIndex >= 0) {
      updatePackSize(packSizeModal.itemIndex, parsed);
    } else {
      toast.error('Please enter a valid pack size (e.g. 10 or 100).');
    }
    setPackSizeModal((prev) => ({ ...prev, isOpen: false }));
  };

  const checkPendingOfflineSales = useCallback(async () => {
    try {
      const status = await posLocalDataService.getStatus();
      setPendingOfflineCount(status.pendingSalesCount + status.conflictSalesCount);
      return status;
    } catch (err) {
      console.error('Failed to check pending offline sales count:', err);
      return null;
    }
  }, []);

  const triggerAutoSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      const status = await posLocalDataService.getStatus();
      if (status.pendingSalesCount === 0) {
        setPendingOfflineCount(status.conflictSalesCount);
        return;
      }

      setIsOnline(true);
      const res = await posLocalDataService.syncPendingSales();
      if (res.successCount > 0) {
        toast.success(`Auto-synced ${res.successCount} offline transaction(s)!`);
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
      if (res.conflictCount > 0) {
        toast.warning(`${res.conflictCount} sale(s) have inventory conflicts.`);
      }
      await checkPendingOfflineSales();
    } catch (err) {
      console.warn('Auto-sync deferred; backend server unreachable:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [checkPendingOfflineSales, queryClient]);

  // Background opportunistic sync heartbeat: checks every 10 seconds while pending sales exist
  useEffect(() => {
    if (pendingOfflineCount === 0) return;
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        void triggerAutoSync();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [pendingOfflineCount, triggerAutoSync]);

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
      const docName = params.get('doctorName') || params.get('dr');
      if (docName) {
        setDoctorName(docName);
        setIsSelfDoctor(docName.toLowerCase() === 'self');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      checkPendingOfflineSales().then((st) => {
        if (st && st.pendingSalesCount > 0 && navigator.onLine) {
          void triggerAutoSync();
        }
      });

      const handleOnline = async () => {
        setIsOnline(true);
        toast.success('Internet reconnected! Syncing offline sales queue...');
        await triggerAutoSync();
      };

      const handleOffline = () => {
        setIsOnline(false);
        toast.warning('Internet connection lost. Switched to Local-First Offline POS Mode.', { duration: 4000 });
      };

      const handleFocus = () => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          void triggerAutoSync();
        }
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('dispenco:network-offline', handleOffline);
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('dispenco:network-offline', handleOffline);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [checkPendingOfflineSales, triggerAutoSync]);

  // Live Customer Search for POS & Outside Click Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (productSearchContainerRef.current && !productSearchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
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
      setRecentSales(res?.data || res?.sales || []);
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

  const clearSearch = (shouldFocus = false) => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResultIndex(0);
    if (shouldFocus === true) {
      focusSearchInput();
    } else {
      searchInputRef.current?.blur();
    }
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
    if (e.key === 'Escape') {
      e.preventDefault();
      clearSearch(false);
      return;
    }

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
          if ((selected.totalStock ?? 0) <= 0) {
            toast.warning(`Cannot add "${selected.name}" — Out of stock.`);
            return;
          }
          addToCart(selected, 'UNIT');
          clearSearch(true);
        }
      }
    }
  };

  const isAnyModalOpen = Boolean(
    isReceiptOpen ||
    isRecentSalesOpen ||
    isOfflineModalOpen ||
    isAddCustomerModalOpen ||
    packSizeModal.isOpen ||
    linkCodeModal.isOpen
  );

  // Keep a stable ref to latest POS state to avoid recreating the global listener on every keystroke
  const stateRef = useRef({
    cart,
    isSubmitting,
    isAnyModalOpen,
    paymentMethod,
    selectedCustomer,
    hasControlledMedicine,
    doctorName,
    searchResults,
    searchQuery,
  });

  useEffect(() => {
    stateRef.current = {
      cart,
      isSubmitting,
      isAnyModalOpen,
      paymentMethod,
      selectedCustomer,
      hasControlledMedicine,
      doctorName,
      searchResults,
      searchQuery,
    };
  });

  // Global Keyboard Shortcuts (F2: Search, F4: Payment Mode, F8: Cash Tendered, F9: Checkout, Esc: Clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      // Isolate shortcuts: do not intercept keys if any modal dialog is open
      if (state.isAnyModalOpen) return;

      if (e.key === 'F2') {
        e.preventDefault();
        focusSearchInput();
      } else if (e.key === 'F4') {
        e.preventDefault();
        // Cycle safely between immediate payment methods (CASH <-> DIGITAL)
        // CREDIT (Khata) requires explicit cashier selection to prevent accidental credit booking
        setPaymentMethod((prev) => (prev === 'CASH' ? 'DIGITAL' : 'CASH'));
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (state.paymentMethod !== 'CASH') setPaymentMethod('CASH');
        setTimeout(() => cashInputRef.current?.focus(), 60);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (state.cart.length > 0 && !state.isSubmitting) {
          if (state.paymentMethod === 'CREDIT' && !state.selectedCustomer) {
            toast.error('Please select a customer for Khata credit.');
            return;
          }
          if (state.hasControlledMedicine && !isValidDoctorName(state.doctorName)) {
            toast.error("Please enter doctor's name for Rx controlled medicine.");
            setTimeout(() => doctorInputRef.current?.focus(), 60);
            return;
          }
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        if (state.searchResults.length > 0 || state.searchQuery) {
          e.preventDefault();
          clearSearch(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Handle adding product to cart (defaults to Single Tablet/Sub-unit per pharmacy counter standard)
  const addToCart = (product: ProductData, initialUnitType: 'BOX' | 'UNIT' = 'UNIT') => {
    const packSize = getPackSize(product);
    const boxPrice = product.latestSellPrice ?? 0;
    const singleUnitPrice = getSingleUnitPrice(product);
    const defaultPrice = initialUnitType === 'UNIT' ? singleUnitPrice : boxPrice;
    const defaultTaxRate = resolveTaxRateFromCode(product.taxCode);

    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.unitType === initialUnitType
    );

    const { maxAllowed, totalAvailableUnits, committedUnits } = getMaxAllowedQuantity(
      cart,
      product,
      initialUnitType,
      existingIndex
    );

    if (maxAllowed <= 0) {
      playScanError();
      if (committedUnits > 0) {
        toast.warning(
          `Cannot add more "${product.name}" (${initialUnitType === 'UNIT' ? 'Tablet/Unit' : 'Box'}) — All available stock (${totalAvailableUnits} units) is already in the cart.`
        );
      } else {
        toast.warning(`Cannot add "${product.name}" — Out of stock (0 available).`);
      }
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product.id === product.id && item.unitType === initialUnitType
      );
      if (idx > -1) {
        const currentQty = prev[idx].quantity;

        if (currentQty + 1 > maxAllowed) {
          playScanError();
          toast.warning(
            `Maximum available stock reached for ${product.name} (${maxAllowed} ${
              initialUnitType === 'UNIT' ? 'tablet/unit' : product.unit
            }s)`
          );
          return prev;
        }

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
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

    playScanSuccess();
    setSearchQuery('');
    setSearchResults([]);
    toast.success(
      `Added "${product.name}" (${initialUnitType === 'UNIT' ? 'Single Tablet/Unit' : 'Full Box'}) to cart`,
      { duration: 1500 }
    );
    focusSearchInput();
  };

  // Dropdown live quantity increment / decrement handlers
  const handleDropdownIncrement = (product: ProductData, unitType: 'BOX' | 'UNIT') => {
    const packSize = getPackSize(product);
    const boxPrice = product.latestSellPrice ?? 0;
    const singleUnitPrice = getSingleUnitPrice(product);
    const defaultPrice = unitType === 'UNIT' ? singleUnitPrice : boxPrice;
    const defaultTaxRate = resolveTaxRateFromCode(product.taxCode);

    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.unitType === unitType
    );

    const { maxAllowed, totalAvailableUnits, committedUnits } = getMaxAllowedQuantity(
      cart,
      product,
      unitType,
      existingIndex
    );

    if (maxAllowed <= 0) {
      if (committedUnits > 0) {
        toast.warning(
          `Cannot add more ${product.name} (${unitType === 'UNIT' ? 'Unit' : 'Box'}) — All available stock (${totalAvailableUnits} units) is already in the cart.`
        );
      } else {
        toast.warning(`Cannot add "${product.name}" — Out of stock (0 available).`);
      }
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product.id === product.id && item.unitType === unitType
      );
      if (idx > -1) {
        const currentQty = prev[idx].quantity;

        if (currentQty + 1 > maxAllowed) {
          toast.warning(
            `Max stock reached for ${product.name} (${maxAllowed} ${unitType === 'UNIT' ? 'tablet/unit' : product.unit}s)`
          );
          return prev;
        }

        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: currentQty + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitType,
            unitPrice: defaultPrice,
            discount: 0,
            discountType: 'FLAT',
            taxRatePercent: defaultTaxRate,
          },
        ];
      }
    });
  };

  const handleDropdownDecrement = (product: ProductData, unitType: 'BOX' | 'UNIT') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.unitType === unitType
      );
      if (existingIndex === -1) return prev;

      const currentQty = prev[existingIndex].quantity;
      if (currentQty <= 1) {
        return prev.filter((_, idx) => idx !== existingIndex);
      }

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: currentQty - 1,
      };
      return updated;
    });
  };

  const handleDropdownSetQuantity = (product: ProductData, unitType: 'BOX' | 'UNIT', newQty: number) => {
    if (isNaN(newQty) || newQty <= 0) {
      setCart((prev) => prev.filter((item) => !(item.product.id === product.id && item.unitType === unitType)));
      return;
    }

    const packSize = getPackSize(product);
    const boxPrice = product.latestSellPrice ?? 0;
    const singleUnitPrice = getSingleUnitPrice(product);
    const defaultPrice = unitType === 'UNIT' ? singleUnitPrice : boxPrice;
    const defaultTaxRate = resolveTaxRateFromCode(product.taxCode);

    const existingIndex = cart.findIndex(
      (item) => item.product.id === product.id && item.unitType === unitType
    );

    const { maxAllowed, committedUnits } = getMaxAllowedQuantity(
      cart,
      product,
      unitType,
      existingIndex
    );

    if (maxAllowed <= 0) {
      if (committedUnits > 0) {
        toast.warning(
          `Cannot allocate ${product.name} (${unitType === 'UNIT' ? 'Unit' : 'Box'}) — All available stock is already in the cart.`
        );
      } else {
        toast.warning(`"${product.name}" is out of stock.`);
      }
      setCart((prev) => prev.filter((item) => !(item.product.id === product.id && item.unitType === unitType)));
      return;
    }

    const clampedQty = Math.min(newQty, maxAllowed);

    if (newQty > maxAllowed) {
      toast.warning(
        `Max available stock is ${maxAllowed} ${unitType === 'UNIT' ? 'tablet/unit' : product.unit}s`
      );
    }

    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.product.id === product.id && item.unitType === unitType
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: clampedQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: clampedQty,
            unitType,
            unitPrice: defaultPrice,
            discount: 0,
            discountType: 'FLAT',
            taxRatePercent: defaultTaxRate,
          },
        ];
      }
    });
  };

  // Toggle cart line item unit type (Box vs Single Unit)
  const toggleUnitType = (index: number, targetUnitType: 'BOX' | 'UNIT') => {
    setCart((prev) => {
      const item = prev[index];
      if (!item || item.unitType === targetUnitType) return prev;

      const packSize = getPackSize(item.product);
      const boxPrice = item.product.latestSellPrice ?? 0;
      const singleUnitPrice = getSingleUnitPrice(item.product);

      const existingTargetIdx = prev.findIndex(
        (it, idx) => idx !== index && it.product.id === item.product.id && it.unitType === targetUnitType
      );

      let requestedTargetQty: number;
      if (targetUnitType === 'UNIT') {
        requestedTargetQty = item.quantity * packSize;
      } else {
        requestedTargetQty = Math.max(1, Math.floor(item.quantity / packSize));
      }

      const { maxAllowed } = getMaxAllowedQuantity(
        prev,
        item.product,
        targetUnitType,
        existingTargetIdx > -1 ? undefined : index
      );

      if (existingTargetIdx > -1) {
        const existingItem = prev[existingTargetIdx];
        const combinedQty = Math.min(existingItem.quantity + requestedTargetQty, existingItem.quantity + maxAllowed);
        const updated = prev.filter((_, idx) => idx !== index);
        const adjustedTargetIdx = existingTargetIdx > index ? existingTargetIdx - 1 : existingTargetIdx;
        updated[adjustedTargetIdx] = {
          ...existingItem,
          quantity: Math.max(1, combinedQty),
        };
        toast.info(
          `Merged into ${targetUnitType === 'UNIT' ? 'Single Tablets' : 'Boxes'} (Total: ${Math.max(1, combinedQty)})`
        );
        return updated;
      } else {
        const updated = [...prev];
        const clampedQty = Math.max(1, Math.min(requestedTargetQty, maxAllowed));
        updated[index] = {
          ...item,
          unitType: targetUnitType,
          unitPrice: targetUnitType === 'UNIT' ? singleUnitPrice : boxPrice,
          quantity: clampedQty,
        };
        toast.info(
          `Switched ${item.product.name} to ${
            targetUnitType === 'UNIT'
              ? `Single Tablet/Unit (${singleUnitPrice.toFixed(2)} PKR/unit)`
              : `Full Box (${boxPrice.toFixed(0)} PKR/box)`
          }`
        );
        return updated;
      }
    });
  };

  // Dynamically update pack size (units per box) for a product directly from cart
  const updatePackSize = async (index: number, newPackSize: number) => {
    if (newPackSize <= 0) return;
    const item = cart[index];
    if (!item) return;

    if (!isOwner && !isManager && !canManageInventory) {
      toast.error('Manager approval required to change pack size.');
      return;
    }

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

  // Handle QR code, 2D DataMatrix, or 1D barcode scan with local-first lookup & 1-click linking
  const handleBarcodeScan = async (scannedCode: string, parsedData?: Gs1ParsedMedicineData) => {
    const code = scannedCode.trim();
    if (!code) return;

    try {
      // 1. Check local IndexedDB first for instant (<1ms) offline barcode/QR scan
      const localProduct = await posLocalDataService.getLocalProductByBarcode(code);
      if (localProduct) {
        addToCart(localProduct);
        setSearchQuery('');
        focusSearchInput();
        return;
      }

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // 2. Fallback to online API lookup if online
      if (isOnline) {
        try {
          const res = await productsApi.lookupByBarcode(
            code,
            !isAllStores && activeStoreId ? activeStoreId : undefined,
          );
          if (res?.product) {
            addToCart(res.product);
            setSearchQuery('');
            focusSearchInput();
            return;
          }
        } catch {
          // Not found by exact barcode online
        }
      }

      // 3. If QR code contains medicine name/text, check catalog search (online or local)
      if (/[a-zA-Z]{3,}/.test(code) && !/^https?:/i.test(code)) {
        let matchedItems: ProductData[] = [];
        if (isOnline) {
          try {
            const searchRes = await productsApi.getProducts({
              search: code,
              storeId: !isAllStores && activeStoreId ? activeStoreId : undefined,
              limit: 5,
            });
            matchedItems = searchRes?.data || [];
          } catch {
            // Online search error; will fallback to local search
          }
        }
        if (matchedItems.length === 0) {
          matchedItems = await posLocalDataService.searchLocalProducts(code);
        }
        if (matchedItems.length === 1) {
          addToCart(matchedItems[0]);
          setSearchQuery('');
          focusSearchInput();
          return;
        }
      }

      // 4. Unregistered QR / Barcode: Play error alert & open Link or Create Medicine modal
      playScanError();

      const seedQuery =
        parsedData?.gtin ||
        (/[a-zA-Z]{3,}/.test(code) && !/^https?:/i.test(code) ? code : '');

      setLinkCodeModal({
        isOpen: true,
        scannedCode: code,
        parsedData,
        query: seedQuery,
        results: [],
        isSearching: false,
        isLinking: false,
      });

      if (!isOnline) {
        toast.info(
          `QR/Barcode "${code}" not registered. Match with a cached medicine to link for offline billing.`
        );
      }
    } finally {
      setSearchQuery('');
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
      if (!item) return prev;

      const { maxAllowed, totalAvailableUnits, committedUnits } = getMaxAllowedQuantity(
        prev,
        item.product,
        item.unitType,
        index
      );

      if (maxAllowed <= 0) {
        toast.warning(
          `"${item.product.name}" has no additional stock available (${committedUnits}/${totalAvailableUnits} units allocated).`
        );
        return prev;
      }

      if (newQty > maxAllowed) {
        toast.warning(
          `Cannot exceed available stock of ${maxAllowed} ${item.unitType === 'UNIT' ? 'tablet/unit' : item.product.unit}(s)`
        );
        updated[index].quantity = maxAllowed;
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  const updateUnitPrice = (index: number, newPrice: number) => {
    const item = cart[index];
    if (!item) return;

    if (newPrice <= 0) {
      toast.error('Price must be greater than 0. Use discount for free items.');
      return;
    }

    const packSize = getPackSize(item.product);
    const unitCostPrice =
      item.unitType === 'BOX'
        ? (item.product.latestCostPrice ?? 0)
        : packSize > 0
          ? (item.product.latestCostPrice ?? 0) / packSize
          : (item.product.latestCostPrice ?? 0);

    if (unitCostPrice > 0 && newPrice < unitCostPrice) {
      if (!isOwner && !isManager && !canManageInventory) {
        toast.error(
          `Manager approval needed to sell ${item.product.name} below cost (${formatCurrency(unitCostPrice)}).`
        );
        return;
      }
      toast.warning(
        `Selling below cost price (${formatCurrency(unitCostPrice)}).`
      );
    }

    setCart((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        unitPrice: Math.max(0.01, Number(newPrice.toFixed(2))),
      };
      return updated;
    });
  };

  const updateItemDiscount = (index: number, val: number, type?: 'FLAT' | 'PERCENT') => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;

      const targetType = type || item.discountType;
      const lineSubtotal = item.unitPrice * item.quantity;
      let clampedVal = Math.max(0, val);

      if (targetType === 'PERCENT') {
        clampedVal = Math.min(100, clampedVal);
      } else {
        clampedVal = Math.min(lineSubtotal, clampedVal);
      }

      updated[index] = {
        ...item,
        discount: clampedVal,
        discountType: targetType,
      };
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
    clearSearch(false);
    toast.info('Cart cleared');
  };

  // Calculations: strictly sequential discount calculation & proportional tax adjustment
  const calculateCartTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let unadjustedTaxTotal = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      let lineDiscount = 0;

      if (item.discount > 0) {
        if (item.discountType === 'PERCENT') {
          const clampedPercent = Math.min(100, Math.max(0, item.discount));
          lineDiscount = (lineSubtotal * clampedPercent) / 100;
        } else {
          lineDiscount = Math.min(lineSubtotal, item.discount);
        }
      }

      const taxableAmount = Math.max(0, lineSubtotal - lineDiscount);
      const lineTax = (taxableAmount * (item.taxRatePercent || 0)) / 100;

      subtotal += lineSubtotal;
      itemDiscounts += lineDiscount;
      unadjustedTaxTotal += lineTax;
    });

    // Order-level discount strictly applies to remaining post-item-discount balance
    const remainingSubtotal = Math.max(0, subtotal - itemDiscounts);
    let overallDiscAmount = 0;

    if (overallDiscount > 0 && remainingSubtotal > 0) {
      if (overallDiscountType === 'PERCENT') {
        const clampedPercent = Math.min(100, Math.max(0, overallDiscount));
        overallDiscAmount = (remainingSubtotal * clampedPercent) / 100;
      } else {
        overallDiscAmount = Math.min(remainingSubtotal, overallDiscount);
      }
    }

    // Proportionally scale tax when order-level discount is applied
    const taxAdjustmentRatio = remainingSubtotal > 0 ? Math.max(0, 1 - overallDiscAmount / remainingSubtotal) : 0;
    const taxTotal = Math.round(unadjustedTaxTotal * taxAdjustmentRatio * 100) / 100;

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

  // Automatically select Doctor prescriber mode when a controlled medicine is added to the cart
  useEffect(() => {
    if (hasControlledMedicine && isSelfDoctor) {
      setIsSelfDoctor(false);
      if (doctorName === 'Self' || !doctorName) {
        setDoctorName('Dr. ');
      }
    }
  }, [hasControlledMedicine, isSelfDoctor, doctorName]);

  // Handle Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add a medicine first.');
      return;
    }

    if (paymentMethod === 'CASH' && cashTendered && tenderedNum < totals.grandTotal) {
      toast.error(`Cash received is less than total bill (${formatCurrency(totals.grandTotal)}).`);
      return;
    }

    if (stores.length === 0) {
      toast.error('No store branch found. Please add one in settings.');
      return;
    }

    if (isAllStores) {
      toast.error('Please select a specific store branch from the header.');
      return;
    }

    const currentBranchId = activeStoreId || stores[0]?.id;
    if (!currentBranchId) {
      toast.error('Please select a store branch to process sales.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      toast.error('Please select a customer for Khata credit.');
      return;
    }

    if (hasControlledMedicine && !isValidDoctorName(doctorName)) {
      toast.error("Please enter doctor's name for Rx controlled medicine.");
      setTimeout(() => doctorInputRef.current?.focus(), 60);
      return;
    }

    const zeroPriceItem = cart.find((i) => i.unitPrice <= 0);
    if (zeroPriceItem) {
      toast.error(`"${zeroPriceItem.product.name}" price cannot be 0. Use discount instead.`);
      return;
    }

    if (!selectedCustomer && customerPhone.trim()) {
      const cleanPhone = customerPhone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        toast.error('Enter a valid phone number (7–15 digits) or leave blank.');
        return;
      }
    }

    setIsSubmitting(true);
    const clientTxId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientTxId,
      storeId: currentBranchId || undefined,
      customerId: selectedCustomer?.id || undefined,
      customerName: (selectedCustomer ? selectedCustomer.name : customerName.trim()) || undefined,
      customerPhone: (selectedCustomer ? (selectedCustomer.phone || undefined) : customerPhone.trim()) || undefined,
      doctorName: (isSelfDoctor ? 'Self' : doctorName.trim()) || 'Self',
      overallDiscount: overallDiscount > 0 ? overallDiscount : undefined,
      overallDiscountType,
      paymentMethod,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitType: item.unitType,
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
        const enrichedSale: SaleResponse = {
          ...sale,
          cashierName: currentUser?.name || 'Staff',
          user: currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : undefined,
        };
        setCompletedSale(enrichedSale);
        setIsReceiptOpen(true);
        setCart([]);
        setSelectedCustomer(null);
        setCustomerName('');
        setCustomerPhone('');
        setCashTendered('');
        setOverallDiscount(0);
        setDoctorName('Self');
        setIsSelfDoctor(true);
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
        const enrichedSale: SaleResponse = {
          ...res.sale,
          cashierName: res.sale.cashierName || res.sale.user?.name || currentUser?.name || 'Staff',
          user: res.sale.user || (currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : undefined),
        };
        setCompletedSale(enrichedSale);
        setIsReceiptOpen(true);
        setCart([]);
        setSelectedCustomer(null);
        setCustomerName('');
        setCustomerPhone('');
        setCashTendered('');
        setOverallDiscount(0);
        setDoctorName('Self');
        setIsSelfDoctor(true);
        toast.success(`Sale completed! Receipt #${res.sale.receiptNumber}`);

        // Invalidate TanStack query cache for inventory, sales, and reports
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        if (payload.customerId) {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const isNetworkError = !err?.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';

      if (isNetworkError) {
        setIsOnline(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dispenco:network-offline'));
        }
        try {
          const { sale } = await posLocalDataService.recordLocalSale(payload, totals);
          const enrichedSale: SaleResponse = {
            ...sale,
            cashierName: currentUser?.name || 'Staff',
            user: currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : undefined,
          };
          setCompletedSale(enrichedSale);
          setIsReceiptOpen(true);
          setCart([]);
          setSelectedCustomer(null);
          setCustomerName('');
          setCustomerPhone('');
          setCashTendered('');
          setOverallDiscount(0);
          setDoctorName('Self');
        setIsSelfDoctor(true);
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
            <button
              type="button"
              onClick={focusSearchInput}
              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-micro font-mono font-medium text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer transition-colors"
              title="Focus product search (F2)"
            >
              F2 Search
            </button>
            <span className="px-2 py-1 bg-muted/60 border border-border/80 rounded-md text-micro font-mono font-medium text-muted-foreground/80 shadow-2xs select-none">
              ↑↓ / ↵ Select
            </span>
            <button
              type="button"
              onClick={() => setPaymentMethod((prev) => (prev === 'CASH' ? 'DIGITAL' : 'CASH'))}
              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-micro font-mono font-medium text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer transition-colors"
              title="Toggle Payment Mode (F4)"
            >
              F4 Payment Mode
            </button>
            <button
              type="button"
              onClick={() => {
                if (paymentMethod !== 'CASH') setPaymentMethod('CASH');
                setTimeout(() => cashInputRef.current?.focus(), 60);
              }}
              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-micro font-mono font-medium text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer transition-colors"
              title="Tender Cash (F8)"
            >
              F8 Tender Cash
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="px-2 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-md text-micro font-mono font-semibold shadow-2xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Complete Sale (F9)"
            >
              F9 Complete Sale
            </button>
            <button
              type="button"
              onClick={() => clearSearch(false)}
              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border rounded-md text-micro font-mono font-medium text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer transition-colors"
              title="Dismiss search (Esc)"
            >
              Esc Dismiss
            </button>
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
            <CardContent ref={productSearchContainerRef} className="p-2.5 sm:p-4 space-y-3">
              <div className="space-y-1 relative">
                <Label htmlFor="pos-search" className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground px-0.5">
                  <Search className="size-3.5 text-primary" />
                  <span>Scan Medicine Barcode or Search Catalog</span>
                </Label>
                <div className="relative">
                  <ScannerInput
                    ref={searchInputRef}
                    id="pos-search"
                    name="pos_barcode_search_field"
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
                      {topSellers.map((prod) => {
                        const isOutOfStock = (prod.totalStock ?? 0) <= 0;
                        return (
                          <Button
                            key={prod.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(prod)}
                            className={`h-7 text-xs gap-1.5 font-semibold rounded-lg shadow-2xs ${
                              isOutOfStock
                                ? 'opacity-50 border-destructive/30 text-destructive cursor-not-allowed'
                                : 'bg-warning/10 hover:bg-warning/20 border-warning/30 text-warning'
                            }`}
                          >
                            <Star className="size-3 fill-warning text-warning" />
                            <span>{prod.name}</span>
                            {isOutOfStock ? (
                              <span className="text-micro font-bold text-destructive">
                                (Out of stock)
                              </span>
                            ) : (
                              prod.latestSellPrice !== null && prod.latestSellPrice !== undefined && (
                                <span className="text-micro text-warning font-bold">
                                  ({prod.latestSellPrice.toFixed(0)} PKR)
                                </span>
                              )
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown List */}
              {searchResults.length > 0 && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="border border-border rounded-xl bg-card shadow-xl divide-y divide-border/60 max-h-80 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span className="font-semibold text-foreground">
                      Search Results ({searchResults.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => clearSearch(false)}
                      className="hover:text-foreground flex items-center gap-1 cursor-pointer font-semibold text-xs px-2 py-0.5 rounded hover:bg-muted"
                    >
                      <span>Done</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[10px]">Esc</kbd>
                    </button>
                  </div>
                  {searchResults.map((prod, idx) => {
                    const itemConfig = getMedicineIconConfig(prod.category, prod.name, prod.unit);
                    const ItemIcon = itemConfig.Icon;
                    const stock = prod.totalStock ?? 0;
                    const boxPrice = prod.latestSellPrice ?? 0;
                    const packSize = getPackSize(prod);
                    const singlePrice = getSingleUnitPrice(prod);
                    const isPriority = Boolean((prod.attributes as Record<string, unknown>)?.isPriority);

                    const unitItem = cart.find((item) => item.product.id === prod.id && item.unitType === 'UNIT');
                    const boxItem = cart.find((item) => item.product.id === prod.id && item.unitType === 'BOX');
                    const unitQty = unitItem ? unitItem.quantity : 0;
                    const boxQty = boxItem ? boxItem.quantity : 0;
                    const inCartTotal = unitQty + boxQty;

                    const { maxAllowed: unitsAddable, remainingUnits, totalAvailableUnits } = getMaxAllowedQuantity(
                      cart,
                      prod,
                      'UNIT',
                      unitItem ? cart.indexOf(unitItem) : -1
                    );
                    const { maxAllowed: boxesAddable } = getMaxAllowedQuantity(
                      cart,
                      prod,
                      'BOX',
                      boxItem ? cart.indexOf(boxItem) : -1
                    );

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 transition-colors text-xs sm:text-sm ${
                          idx === selectedResultIndex ? 'bg-primary/10' : ''
                        } ${stock <= 0 ? 'opacity-70 hover:bg-destructive/5' : 'hover:bg-primary/5'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                          {/* Product Info Column - Clicking row adds/increments default unit */}
                          <div
                            onClick={() => {
                              if (stock <= 0) return;
                              const expiry = getProductExpiryStatus(prod.nearestExpiryDate);
                              if (expiry?.isExpired) {
                                toast.error(`"${prod.name}" is expired (${expiry.formattedDate}). Cannot dispense expired stock.`);
                                return;
                              }
                              handleDropdownIncrement(prod, packSize > 1 ? 'UNIT' : 'BOX');
                            }}
                            className={`flex items-start sm:items-center gap-2.5 min-w-0 flex-1 ${
                              stock <= 0 ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={stock <= 0 ? 'Out of stock' : 'Click to add to cart'}
                          >
                            <div className={`size-8 sm:size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${itemConfig.bgClass}`}>
                              <ItemIcon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground leading-snug break-words">
                                  {prod.name}
                                </span>
                                {prod.isControlledSubstance && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                                    Rx
                                  </span>
                                )}
                                {isPriority && <Star className="size-3 fill-warning text-warning shrink-0" />}
                                {prod.genericName && (
                                  <span className="text-micro text-muted-foreground truncate">({prod.genericName})</span>
                                )}
                                <Badge variant="outline" className="text-micro px-1.5 py-0 font-medium shrink-0">
                                  {prod.category}
                                </Badge>
                                {(() => {
                                  const expiry = getProductExpiryStatus(prod.nearestExpiryDate);
                                  if (!expiry) return null;
                                  return (
                                    <Badge
                                      variant={expiry.isExpired ? 'destructive' : 'outline'}
                                      className={`text-micro px-1.5 py-0 font-bold shrink-0 ${
                                        expiry.isExpired
                                          ? 'bg-destructive/15 text-destructive border-destructive/30'
                                          : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                      }`}
                                    >
                                      {expiry.isExpired ? `Expired: ${expiry.formattedDate}` : `Exp: ${expiry.formattedDate} (${expiry.daysRemaining}d)`}
                                    </Badge>
                                  );
                                })()}
                                {inCartTotal > 0 && (
                                  <Badge className="bg-success/15 text-success border-success/30 text-micro px-1.5 py-0 font-bold shrink-0">
                                    ✓ In Cart: {unitQty > 0 && `${unitQty} ${packSize > 1 ? 'Unit' : prod.unit}${unitQty > 1 ? 's' : ''}`}{unitQty > 0 && boxQty > 0 && ' + '}{boxQty > 0 && `${boxQty} Box${boxQty > 1 ? 'es' : ''}`}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-micro text-muted-foreground flex-wrap">
                                {stock <= 0 ? (
                                  <span className="text-destructive font-semibold flex items-center gap-1">
                                    Stock: {formatUnitPlural(prod.unit, 0)} • Out of stock
                                  </span>
                                ) : packSize > 1 ? (
                                  <span className="text-success font-medium">
                                    {packSize} units/box • {singlePrice.toFixed(2)} PKR/unit • Stock: {formatUnitPlural('Box', stock)}
                                  </span>
                                ) : (
                                  <span>Stock: {formatUnitPlural(prod.unit, stock)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Add / Stepper Actions Column - single horizontal line on all screens */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 shrink-0 flex-nowrap"
                          >
                            {stock <= 0 ? (
                              <div
                                className="h-7.5 px-2.5 rounded-lg text-xs font-bold gap-1 inline-flex items-center justify-center bg-destructive/10 text-destructive border border-destructive/30 whitespace-nowrap shrink-0 shadow-2xs select-none"
                              >
                                <Ban className="size-3.5" />
                                <span>Out of Stock</span>
                              </div>
                            ) : (
                              <>
                                {/* Tablet/Unit Control (if packSize > 1) */}
                                {packSize > 1 && (
                                  unitQty > 0 ? (
                                    /* Compact Active Stepper when in cart */
                                    <div className="flex items-center rounded-lg border border-primary/60 bg-primary/10 shadow-2xs overflow-hidden h-7.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDropdownDecrement(prod, 'UNIT')}
                                        className="size-7 rounded-none text-primary hover:bg-primary/20 font-bold shrink-0 cursor-pointer"
                                        title="Decrease unit quantity (-1)"
                                      >
                                        <Minus className="size-3" />
                                      </Button>
                                      <DraftQuantityInput
                                        value={unitQty}
                                        min={1}
                                        max={unitsAddable}
                                        onChange={(val) => handleDropdownSetQuantity(prod, 'UNIT', val)}
                                        className="h-7.5 w-9 text-center font-extrabold text-xs text-primary bg-card border-0 border-x border-primary/30 rounded-none px-0.5 focus-visible:ring-0"
                                        title="Type unit quantity"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={unitQty >= unitsAddable}
                                        onClick={() => handleDropdownIncrement(prod, 'UNIT')}
                                        className="size-7 rounded-none text-primary hover:bg-primary/20 font-bold shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={unitQty >= unitsAddable ? `All ${totalAvailableUnits} units allocated in cart` : "Increase unit quantity (+1)"}
                                      >
                                        <Plus className="size-3" />
                                      </Button>
                                      <span className="text-[10px] font-bold text-primary px-1.5 whitespace-nowrap">
                                        Unit
                                      </span>
                                    </div>
                                  ) : unitsAddable <= 0 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="h-7.5 px-2.5 text-xs font-semibold gap-1 opacity-50 cursor-not-allowed border-border/60 whitespace-nowrap shrink-0"
                                      title={`All ${totalAvailableUnits} units allocated in cart`}
                                    >
                                      <span>Unit (Max in Cart)</span>
                                    </Button>
                                  ) : (
                                    /* Clean Add Button (Single + icon only) */
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleDropdownIncrement(prod, 'UNIT')}
                                      className="h-7.5 px-2.5 text-xs font-bold gap-1 shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                                      title={`Add 1 Unit (${singlePrice.toFixed(0)} PKR)`}
                                    >
                                      <Plus className="size-3.5" />
                                      <span>Unit ({singlePrice.toFixed(0)} PKR)</span>
                                    </Button>
                                  )
                                )}

                                {/* Box / Main Unit Control */}
                                {packSize > 1 ? (
                                  boxQty > 0 ? (
                                    /* Compact Active Box Stepper when in cart */
                                    <div className="flex items-center rounded-lg border border-border/80 bg-muted/60 shadow-2xs overflow-hidden h-7.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDropdownDecrement(prod, 'BOX')}
                                        className="size-7 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted font-bold shrink-0 cursor-pointer"
                                        title="Decrease box quantity (-1)"
                                      >
                                        <Minus className="size-3" />
                                      </Button>
                                      <DraftQuantityInput
                                        value={boxQty}
                                        min={1}
                                        max={boxesAddable}
                                        onChange={(val) => handleDropdownSetQuantity(prod, 'BOX', val)}
                                        className="h-7.5 w-9 text-center font-bold text-xs text-foreground bg-card border-0 border-x border-border/60 rounded-none px-0.5 focus-visible:ring-0"
                                        title="Type box quantity"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={boxQty >= boxesAddable}
                                        onClick={() => handleDropdownIncrement(prod, 'BOX')}
                                        className="size-7 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted font-bold shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={
                                          boxQty >= boxesAddable
                                            ? remainingUnits < packSize
                                              ? `Cannot add full box: only ${remainingUnits} loose units remaining in stock`
                                              : 'Max boxes in cart'
                                            : "Increase box quantity (+1)"
                                        }
                                      >
                                        <Plus className="size-3" />
                                      </Button>
                                      <span className="text-[10px] font-semibold text-muted-foreground px-1.5 whitespace-nowrap">
                                        Box
                                      </span>
                                    </div>
                                  ) : boxesAddable <= 0 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="h-7.5 px-2.5 text-xs font-semibold gap-1 opacity-50 cursor-not-allowed border-border/60 whitespace-nowrap shrink-0"
                                      title={
                                        remainingUnits < packSize
                                          ? `Cannot add full box: only ${remainingUnits} loose units remaining in stock`
                                          : 'Max boxes in cart'
                                      }
                                    >
                                      <span>Box (Max in Cart)</span>
                                    </Button>
                                  ) : (
                                    /* Clean Box Add Button (Single + icon only) */
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDropdownIncrement(prod, 'BOX')}
                                      className="h-7.5 px-2.5 text-xs font-semibold gap-1 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60 whitespace-nowrap shrink-0 cursor-pointer"
                                      title={`Add full Box (${boxPrice.toFixed(0)} PKR)`}
                                    >
                                      <Plus className="size-3.5" />
                                      <span>Box ({boxPrice.toFixed(0)} PKR)</span>
                                    </Button>
                                  )
                                ) : (
                                  /* Single-Unit Item (Syrups, Injections, Drops, etc.) */
                                  boxQty > 0 ? (
                                    <div className="flex items-center rounded-lg border border-primary/60 bg-primary/10 shadow-2xs overflow-hidden h-7.5 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDropdownDecrement(prod, 'BOX')}
                                        className="size-7 rounded-none text-primary hover:bg-primary/20 font-bold shrink-0 cursor-pointer"
                                        title={`Decrease ${prod.unit} quantity (-1)`}
                                      >
                                        <Minus className="size-3" />
                                      </Button>
                                      <DraftQuantityInput
                                        value={boxQty}
                                        min={1}
                                        max={boxesAddable}
                                        onChange={(val) => handleDropdownSetQuantity(prod, 'BOX', val)}
                                        className="h-7.5 w-9 text-center font-extrabold text-xs text-primary bg-card border-0 border-x border-primary/30 rounded-none px-0.5 focus-visible:ring-0"
                                        title={`Type ${prod.unit} quantity`}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={boxQty >= boxesAddable}
                                        onClick={() => handleDropdownIncrement(prod, 'BOX')}
                                        className="size-7 rounded-none text-primary hover:bg-primary/20 font-bold shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={boxQty >= boxesAddable ? `All ${totalAvailableUnits} ${prod.unit}s allocated in cart` : `Increase ${prod.unit} quantity (+1)`}
                                      >
                                        <Plus className="size-3" />
                                      </Button>
                                      <span className="text-[10px] font-bold text-primary px-1.5 whitespace-nowrap">
                                        {prod.unit}
                                      </span>
                                    </div>
                                  ) : boxesAddable <= 0 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="h-7.5 px-2.5 text-xs font-semibold gap-1 opacity-50 cursor-not-allowed border-border/60 whitespace-nowrap shrink-0"
                                      title={`All ${totalAvailableUnits} ${prod.unit}s allocated in cart`}
                                    >
                                      <span>{prod.unit} (Max in Cart)</span>
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleDropdownIncrement(prod, 'BOX')}
                                      className="h-7.5 px-2.5 text-xs font-bold gap-1 shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
                                      title={`Add 1 ${prod.unit} (${boxPrice.toFixed(0)} PKR)`}
                                    >
                                      <Plus className="size-3.5" />
                                      <span>{prod.unit} ({boxPrice.toFixed(0)} PKR)</span>
                                    </Button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Running Cart Section */}
          <PosCartSection
            cart={cart}
            onClearCart={clearCart}
            onRemoveItem={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onUpdateUnitPrice={updateUnitPrice}
            onUpdateDiscount={updateItemDiscount}
            onToggleUnitType={toggleUnitType}
            onOpenPackSizeModal={handleOpenPackSizeModal}
          />
        </div>

        {/* Right Column: Checkout Sidebar (4-5 cols) */}
        <PosPaymentSidebar
          cart={cart}
          totals={totals}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
          customerSearchQuery={customerSearchQuery}
          onCustomerSearchChange={setCustomerSearchQuery}
          customerSearchResults={customerSearchResults}
          isCustomerSearching={isCustomerSearching}
          isCustomerDropdownOpen={isCustomerDropdownOpen}
          onCustomerDropdownOpenChange={setIsCustomerDropdownOpen}
          onClearCustomerSearch={() => {
            setCustomerSearchQuery('');
            setCustomerSearchResults([]);
            setIsCustomerDropdownOpen(false);
          }}
          customerSearchRef={customerSearchRef}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          onOpenAddCustomerModal={() => setIsAddCustomerModalOpen(true)}
          hasControlledMedicine={hasControlledMedicine}
          isSelfDoctor={isSelfDoctor}
          onIsSelfDoctorChange={setIsSelfDoctor}
          doctorName={doctorName}
          onDoctorNameChange={setDoctorName}
          doctorInputRef={doctorInputRef}
          overallDiscount={overallDiscount}
          onOverallDiscountChange={setOverallDiscount}
          overallDiscountType={overallDiscountType}
          onOverallDiscountTypeChange={setOverallDiscountType}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          cashTendered={cashTendered}
          onCashTenderedChange={setCashTendered}
          cashInputRef={cashInputRef}
          tenderedNum={tenderedNum}
          changeDue={changeDue}
          isSubmitting={isSubmitting}
          onCheckout={handleCheckout}
        />
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
        isOnline={isOnline}
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
      <PosPackSizeModal
        isOpen={packSizeModal.isOpen}
        onOpenChange={(open) => setPackSizeModal((prev) => ({ ...prev, isOpen: open }))}
        productName={packSizeModal.productName}
        packSize={packSizeModal.packSize}
        onPackSizeChange={(size) => setPackSizeModal((prev) => ({ ...prev, packSize: size }))}
        onSave={handleSavePackSize}
        canEdit={Boolean(isOwner || isManager || canManageInventory)}
      />

      {/* Link Unregistered QR Code / Barcode to Medicine Dialog */}
      <PosLinkBarcodeModal
        isOpen={linkCodeModal.isOpen}
        onOpenChange={(open) => setLinkCodeModal((prev) => ({ ...prev, isOpen: open }))}
        scannedCode={linkCodeModal.scannedCode}
        parsedData={linkCodeModal.parsedData}
        query={linkCodeModal.query}
        onQueryChange={(query) => setLinkCodeModal((prev) => ({ ...prev, query }))}
        results={linkCodeModal.results}
        isSearching={linkCodeModal.isSearching}
        isLinking={linkCodeModal.isLinking}
        onLinkProduct={handleLinkCodeToProduct}
      />
    </div>
  );
}

export const PosTerminal = POSTerminal;

