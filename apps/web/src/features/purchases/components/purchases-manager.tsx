'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { purchasesApi } from '../services/purchases-api';
import {
  usePurchases,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
} from '../hooks/use-purchases-queries';
import { suppliersApi, SupplierData } from '@/features/suppliers/services/suppliers-api';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Truck,
  Plus,
  Search,
  Package,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2,
  Box,
  ArrowRight,
  Eye,
  Layers,
  FileCheck,
  Sparkles,
  Camera,
  Trash2,
} from 'lucide-react';
import { storesApi, StoreData } from '@/lib/stores-api';
import { useStore } from '@/context/store-context';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { ReorderSuggestionsView } from './reorder-suggestions-view';
import { OcrInvoiceModal } from './ocr-invoice-modal';

export function PurchasesManager() {
  const { user } = useAuth();
  const { stores, activeStoreId, isAllStores } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingOrderId, setFetchingOrderId] = useState<string | null>(null);
  const activeReceiveReqRef = React.useRef<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [activeView, setActiveView] = useState<'orders' | 'suggestions'>('orders');

  const createOrderMutation = useCreatePurchaseOrder();
  const receiveOrderMutation = useReceivePurchaseOrder();

  const effectiveStoreId = selectedStoreId || (!isAllStores && activeStoreId ? activeStoreId : undefined);
  const {
    data: orders = [],
    isLoading: loading,
    isError,
    error,
    refetch: fetchOrders,
  } = usePurchases({
    storeId: effectiveStoreId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  // Form State for PO Creation
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poStoreId, setPoStoreId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ id: string; productId: string; expectedQuantity: number; unitCost: number }[]>([]);

  // Receive Form State
  const [receiveItems, setReceiveItems] = useState<{
    purchaseItemId: string;
    productName: string;
    expectedQuantity: number;
    receivedQuantity: number;
    batchNumber: string;
    expiryDate: string;
    sellPrice: number;
  }[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'suggestions' || tab === 'reorder' || tab === 'smart-reorder') {
        setActiveView('suggestions');
      }
    }
  }, []);

  const loadCreateDependencies = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        suppliersApi.getSuppliers(),
        productsApi.getProducts(),
      ]);
      if (supRes && (supRes.success || Array.isArray(supRes.data))) {
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : supRes.data || []);
      }
      if (prodRes) {
        const prodList = Array.isArray(prodRes.data)
          ? prodRes.data
          : Array.isArray(prodRes)
          ? prodRes
          : [];
        setProducts(prodList);
      }
    } catch (err: any) {
      console.error('Dependencies fetch error:', err);
    }
  };

  const handleOpenCreateModal = () => {
    loadCreateDependencies();
    setSelectedSupplierId('');
    setPoStoreId(effectiveStoreId || stores[0]?.id || '');
    setPoNotes('');
    setPoItems([]);
    setIsCreateModalOpen(true);
  };

  const handleOpenOcrModal = async () => {
    await loadCreateDependencies();
    setIsOcrModalOpen(true);
  };

  const handleConfirmOcrPo = (data: {
    supplierId: string;
    storeId: string;
    notes: string;
    items: Array<{
      productId: string;
      expectedQuantity: number;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
    }>;
  }) => {
    if (data.supplierId) {
      setSelectedSupplierId(data.supplierId);
    }
    if (data.storeId) {
      setPoStoreId(data.storeId);
      setSelectedStoreId(data.storeId);
    } else {
      setPoStoreId(effectiveStoreId || stores[0]?.id || '');
    }
    setPoNotes(data.notes || '');
    setPoItems(
      data.items.map((i) => ({
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
        productId: i.productId,
        expectedQuantity: i.expectedQuantity,
        unitCost: i.unitCost,
      })),
    );
    setIsCreateModalOpen(true);
  };

  const handleDirectCreatePoFromOcr = async (data: {
    supplierId: string;
    storeId: string;
    notes: string;
    items: Array<{
      productId: string;
      expectedQuantity: number;
      unitCost: number;
    }>;
  }) => {
    const res = await createOrderMutation.mutateAsync({
      storeId: data.storeId,
      supplierId: data.supplierId,
      notes: data.notes,
      items: data.items,
    });
    toast.success(res.message || 'Purchase Order created directly from invoice');
  };

  const handleConvertToPOFromSuggestion = async (data: {
    supplierId?: string;
    storeId?: string;
    items: { productId: string; productName: string; expectedQuantity: number; unitCost: number }[];
    notes?: string;
  }) => {
    await loadCreateDependencies();
    if (data.supplierId) {
      setSelectedSupplierId(data.supplierId);
    }
    if (data.storeId) {
      setPoStoreId(data.storeId);
    } else {
      setPoStoreId(effectiveStoreId || stores[0]?.id || '');
    }
    setPoNotes(data.notes || '');
    setPoItems(
      data.items.map((i) => ({
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
        productId: i.productId,
        expectedQuantity: i.expectedQuantity,
        unitCost: i.unitCost,
      })),
    );
    setIsCreateModalOpen(true);
  };

  const handleAddPoItem = () => {
    if (products.length === 0) {
      toast.error('No products available in catalog. Please check your inventory catalog.');
      return;
    }
    const existingIds = new Set(poItems.map((it) => it.productId));
    const nextProd = products.find((p) => !existingIds.has(p.id)) || products[0];
    setPoItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
        productId: nextProd.id,
        expectedQuantity: 10,
        unitCost: 100,
      },
    ]);
  };

  const handleRemovePoItem = (itemId: string) => {
    setPoItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier vendor');
      return;
    }
    const targetStoreId =
      poStoreId || selectedStoreId || (!isAllStores && activeStoreId ? activeStoreId : stores[0]?.id);
    if (!targetStoreId) {
      toast.error('Please select an active destination branch');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Please add at least one line item to this purchase order');
      return;
    }

    const invalidItem = poItems.find(
      (it) => !it.productId || (Number(it.expectedQuantity) || 0) <= 0 || (Number(it.unitCost) || 0) < 0,
    );
    if (invalidItem) {
      toast.error('Please ensure all line items have a selected product, quantity > 0, and valid unit cost');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOrderMutation.mutateAsync({
        storeId: targetStoreId,
        supplierId: selectedSupplierId,
        notes: poNotes,
        items: poItems.map((it) => ({
          productId: it.productId,
          expectedQuantity: Number(it.expectedQuantity),
          unitCost: Number(it.unitCost),
        })),
      });
      toast.success(res.message || 'Purchase Order created successfully');
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create purchase order'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceiveModal = async (orderId: string) => {
    if (fetchingOrderId) return;
    activeReceiveReqRef.current = orderId;
    setFetchingOrderId(orderId);
    try {
      const res = await purchasesApi.getPurchaseById(orderId);
      // Guard against race conditions if user switched orders
      if (activeReceiveReqRef.current !== orderId) return;

      if (res.success && res.data) {
        setSelectedOrder(res.data);
        const todayStr = new Date().toISOString().slice(0, 10);
        const nextYearStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const initialReceives = (res.data.purchaseItems || []).map((item: any) => ({
          purchaseItemId: item.id,
          productName: item.product?.name || 'Item',
          expectedQuantity: item.expectedQuantity - item.receivedQuantity,
          receivedQuantity: item.expectedQuantity - item.receivedQuantity,
          batchNumber: `BN-${Math.floor(100000 + Math.random() * 900000)}`,
          expiryDate: nextYearStr,
          sellPrice: Math.round(Number(item.unitCost) * 1.25),
        }));

        setReceiveItems(initialReceives);
        setIsReceiveModalOpen(true);
      }
    } catch (err: unknown) {
      if (activeReceiveReqRef.current === orderId) {
        toast.error(getErrorMessage(err, 'Failed to load purchase order details'));
      }
    } finally {
      if (activeReceiveReqRef.current === orderId) {
        setFetchingOrderId(null);
      }
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await receiveOrderMutation.mutateAsync({
        id: selectedOrder.id,
        data: {
          items: receiveItems.map((item) => ({
            purchaseItemId: item.purchaseItemId,
            receivedQuantity: Number(item.receivedQuantity),
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            sellPrice: Number(item.sellPrice),
          })),
        },
      });
      toast.success(res.message || 'Shipment received and batches updated!');
      setIsReceiveModalOpen(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to receive shipment'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge variant="success" className="text-micro font-semibold">RECEIVED</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning" className="text-micro font-semibold">PARTIAL</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-micro font-semibold">CANCELLED</Badge>;
      default:
        return <Badge variant="warning" className="text-micro font-semibold">PENDING</Badge>;
    }
  };

  const calculatedTotalCost = poItems.reduce(
    (acc, item) => acc + (Number(item.expectedQuantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );

  const totalOrderedUnits = poItems.reduce(
    (acc, item) => acc + (Number(item.expectedQuantity) || 0),
    0,
  );

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <PageHeader
        title={activeView === 'orders' ? 'Purchase Orders & Shipments' : 'Smart Reorder Suggestions'}
        description={
          activeView === 'orders'
            ? 'Create supplier orders, track incoming stock deliveries, and check-in inventory batches.'
            : 'Predictive inventory replenishment based on live sales velocity and supplier delivery lead times.'
        }
        icon={activeView === 'orders' ? Truck : Sparkles}
        actions={
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenOcrModal}
              className="h-9 px-3 gap-1.5 font-semibold text-xs bg-card hover:bg-muted border-border/80 text-foreground shadow-2xs justify-center cursor-pointer"
            >
              <Camera className="size-4 text-primary shrink-0" />
              <span className="sm:hidden">OCR Invoice</span>
              <span className="hidden sm:inline">OCR Invoice Assist</span>
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="h-9 px-3.5 gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs justify-center cursor-pointer"
            >
              <Plus className="size-4 shrink-0" />
              <span className="sm:hidden">Create Order</span>
              <span className="hidden sm:inline">Create Purchase Order</span>
            </Button>
          </div>
        }
      />

      {/* Navigation View Switcher */}
      <div className="border-b border-border pb-2">
        <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/60 rounded-xl w-max">
            <Button
              variant={activeView === 'orders' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('orders')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                activeView === 'orders'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="size-3.5 sm:size-4 shrink-0" />
              <span>Purchase Orders</span>
              <span className="hidden sm:inline">&amp; Shipments</span>
            </Button>
            <Button
              variant={activeView === 'suggestions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('suggestions')}
              className={`gap-1.5 font-semibold text-xs sm:text-sm h-8.5 rounded-lg shrink-0 cursor-pointer ${
                activeView === 'suggestions'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="size-3.5 sm:size-4 shrink-0" />
              <span>Smart Reorder</span>
              <span className="hidden sm:inline">Suggestions</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-md font-bold ml-1 ${
                  activeView === 'suggestions'
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-primary/10 text-primary border-primary/25'
                }`}
              >
                AI
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {activeView === 'suggestions' ? (
        <ReorderSuggestionsView onConvertToPO={handleConvertToPOFromSuggestion} />
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 scrollbar-none pb-1">
            <div className="flex items-center gap-1.5 w-max">
              {['ALL', 'PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs capitalize h-8 px-3 font-semibold shrink-0 rounded-lg cursor-pointer ${
                    statusFilter === st
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card hover:bg-muted border-border/80 text-foreground/80'
                  }`}
                >
                  {st.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Content Cards */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-3 bg-card border border-destructive/20 rounded-xl">
              <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertCircle className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Failed to load purchase orders</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {getErrorMessage(error, 'An error occurred while fetching purchase orders.')}
              </p>
              <Button size="sm" variant="outline" onClick={() => void fetchOrders()} className="gap-1.5 text-xs">
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Box}
              title={statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} Orders` : 'No Purchase Orders Found'}
              description={
                statusFilter !== 'ALL'
                  ? `No purchase orders found with status "${statusFilter}".`
                  : 'Create a new purchase order to start tracking shipments from suppliers.'
              }
              action={
                <Button
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs h-9 px-4 cursor-pointer"
                >
                  <Plus className="size-4" /> Create Purchase Order
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {orders.map((po: any) => (
                <Card
                  key={po.id}
                  className="hover:border-primary/50 transition-colors shadow-xs"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-primary">{po.orderNumber}</span>
                        {getStatusBadge(po.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(po.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Building2 className="size-3.5 text-primary" /> {po.supplierName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="size-3.5" /> {po.itemCount} Product Items
                        </span>
                        <span className="flex items-center gap-1 font-bold text-foreground tabular-nums">
                          <DollarSign className="size-3.5 text-success" /> {formatCurrency(po.totalCost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          disabled={Boolean(fetchingOrderId)}
                          onClick={() => handleOpenReceiveModal(po.id)}
                          className="gap-1.5 text-xs font-bold flex-1 sm:flex-initial h-8.5 justify-center cursor-pointer"
                        >
                          {fetchingOrderId === po.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileCheck className="size-3.5" />
                          )}
                          <span>Receive Stock</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={Boolean(fetchingOrderId)}
                        onClick={() => handleOpenReceiveModal(po.id)}
                        className="gap-1.5 text-xs font-semibold flex-1 sm:flex-initial h-8.5 justify-center bg-card hover:bg-muted border-border/80 text-foreground cursor-pointer"
                      >
                        {fetchingOrderId === po.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                        <span>Details</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Purchase Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl border border-border bg-background shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 pr-12 sm:pr-14 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Truck className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Create Purchase Order
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Draft an order to your distributor before stock delivery arrives.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateOrderSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
              {/* Quick OCR Assist Banner */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-primary/25 bg-primary/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 text-xs">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Camera className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground block">
                      Have a printed distributor invoice or delivery challan?
                    </span>
                    <p className="text-micro text-muted-foreground">
                      Use <strong>Invoice OCR Assist</strong> to extract quantities, batch numbers, and prices with zero typing.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsOcrModalOpen(true);
                  }}
                  className="w-full sm:w-auto h-8 text-xs font-semibold shrink-0 bg-card border-border/80 text-foreground hover:bg-muted gap-1.5 cursor-pointer justify-center shadow-2xs"
                >
                  <Sparkles className="size-3 text-primary" />
                  <span>Scan Bill with OCR</span>
                </Button>
              </div>

              {/* Order Metadata Grid */}
              <div className="space-y-2">
                <div className={`grid grid-cols-1 ${stores.length > 1 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 sm:gap-4`}>
                  {stores.length > 1 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span>Destination Branch *</span>
                      </Label>
                      <Select value={poStoreId} onValueChange={setPoStoreId}>
                        <SelectTrigger className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Select destination branch..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span>Select Supplier Vendor *</span>
                    </Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="Select supplier vendor..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {suppliers.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id} className="text-xs">
                            <span className="font-medium text-foreground">{sup.name}</span>
                            {sup.leadTimeDays ? (
                              <span className="text-micro text-muted-foreground ml-1.5 font-mono">
                                ({sup.leadTimeDays}d lead)
                              </span>
                            ) : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Order Notes (Optional)</Label>
                    <Input
                      placeholder="e.g., Urgent delivery requested"
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      className="text-xs h-9 bg-background w-full"
                    />
                  </div>
                </div>

                {/* Selected Supplier Info Strip */}
                {selectedSupplier && (
                  <div className="flex items-center gap-2 text-micro text-muted-foreground px-1 pt-0.5">
                    <span>Distributor: <strong className="text-foreground">{selectedSupplier.name}</strong></span>
                    {selectedSupplier.contactPhone && (
                      <>
                        <span className="text-border">•</span>
                        <span>Phone: <strong className="text-foreground font-mono">{selectedSupplier.contactPhone}</strong></span>
                      </>
                    )}
                    {selectedSupplier.leadTimeDays ? (
                      <>
                        <span className="text-border">•</span>
                        <span>Lead Time: <strong className="text-foreground">{selectedSupplier.leadTimeDays} days</strong></span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Line Items Section */}
              <div className="space-y-2.5 border-t border-border/60 pt-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Order Line Items ({poItems.length})
                    </Label>
                    {poItems.length > 0 && (
                      <Badge variant="outline" className="text-micro py-0 px-1.5 font-mono font-medium">
                        {totalOrderedUnits} total units
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPoItem}
                    className="gap-1.5 text-xs h-7.5 font-semibold cursor-pointer"
                  >
                    <Plus className="size-3 text-primary" /> Add Product
                  </Button>
                </div>

                {poItems.length === 0 ? (
                  <div className="p-7 border border-dashed border-border/80 rounded-2xl bg-muted/10 text-center flex flex-col items-center justify-center gap-2.5">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                      <Package className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">No Products in this Order</p>
                      <p className="text-micro text-muted-foreground max-w-sm">
                        Add items from your product catalog or automatically extract them from a supplier bill.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPoItem}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Product</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          setIsOcrModalOpen(true);
                        }}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer bg-card hover:bg-muted"
                      >
                        <Camera className="size-3.5 text-primary" />
                        <span>Scan Bill with OCR</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Desktop Columns Header */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 py-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="col-span-5">Product</div>
                      <div className="col-span-2 text-center">Expected Qty</div>
                      <div className="col-span-2 text-right">Unit Cost (PKR)</div>
                      <div className="col-span-2 text-right">Subtotal</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {poItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 sm:p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs space-y-2.5 sm:space-y-0 transition-colors hover:border-primary/40"
                        >
                          <div className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 sm:items-center">
                            {/* Product Selector */}
                            <div className="sm:col-span-5 min-w-0">
                              <span className="sm:hidden text-micro text-muted-foreground block mb-1 font-medium">
                                Product #{idx + 1}
                              </span>
                              <Select
                                value={item.productId}
                                onValueChange={(val) => {
                                  setPoItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, productId: val } : it)),
                                  );
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background w-full">
                                  <SelectValue placeholder="Select product..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                      <div className="flex items-center justify-between gap-2 w-full">
                                        <span className="font-medium text-foreground truncate">{p.name}</span>
                                        <span className="text-micro text-muted-foreground font-mono shrink-0">
                                          ({p.unit})
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Expected Quantity */}
                            <div className="sm:col-span-2">
                              <span className="sm:hidden text-micro text-muted-foreground block mb-1 font-medium">Qty</span>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={item.expectedQuantity || ''}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value, 10) || 0);
                                  setPoItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, expectedQuantity: val } : it)),
                                  );
                                }}
                                className="h-9 text-xs font-bold text-center bg-background"
                              />
                            </div>

                            {/* Unit Cost */}
                            <div className="sm:col-span-2">
                              <span className="sm:hidden text-micro text-muted-foreground block mb-1 font-medium">Unit Cost</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Cost"
                                value={item.unitCost === 0 ? '0' : item.unitCost || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  setPoItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, unitCost: val } : it)),
                                  );
                                }}
                                className="h-9 text-xs font-bold text-right bg-background"
                              />
                            </div>

                            {/* Subtotal */}
                            <div className="sm:col-span-2 flex items-center justify-between sm:justify-end text-right">
                              <span className="sm:hidden text-micro text-muted-foreground font-medium">Subtotal</span>
                              <span className="text-xs font-mono font-bold text-foreground">
                                {formatCurrency((item.expectedQuantity || 0) * (item.unitCost || 0))}
                              </span>
                            </div>

                            {/* Delete Action */}
                            <div className="sm:col-span-1 flex items-center justify-end sm:justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePoItem(item.id)}
                                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                title="Remove line item"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Cost & Quantity Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-4 rounded-xl bg-muted/30 border border-border/80 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    Items: <strong className="text-foreground font-semibold">{poItems.length}</strong>
                  </span>
                  <span className="text-border">•</span>
                  <span>
                    Units: <strong className="text-foreground font-semibold">{totalOrderedUnits}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <span className="font-semibold text-muted-foreground text-xs">Estimated Order Total:</span>
                  <strong className="text-primary text-base font-bold tabular-nums">
                    {formatCurrency(calculatedTotalCost)}
                  </strong>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
                className="h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || poItems.length === 0 || !selectedSupplierId}
                className="h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                Confirm &amp; Submit Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Check-in Modal */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-2xl max-h-[88dvh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-xl">
          <DialogHeader className="p-4 sm:p-5 pr-12 sm:pr-14 border-b border-border/60 bg-muted/20 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-success">
              <FileCheck className="size-5" />
              Receive Shipment #{selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm physical stock delivery quantities, assign batch numbers, and set expiry dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiveSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Receiving Line Items
              </Label>

              {receiveItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-foreground">{item.productName}</span>
                    <span className="text-muted-foreground text-micro">
                      Expected: <strong>{item.expectedQuantity}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <Label className="text-micro text-muted-foreground">Received Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.receivedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceiveItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, receivedQuantity: val } : it)),
                          );
                        }}
                        className="h-8 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-micro text-muted-foreground">Batch Number</Label>
                      <Input
                        value={item.batchNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReceiveItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, batchNumber: val } : it)),
                          );
                        }}
                        required
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-micro text-muted-foreground">Expiry Date</Label>
                      <Input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReceiveItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, expiryDate: val } : it)),
                          );
                        }}
                        required
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-micro text-muted-foreground">Selling Price (PKR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.sellPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceiveItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, sellPrice: val } : it)),
                          );
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsReceiveModalOpen(false)}
                disabled={submitting}
                className="h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              {selectedOrder?.status !== 'RECEIVED' && selectedOrder?.status !== 'CANCELLED' && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm Stock Arrival
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Smart OCR Invoice Assist Modal */}
      <OcrInvoiceModal
        open={isOcrModalOpen}
        onOpenChange={setIsOcrModalOpen}
        products={products}
        suppliers={suppliers}
        defaultStoreId={(!isAllStores && activeStoreId) ? activeStoreId : (stores[0]?.id || '')}
        onConfirmPo={handleConfirmOcrPo}
        onDirectCreatePo={handleDirectCreatePoFromOcr}
      />
    </div>
  );
}
