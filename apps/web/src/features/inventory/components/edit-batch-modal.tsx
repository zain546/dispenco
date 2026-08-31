'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import { Loader2, Edit3, Save, TrendingUp, Truck, Building2, MapPin, Calendar, Clock } from 'lucide-react';
import { productsApi, type BatchData } from '../services/products-api';

interface EditBatchModalProps {
  batch: BatchData | null;
  unit?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchUpdated: () => void;
}

export function EditBatchModal({
  batch,
  unit = 'Units',
  open,
  onOpenChange,
  onBatchUpdated,
}: EditBatchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantityRemaining, setQuantityRemaining] = useState<number | ''>('');
  const [quantityReceived, setQuantityReceived] = useState<number | ''>('');
  const [rackNumber, setRackNumber] = useState('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [vendorName, setVendorName] = useState('');
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState('');
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState('');

  useEffect(() => {
    if (batch) {
      setBatchNumber(batch.batchNumber || '');

      const formatIsoDate = (dString?: string | null) => {
        if (!dString) return '';
        try {
          return new Date(dString).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setMfgDate(formatIsoDate(batch.mfgDate));
      setExpiryDate(formatIsoDate(batch.expiryDate));
      setQuantityRemaining(batch.quantityRemaining ?? 0);
      setQuantityReceived(batch.quantityReceived ?? 0);
      setRackNumber(batch.rackNumber || '');
      setCostPrice(batch.costPrice ?? 0);
      setSellPrice(batch.sellPrice ?? 0);
      setVendorName(batch.vendorName || '');
      setPurchaseInvoiceNumber(batch.purchaseInvoiceNumber || '');
      setPurchaseInvoiceDate(formatIsoDate(batch.purchaseInvoiceDate));
    }
  }, [batch]);

  // Live Gross Profit Margin Calculation
  const cost = Number(costPrice) || 0;
  const sell = Number(sellPrice) || 0;
  const profitPerUnit = sell - cost;
  const marginPercentage = sell > 0 ? ((profitPerUnit / sell) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    if (!batchNumber.trim()) {
      toast.error('Batch number is required');
      return;
    }

    if (!expiryDate) {
      toast.error('Expiry date is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await productsApi.updateBatch(batch.id, {
        batchNumber: batchNumber.trim(),
        mfgDate: mfgDate || undefined,
        expiryDate,
        quantityRemaining: Number(quantityRemaining) || 0,
        quantityReceived: Number(quantityReceived) || 0,
        rackNumber: rackNumber.trim() || undefined,
        costPrice: cost,
        sellPrice: sell,
        vendorName: vendorName.trim() || undefined,
        purchaseInvoiceNumber: purchaseInvoiceNumber.trim() || undefined,
        purchaseInvoiceDate: purchaseInvoiceDate || undefined,
      });

      toast.success(`Stock Batch ${batchNumber} updated successfully`);
      onOpenChange(false);
      onBatchUpdated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update stock batch';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/80 pr-6 sm:pr-8">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <Edit3 className="size-4 text-primary shrink-0" />
            <span>Edit Batch {batch ? `#${batch.batchNumber}` : 'Details'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Update expiry date, stock quantities, pricing, and shelf location for this batch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Section 1: Batch Identification & Dates */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Batch Tracking & Manufacturing/Expiry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="batchNumber" className="text-[11px] font-semibold">
                  Batch Number / Lot ID *
                </Label>
                <Input
                  id="batchNumber"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. BATCH-1024"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mfgDate" className="text-[11px] font-semibold">
                  Manufacturing Date
                </Label>
                <Input
                  id="mfgDate"
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="expiryDate" className="text-[11px] font-semibold">
                  Expiry Date *
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-8 text-xs font-semibold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Stock Quantities & Storage Location */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin className="size-3.5 text-primary" />
              <span>Stock Quantities & Storage Location</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="quantityRemaining" className="text-[11px] font-semibold">
                  Quantity Remaining ({unit.endsWith('s') ? unit : `${unit}s`}) *
                </Label>
                <Input
                  id="quantityRemaining"
                  type="number"
                  min="0"
                  value={quantityRemaining}
                  onChange={(e) =>
                    setQuantityRemaining(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="h-8 text-xs font-bold text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="quantityReceived" className="text-[11px] font-semibold">
                  Total Received ({unit.endsWith('s') ? unit : `${unit}s`})
                </Label>
                <Input
                  id="quantityReceived"
                  type="number"
                  min="0"
                  value={quantityReceived}
                  onChange={(e) =>
                    setQuantityReceived(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rackNumber" className="text-[11px] font-semibold">
                  Rack / Shelf Number
                </Label>
                <Input
                  id="rackNumber"
                  value={rackNumber}
                  onChange={(e) => setRackNumber(e.target.value)}
                  placeholder="e.g. Shelf B-4, Rack 2"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Profit Margin Analysis */}
          <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <TrendingUp className="size-3.5 text-primary" />
                <span>Pricing & Gross Margin Analysis</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  profitPerUnit >= 0
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}
              >
                Profit: PKR {profitPerUnit.toFixed(2)} / unit ({marginPercentage}%)
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="costPrice" className="text-[11px] font-semibold">
                  Purchase Cost Price (PKR)
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sellPrice" className="text-[11px] font-semibold">
                  Retail Price / Selling MRP (PKR)
                </Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-8 text-xs font-bold text-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Vendor & Purchase Invoice Log */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Truck className="size-3.5 text-primary" />
              <span>Vendor & Purchase Invoice Audit Log</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="vendorName" className="text-[11px] font-semibold">
                  Distributor / Vendor Name
                </Label>
                <Input
                  id="vendorName"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. Muller & Phipps, GSK"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="purchaseInvoiceNumber" className="text-[11px] font-semibold">
                  Invoice Number
                </Label>
                <Input
                  id="purchaseInvoiceNumber"
                  value={purchaseInvoiceNumber}
                  onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-981"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="purchaseInvoiceDate" className="text-[11px] font-semibold">
                  Invoice Date
                </Label>
                <Input
                  id="purchaseInvoiceDate"
                  type="date"
                  value={purchaseInvoiceDate}
                  onChange={(e) => setPurchaseInvoiceDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs h-9 gap-1.5 font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Batch...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Update Batch Details</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
