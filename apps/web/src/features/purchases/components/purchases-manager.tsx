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
} from 'lucide-react';
import { storesApi, StoreData } from '@/lib/stores-api';
import { toast } from 'sonner';

export function PurchasesManager() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stores State
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

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
    } catch (err: any) {
      console.error('Fetch PO error:', err);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initStores = async () => {
      try {
        const storeRes = await storesApi.getStores();
        if (storeRes.success && storeRes.data && storeRes.data.length > 0) {
          setStores(storeRes.data);
          const firstStoreId = storeRes.data[0].id;
          setSelectedStoreId(firstStoreId);
          fetchOrders(firstStoreId);
        } else {
          fetchOrders();
        }
      } catch {
        fetchOrders();
      }
    };
    initStores();
  }, [statusFilter]);

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
    const activeStoreId = selectedStoreId || stores[0]?.id;
    if (!activeStoreId) {
      toast.error('Active store is missing');
      return;
    }
    if (poItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasesApi.createPurchaseOrder({
        storeId: activeStoreId,
        supplierId: selectedSupplierId,
        notes: poNotes,
        items: poItems,
      });
      toast.success(res.message || 'Purchase Order created successfully');
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create purchase order';
      toast.error(msg);
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
    } catch (err: any) {
      toast.error('Failed to load purchase order details');
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to receive shipment';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">RECEIVED</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">PARTIAL</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary" className="text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">PENDING</Badge>;
    }
  };

  const calculatedTotalCost = poItems.reduce(
    (acc, item) => acc + item.expectedQuantity * item.unitCost,
    0,
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="size-7 text-primary" /> Purchase Orders & Shipments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create supplier orders, track incoming stock deliveries, and check-in inventory batches.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} className="gap-2 font-bold shadow-xs sm:w-auto w-full">
          <Plus className="size-4" /> Create Purchase Order
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {['ALL', 'PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((st) => (
          <Button
            key={st}
            variant={statusFilter === st ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(st)}
            className="text-xs capitalize h-8 font-semibold shrink-0"
          >
            {st.toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Content Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Box className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Purchase Orders Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusFilter !== 'ALL'
              ? `No purchase orders found with status "${statusFilter}".`
              : 'Create a new purchase order to start tracking shipments from suppliers.'}
          </p>
          <Button variant="outline" size="sm" onClick={handleOpenCreateModal} className="gap-1.5 text-xs font-semibold">
            <Plus className="size-3.5" /> Create Purchase Order
          </Button>
        </Card>
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
                      {new Date(po.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="size-3.5 text-primary" /> {po.supplierName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="size-3.5" /> {po.itemCount} Product Items
                    </span>
                    <span className="flex items-center gap-1 font-bold text-foreground">
                      <DollarSign className="size-3.5 text-emerald-600" /> PKR {po.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenReceiveModal(po.id)}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FileCheck className="size-3.5" /> Receive Stock
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenReceiveModal(po.id)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="size-3.5" /> Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="size-5 text-primary" /> Create Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Draft an order to your distributor before stock delivery arrives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrderSubmit} className="space-y-4 py-2">
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
              <span className="text-primary text-base">PKR {calculatedTotalCost.toFixed(2)}</span>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600">
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
                    <span className="text-muted-foreground text-[11px]">
                      Expected: <strong>{item.expectedQuantity}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Received Qty</Label>
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
                      <Label className="text-[11px] text-muted-foreground">Batch Number</Label>
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
                      <Label className="text-[11px] text-muted-foreground">Expiry Date</Label>
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
                      <Label className="text-[11px] text-muted-foreground">Selling Price (PKR)</Label>
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
                <Button type="submit" disabled={submitting} className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm Stock Arrival & Create Batches
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
