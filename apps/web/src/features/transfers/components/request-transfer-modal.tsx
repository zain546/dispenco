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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ArrowRightLeft, Loader2, Building2 } from 'lucide-react';
import { transfersApi } from '../services/transfers-api';
import { productsApi, ProductData } from '@/features/inventory/services/products-api';
import { useStore } from '@/context/store-context';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface RequestTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferItemDraft {
  productId: string;
  quantityRequested: number;
}

export function RequestTransferModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestTransferModalProps) {
  const { stores, activeStoreId, isAllStores } = useStore();
  const [sourceStoreId, setSourceStoreId] = useState<string>('');
  const [targetStoreId, setTargetStoreId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<TransferItemDraft[]>([
    { productId: '', quantityRequested: 1 },
  ]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default target store to active store if available
      if (activeStoreId && !isAllStores) {
        setTargetStoreId(activeStoreId);
        // Default source store to first other store
        const otherStore = stores.find((s) => s.id !== activeStoreId);
        if (otherStore) setSourceStoreId(otherStore.id);
      } else if (stores.length >= 2) {
        setTargetStoreId(stores[0].id);
        setSourceStoreId(stores[1].id);
      }

      // Load products catalog
      setLoadingProducts(true);
      productsApi
        .getProducts({ limit: 100 })
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setProducts(list);
        })
        .catch((err) => {
          toast.error('Failed to load products for transfer', {
            description: getErrorMessage(err),
          });
        })
        .finally(() => setLoadingProducts(false));
    }
  }, [isOpen, activeStoreId, isAllStores, stores]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { productId: '', quantityRequested: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof TransferItemDraft,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceStoreId) {
      toast.error('Please select the source branch to request stock from');
      return;
    }

    if (!targetStoreId) {
      toast.error('Please select the destination receiving branch');
      return;
    }

    if (sourceStoreId === targetStoreId) {
      toast.error('Source and destination branches cannot be the same');
      return;
    }

    const validItems = items.filter(
      (item) => item.productId && item.quantityRequested > 0
    );

    if (validItems.length === 0) {
      toast.error('Please select at least one medicine and specify quantity');
      return;
    }

    try {
      setSubmitting(true);
      const res = await transfersApi.createTransferRequest({
        sourceStoreId,
        targetStoreId,
        notes: notes.trim() || undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantityRequested: Number(item.quantityRequested),
        })),
      });

      toast.success(res.message || 'Transfer request submitted successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to create transfer request', {
        description: getErrorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ArrowRightLeft className="size-5" />
            <DialogTitle className="text-lg">Request Stock from Another Branch</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Request inventory items to be transferred from another pharmacy branch into your local stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Branch Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-3.5 text-primary" /> Source Branch (Fulfiller)
              </Label>
              <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select source store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      disabled={s.id === targetStoreId}
                      className="text-xs"
                    >
                      {s.name} {s.id === targetStoreId ? '(Selected as Destination)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-3.5 text-primary" /> Destination Branch (Receiver)
              </Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select destination store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      disabled={s.id === sourceStoreId}
                      className="text-xs"
                    >
                      {s.name} {s.id === sourceStoreId ? '(Selected as Source)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requested Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Medicines & Quantities
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs px-2 gap-1"
              >
                <Plus className="size-3" /> Add Medicine
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-md bg-card border border-border/70 text-xs"
                >
                  <div className="flex-1">
                    <Select
                      value={item.productId}
                      onValueChange={(val) => handleItemChange(index, 'productId', val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={loadingProducts ? 'Loading medicines...' : 'Select medicine'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} {p.genericName ? `(${p.genericName})` : ''} - {p.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantityRequested}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'quantityRequested',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="h-8 text-xs text-center"
                    />
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="transfer-notes" className="text-xs font-semibold text-foreground">
              Transfer Notes / Urgent Request Reason <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="transfer-notes"
              placeholder="e.g. Counter out of stock, customer order pending"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={submitting}
              className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Submit Transfer Request</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
