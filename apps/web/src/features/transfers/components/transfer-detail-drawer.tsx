'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { StockTransfer } from '../services/transfers-api';
import { formatDate, formatDateTime } from '@/lib/format';

interface TransferDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  onDispatch?: (transfer: StockTransfer) => void;
  onReceive?: (transfer: StockTransfer) => void;
  onCancel?: (transfer: StockTransfer) => void;
}

export function TransferDetailDrawer({
  isOpen,
  onClose,
  transfer,
  onDispatch,
  onReceive,
  onCancel,
}: TransferDetailDrawerProps) {
  if (!transfer) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <Badge variant="success" className="text-xs gap-1">
            <CheckCircle2 className="size-3" /> Received & Stocked
          </Badge>
        );
      case 'DISPATCHED':
        return (
          <Badge variant="warning" className="text-xs gap-1">
            <Truck className="size-3" /> In-Transit / Dispatched
          </Badge>
        );
      case 'REQUESTED':
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="size-3" /> Requested (Pending Dispatch)
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <XCircle className="size-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePrintChallan = () => {
    window.print();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto space-y-6">
        <SheetHeader className="border-b border-border/80 pb-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-primary" />
              <SheetTitle className="text-lg font-bold">
                Transfer #{transfer.transferNumber}
              </SheetTitle>
            </div>
            {getStatusBadge(transfer.status)}
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Inter-branch stock requisition created on {formatDateTime(transfer.createdAt)}
          </SheetDescription>
        </SheetHeader>

        {/* Transfer Pathway (Source to Target) */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Branch Transfer Pathway</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-micro text-muted-foreground flex items-center gap-1">
                <Building2 className="size-3 text-primary" /> Sourced From
              </span>
              <p className="font-bold text-foreground text-sm">
                {transfer.sourceStore.name}
              </p>
              <p className="text-micro text-muted-foreground truncate max-w-44">
                {transfer.sourceStore.address || 'Branch Store'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-micro text-muted-foreground font-semibold">TO</span>
              <div className="w-16 h-0.5 bg-primary/40 relative my-1">
                <div className="size-1.5 rounded-full bg-primary absolute -right-0.5 -top-0.5" />
              </div>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-micro text-muted-foreground flex items-center justify-end gap-1">
                <Building2 className="size-3 text-primary" /> Delivered To
              </span>
              <p className="font-bold text-foreground text-sm">
                {transfer.targetStore.name}
              </p>
              <p className="text-micro text-muted-foreground truncate max-w-44">
                {transfer.targetStore.address || 'Branch Store'}
              </p>
            </div>
          </div>
        </div>

        {/* Milestone Audit Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transfer Lifecycle & Audit Milestones
          </h4>

          <div className="space-y-3 pl-2 border-l-2 border-border/80">
            {/* Step 1: Requested */}
            <div className="relative pl-4">
              <div className="size-2 rounded-full bg-primary absolute -left-[5px] top-1.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground text-xs">
                  Requisition Requested
                </p>
                <p className="text-micro text-muted-foreground">
                  By {transfer.requestedByUser.name} on {formatDateTime(transfer.createdAt)}
                </p>
              </div>
            </div>

            {/* Step 2: Dispatched */}
            {transfer.dispatchedAt ? (
              <div className="relative pl-4">
                <div className="size-2 rounded-full bg-warning absolute -left-[5px] top-1.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-xs">
                    Dispatched & In-Transit
                  </p>
                  <p className="text-micro text-muted-foreground">
                    By {transfer.dispatchedByUser?.name || 'Staff'} on {formatDateTime(transfer.dispatchedAt)}
                  </p>
                </div>
              </div>
            ) : transfer.status !== 'CANCELLED' ? (
              <div className="relative pl-4 opacity-50">
                <div className="size-2 rounded-full bg-muted absolute -left-[5px] top-1.5" />
                <p className="text-xs text-muted-foreground">Awaiting Dispatch from Source Branch</p>
              </div>
            ) : null}

            {/* Step 3: Received */}
            {transfer.receivedAt ? (
              <div className="relative pl-4">
                <div className="size-2 rounded-full bg-success absolute -left-[5px] top-1.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-xs">
                    Received & Stocked in Inventory
                  </p>
                  <p className="text-micro text-muted-foreground">
                    By {transfer.receivedByUser?.name || 'Staff'} on {formatDateTime(transfer.receivedAt)}
                  </p>
                </div>
              </div>
            ) : transfer.status !== 'CANCELLED' ? (
              <div className="relative pl-4 opacity-50">
                <div className="size-2 rounded-full bg-muted absolute -left-[5px] top-1.5" />
                <p className="text-xs text-muted-foreground">Awaiting Delivery & Intake Verification</p>
              </div>
            ) : null}

            {/* Cancelled State */}
            {transfer.status === 'CANCELLED' && (
              <div className="relative pl-4">
                <div className="size-2 rounded-full bg-destructive absolute -left-[5px] top-1.5" />
                <p className="font-semibold text-destructive text-xs">
                  Transfer Requisition Cancelled
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Items Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Manifest & Stocked Medicines ({transfer.items.length})
            </h4>
          </div>

          <div className="rounded-lg border border-border/80 overflow-hidden divide-y divide-border/60 text-xs">
            {transfer.items.map((item) => (
              <div key={item.id} className="p-3 bg-card space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-foreground text-sm block">
                      {item.product.name}
                    </span>
                    <span className="text-micro text-muted-foreground">
                      {item.product.genericName || item.product.category}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground">
                      {item.quantityReceived !== null && item.quantityReceived !== undefined
                        ? `${item.quantityReceived} / ${item.quantitySent ?? item.quantityRequested}`
                        : item.quantitySent ?? item.quantityRequested}{' '}
                      {item.product.unit}
                    </span>
                    <span className="text-micro text-muted-foreground block">
                      {transfer.status === 'RECEIVED' ? 'Received / Sent' : 'Requested'}
                    </span>
                  </div>
                </div>

                {item.batchNumber && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-micro text-muted-foreground">
                    <Badge variant="outline" className="text-micro px-1.5 py-0 font-mono">
                      Batch: {item.batchNumber}
                    </Badge>
                    {item.expiryDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-primary" /> Exp: {formatDate(item.expiryDate)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {transfer.notes && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs space-y-1">
            <span className="text-micro font-semibold uppercase text-muted-foreground">
              Remarks & Logs
            </span>
            <p className="text-foreground text-xs leading-relaxed">{transfer.notes}</p>
          </div>
        )}

        <Separator />

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintChallan}
            className="gap-1.5 text-xs h-8 font-medium"
          >
            <Printer className="size-3.5" />
            <span>Print Delivery Slip</span>
          </Button>

          <div className="flex items-center gap-2">
            {transfer.status === 'REQUESTED' && onDispatch && (
              <Button
                size="sm"
                onClick={() => onDispatch(transfer)}
                className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
              >
                <Truck className="size-3.5" />
                <span>Dispatch Stock</span>
              </Button>
            )}

            {transfer.status === 'DISPATCHED' && onReceive && (
              <Button
                size="sm"
                onClick={() => onReceive(transfer)}
                className="gap-1.5 text-xs h-8 font-semibold shadow-xs"
              >
                <CheckCircle2 className="size-3.5" />
                <span>Receive & Stock</span>
              </Button>
            )}

            {transfer.status !== 'RECEIVED' &&
              transfer.status !== 'CANCELLED' &&
              onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(transfer)}
                  className="text-xs h-8 text-destructive hover:bg-destructive/10"
                >
                  Cancel Transfer
                </Button>
              )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
