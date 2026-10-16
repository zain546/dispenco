'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Truck, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { StockTransfer, transfersApi } from '../services/transfers-api';
import { productsApi, BatchData } from '@/features/inventory/services/products-api';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface DispatchTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transfer: StockTransfer | null;
}

interface ItemDispatchAllocation {
  itemId: string;
  productId: string;
  batchId: string;
  quantitySent: number;
}

export function DispatchTransferModal({
  isOpen,
  onClose,
  onSuccess,
  transfer,
}: DispatchTransferModalProps) {
  const [allocations, setAllocations] = useState<ItemDispatchAllocation[]>([]);
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, BatchData[]>>({});
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && transfer) {
      setDispatchNotes('');
      setLoadingBatches(true);

      // Initialize default allocations
      const initialAllocations: ItemDispatchAllocation[] = transfer.items.map((item) => ({
        itemId: item.id,
        productId: item.productId,
        batchId: '',
        quantitySent: item.quantityRequested,
      }));
      setAllocations(initialAllocations);

      // Fetch source store batches for each unique product in this transfer
      const uniqueProductIds = Array.from(new Set(transfer.items.map((i) => i.productId)));

      Promise.all(
        uniqueProductIds.map(async (productId) => {
          try {
            const res = await productsApi.getProductById(productId, transfer.sourceStoreId);
            return { productId, batches: res?.data?.batches || [] };
          } catch {
            return { productId, batches: [] };
          }
        })
      )
        .then((results) => {
          const map: Record<string, BatchData[]> = {};
          results.forEach((r) => {
            // Sort FEFO (earliest expiry first, only batches with stock remaining)
            map[r.productId] = (r.batches || [])
              .filter((b: BatchData) => b.quantityRemaining > 0)
              .sort(
                (a: BatchData, b: BatchData) =>
                  new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
              );
          });
          setBatchesByProduct(map);

          // Auto-select earliest expiring batch for each item if available
          setAllocations((prev) =>
            prev.map((a) => {
              const available = map[a.productId];
              if (available && available.length > 0) {
                return { ...a, batchId: available[0].id };
              }
              return a;
            })
          );
        })
        .finally(() => setLoadingBatches(false));
    }
  }, [isOpen, transfer]);

  if (!transfer) return null;

  const handleAllocationChange = (
    itemId: string,
    field: 'batchId' | 'quantitySent',
    value: string | number
  ) => {
    setAllocations((prev) =>
      prev.map((a) => (a.itemId === itemId ? { ...a, [field]: value } : a))
    );
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify all items have an allocated batch
    for (const alloc of allocations) {
      if (!alloc.batchId) {
        toast.error('Please assign an active source batch for every requested medicine');
        return;
      }

      const availableBatches = batchesByProduct[alloc.productId] || [];
      const batch = availableBatches.find((b) => b.id === alloc.batchId);
      if (!batch) {
        toast.error('Selected batch is not valid or has no available stock');
        return;
      }

      if (alloc.quantitySent <= 0) {
        toast.error('Quantity to dispatch must be greater than zero');
        return;
      }

      if (batch.quantityRemaining < alloc.quantitySent) {
        toast.error(
          `Batch ${batch.batchNumber} has only ${batch.quantityRemaining} units remaining. Cannot dispatch ${alloc.quantitySent} units.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await transfersApi.dispatchTransfer(transfer.id, {
        items: allocations.map((a) => ({
          itemId: a.itemId,
          batchId: a.batchId,
          quantitySent: Number(a.quantitySent),
        })),
        notes: dispatchNotes.trim() || undefined,
      });

      toast.success(res.message || 'Stock dispatched successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to dispatch transfer', {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Truck className="size-5" />
            <DialogTitle className="text-lg">
              Dispatch Transfer #{transfer.transferNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Fulfill and ship stock from <strong>{transfer.sourceStore.name}</strong> to{' '}
            <strong>{transfer.targetStore.name}</strong>. Stock will be deducted from your selected batches.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDispatch} className="space-y-4 pt-2">
          {/* Items Allocation Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Batch Allocation (FEFO Recommended)
              </Label>
              {loadingBatches && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin text-primary" /> Loading branch batches...
                </span>
              )}
            </div>

            <div className="space-y-3">
              {transfer.items.map((item) => {
                const allocation = allocations.find((a) => a.itemId === item.id);
                const availableBatches = batchesByProduct[item.productId] || [];
                const selectedBatch = availableBatches.find((b) => b.id === allocation?.batchId);

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-card border border-border/80 space-y-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.product.genericName || item.product.category} • Requested:{' '}
                          <span className="font-bold text-foreground">
                            {item.quantityRequested} {item.product.unit}
                          </span>
                        </p>
                      </div>

                      {availableBatches.length === 0 && !loadingBatches && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertCircle className="size-3" /> No In-Stock Batches
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground font-medium">
                          Select Source Batch
                        </Label>
                        <Select
                          value={allocation?.batchId || ''}
                          onValueChange={(val) =>
                            handleAllocationChange(item.id, 'batchId', val)
                          }
                          disabled={availableBatches.length === 0}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Choose batch to dispatch" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBatches.map((b) => (
                              <SelectItem key={b.id} value={b.id} className="text-xs">
                                Batch #{b.batchNumber} (Exp: {formatDate(b.expiryDate)}) — {b.quantityRemaining} avail
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground font-medium">
                          Quantity to Dispatch
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={selectedBatch?.quantityRemaining || item.quantityRequested}
                            value={allocation?.quantitySent || item.quantityRequested}
                            onChange={(e) =>
                              handleAllocationChange(
                                item.id,
                                'quantitySent',
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="h-8 text-xs text-center font-bold"
                          />
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {item.product.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedBatch && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-primary" /> Expiry: {formatDate(selectedBatch.expiryDate)}
                        </span>
                        <span>
                          Remaining after dispatch:{' '}
                          <strong className="text-foreground">
                            {Math.max(0, selectedBatch.quantityRemaining - (allocation?.quantitySent || 0))} units
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="dispatch-notes" className="text-xs font-semibold text-foreground">
              Dispatch & Shipping Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="dispatch-notes"
              placeholder="e.g. Sent via courier rider / Delivery van #3"
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs h-8 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || loadingBatches}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Confirm & Dispatch Stock</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
