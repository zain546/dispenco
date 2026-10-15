'use client';

import React, { useState } from 'react';
import { CheckCircle2, Download, Printer, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SaleResponse } from '@/features/sales/services/sales-api';
import { formatCurrency } from '@/lib/format';
import { downloadThermalReceiptPdf } from '../utils/pos-receipt-pdf';

export interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleResponse | null;
  storeName?: string;
  onNextSale: () => void;
}

export function ReceiptModal({
  open,
  onOpenChange,
  sale,
  storeName,
  onNextSale,
}: ReceiptModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!sale) return null;

  const handleDownload = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadThermalReceiptPdf(sale, storeName);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader className="text-center space-y-2">
          <div className="size-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto border border-success/20">
            <CheckCircle2 className="size-7" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Sale Completed Successfully!
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Receipt <strong className="text-foreground">{sale.receiptNumber}</strong> recorded in pharmacy ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Receipt #:</span>
              <span className="font-mono font-bold text-foreground">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Customer:</span>
              <span className="font-semibold text-foreground">{sale.customerName || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Method:</span>
              <Badge variant="outline" className="text-micro font-semibold uppercase">
                {sale.paymentMethod}
              </Badge>
            </div>
            <div className="flex justify-between text-muted-foreground pt-1.5 border-t border-border/60">
              <span className="font-medium">Total Amount Paid:</span>
              <span className="font-extrabold text-sm text-primary tabular-nums">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="space-y-1.5">
            <p className="font-semibold text-muted-foreground text-overline tracking-wider">
              Purchased Items ({sale.items.length})
            </p>
            <div className="max-h-40 overflow-y-auto divide-y divide-border/60 border border-border/60 rounded-xl p-2 bg-card custom-scrollbar">
              {sale.items.map((item) => (
                <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-foreground leading-tight truncate">{item.productName}</p>
                    <p className="text-micro text-muted-foreground">
                      {item.quantity} {item.unit} x {formatCurrency(item.unitPrice)} {item.batchNumber ? `(Batch ${item.batchNumber})` : ''}
                    </p>
                  </div>
                  <span className="font-bold tabular-nums text-foreground shrink-0">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 w-full">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloadingPdf}
              className="w-full h-9 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {isDownloadingPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5 text-primary" />
              )}
              Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.open(`/pos/receipt/${sale.id}`, '_blank');
              }}
              className="w-full h-9 text-xs gap-1.5 cursor-pointer font-medium"
            >
              <Printer className="size-3.5" /> Print Receipt
            </Button>
          </div>
          <Button
            type="button"
            onClick={onNextSale}
            className="w-full h-10 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            Next Sale (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
