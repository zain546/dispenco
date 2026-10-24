'use client';

import React, { useEffect, useState } from 'react';
import { purchasesApi } from '../services/purchases-api';
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
  Truck,
  Plus,
  Search,
  Package,
  Calendar,
  DollarSign,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Box,
  ArrowRight,
  Eye,
  Layers,
  FileCheck,
  Sparkles,
  Camera,
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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [activeView, setActiveView] = useState<'orders' | 'suggestions'>('orders');

  // Form State for PO Creation
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; expectedQuantity: number; unitCost: number }[]>([]);

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

  const fetchOrders = async (storeId?: string) => {
    try {
      setLoading(true);
      const res = await purchasesApi.getPurchases(
        storeId || selectedStoreId || undefined,
        statusFilter === 'ALL' ? undefined : statusFilter,
      );
      if (res.success) {
        setOrders(res.data || []);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load purchase orders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const effectiveStoreId = !isAllStores && activeStoreId ? activeStoreId : undefined;
    fetchOrders(effectiveStoreId);
  }, [statusFilter, activeStoreId, isAllStores]);

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
      setSelectedStoreId(data.storeId);
    }
    setPoNotes(data.notes || '');
    setPoItems(
      data.items.map((i) => ({
        productId: i.productId,
        expectedQuantity: i.expectedQuantity,
        unitCost: i.unitCost,
      })),
    );
    setIsCreateModalOpen(true);
  };

  const handleConvertToPOFromSuggestion = async (data: {
    supplierId?: string;
    items: { productId: string; productName: string; expectedQuantity: number; unitCost: number }[];
    notes?: string;
  }) => {
    await loadCreateDependencies();
    if (data.supplierId) {
      setSelectedSupplierId(data.supplierId);
    }
    setPoNotes(data.notes || '');
    setPoItems(
      data.items.map((i) => ({
        productId: i.productId,
        expectedQuantity: i.expectedQuantity,
        unitCost: i.unitCost,
      })),
    );
    setIsCreateModalOpen(true);
  };

  const handleAddPoItem = () => {
    if (products.length === 0) {
      toast.error('No products available in catalog');
      return;
    }
    const firstProd = products[0];
    setPoItems((prev) => [
      ...prev,
      { productId: firstProd.id, expectedQuantity: 10, unitCost: 100 },
    ]);
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    const targetStoreId = selectedStoreId || (!isAllStores && activeStoreId ? activeStoreId : stores[0]?.id);
    if (!targetStoreId) {
      toast.error('Please select an active store branch');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasesApi.createPurchaseOrder({
        storeId: targetStoreId,
        supplierId: selectedSupplierId,
        notes: poNotes,
        items: poItems,
      });
      toast.success(res.message || 'Purchase Order created successfully');
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create purchase order'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceiveModal = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await purchasesApi.getPurchaseById(orderId);
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
      toast.error(getErrorMessage(err, 'Failed to load purchase order details'));
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await purchasesApi.receivePurchaseOrder(selectedOrder.id, {
        items: receiveItems.map((item) => ({
          purchaseItemId: item.purchaseItemId,
          receivedQuantity: Number(item.receivedQuantity),
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          sellPrice: Number(item.sellPrice),
        })),
      });
      toast.success(res.message || 'Shipment received and batches updated!');
      setIsReceiveModalOpen(false);
      fetchOrders();
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
    (acc, item) => acc + item.expectedQuantity * item.unitCost,
    0,
  );

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
              {orders.map((po) => (
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
                          onClick={() => handleOpenReceiveModal(po.id)}
                          className="gap-1.5 text-xs font-bold flex-1 sm:flex-initial h-8.5 justify-center cursor-pointer"
                        >
                          <FileCheck className="size-3.5" /> Receive Stock
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReceiveModal(po.id)}
                        className="gap-1.5 text-xs font-semibold flex-1 sm:flex-initial h-8.5 justify-center bg-card hover:bg-muted border-border/80 text-foreground cursor-pointer"
                      >
                        <Eye className="size-3.5" /> Details
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
        <DialogContent className="w-[calc(100vw-20px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl p-4 sm:p-6 pr-10 sm:pr-12">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="size-5 text-primary" /> Create Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Draft an order to your distributor before stock delivery arrives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrderSubmit} className="space-y-4 py-2">
            {/* Quick OCR Assist Banner */}
            <div className="p-3 rounded-lg border border-primary/25 bg-primary/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Camera className="size-4 text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Have a distributor bill? Use <strong>Smart OCR Assist</strong> to extract & match items automatically.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsOcrModalOpen(true);
                }}
                className="h-7 text-xs font-bold shrink-0 bg-card border-border/80 text-foreground hover:bg-muted gap-1.5 cursor-pointer"
              >
                <Camera className="size-3 text-primary" />
                <span>Scan Bill</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Supplier Vendor *</Label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} ({sup.leadTimeDays}d lead time)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Order Notes (Optional)</Label>
                <Input
                  placeholder="e.g., Urgent delivery requested"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-2 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Order Line Items ({poItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPoItem}
                  className="gap-1 text-xs h-7"
                >
                  <Plus className="size-3" /> Add Product
                </Button>
              </div>

              {poItems.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground">
                  Click "+ Add Product" to include item quantities and cost prices in this purchase order.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, productId: val } : it)),
                          );
                        }}
                        className="flex-1 h-8 rounded border border-input bg-background px-2 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>

                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.expectedQuantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, expectedQuantity: val } : it)),
                            );
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="w-28">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Unit Cost"
                          value={item.unitCost}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it)),
                            );
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePoItem(idx)}
                        className="size-8 text-destructive shrink-0"
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Cost Display */}
            <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-bold">
              <span>Estimated Order Total:</span>
              <span className="text-primary text-base tabular-nums">{formatCurrency(calculatedTotalCost)}</span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs font-bold gap-1.5">
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                Confirm & Submit Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Check-in Modal */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="w-[calc(100vw-20px)] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-xl p-4 sm:p-6 pr-10 sm:pr-12">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-success">
              <FileCheck className="size-5" />
              Receive Shipment #{selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm physical stock delivery quantities, assign batch numbers, and set expiry dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 py-2">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Receiving Line Items
              </Label>

              {receiveItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-foreground">{item.productName}</span>
                    <span className="text-muted-foreground text-micro">
                      Expected: <strong>{item.expectedQuantity}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiveModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              {selectedOrder?.status !== 'RECEIVED' && selectedOrder?.status !== 'CANCELLED' && (
                <Button type="submit" disabled={submitting} className="text-xs font-bold gap-1.5">
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm Stock Arrival & Create Batches
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
      />
    </div>
  );
}
