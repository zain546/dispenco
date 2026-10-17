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
import { PackageCheck, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { StockTransfer, transfersApi } from '../services/transfers-api';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface ReceiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transfer: StockTransfer | null;
}

interface ItemReceiveCount {
  itemId: string;
  quantityReceived: number;
}

export function ReceiveTransferModal({
  isOpen,
  onClose,
  onSuccess,
  transfer,
}: ReceiveTransferModalProps) {
  const [receiveCounts, setReceiveCounts] = useState<ItemReceiveCount[]>([]);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && transfer) {
      setReceiveNotes('');
      // Default received counts to whatever was sent
      setReceiveCounts(
        transfer.items.map((item) => ({
          itemId: item.id,
          quantityReceived: item.quantitySent || item.quantityRequested,
        }))
      );
    }
  }, [isOpen, transfer]);

  if (!transfer) return null;

  const handleCountChange = (itemId: string, value: number) => {
    setReceiveCounts((prev) =>
      prev.map((c) =>
        c.itemId === itemId ? { ...c, quantityReceived: Math.max(0, value) } : c
      )
    );
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const res = await transfersApi.receiveTransfer(transfer.id, {
        items: receiveCounts,
        notes: receiveNotes.trim() || undefined,
      });

      toast.success(res.message || 'Incoming transfer received and inventory stocked successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to receive transfer', {
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
            <PackageCheck className="size-5" />
            <DialogTitle className="text-lg">
              Receive Incoming Transfer #{transfer.transferNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Verify shipment from <strong>{transfer.sourceStore.name}</strong> arriving at{' '}
            <strong>{transfer.targetStore.name}</strong>. Stock will be added to your destination branch catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReceive} className="space-y-4 pt-2">
          {/* Incoming Items Checklist */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Verify Arrived Quantities & Batches
            </Label>

            <div className="space-y-2">
              {transfer.items.map((item) => {
                const count = receiveCounts.find((c) => c.itemId === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">
                        {item.product.name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-micro px-1.5 py-0 font-mono">
                          Batch: {item.batchNumber || 'Pending'}
                        </Badge>
                        {item.expiryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-primary" /> Exp: {formatDate(item.expiryDate)}
                          </span>
                        )}
                        <span>
                          Dispatched:{' '}
                          <strong className="text-foreground">
                            {item.quantitySent ?? item.quantityRequested} {item.product.unit}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="space-y-1 text-right">
                        <Label className="text-micro text-muted-foreground uppercase font-semibold">
                          Actual Received
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            value={count?.quantityReceived ?? item.quantitySent ?? 0}
                            onChange={(e) =>
                              handleCountChange(
                                item.id,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="h-8 w-20 text-xs text-center font-bold"
                          />
                          <span className="text-muted-foreground text-xs">
                            {item.product.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receiving Inspection Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="receive-notes" className="text-xs font-semibold text-foreground">
              Receiving Condition / Discrepancy Remarks <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="receive-notes"
              placeholder="e.g. Package verified in good condition, seals intact"
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
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
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5 text-success" />
              )}
              <span>Confirm & Receive Stock</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
