'use client';

import React, { useRef } from 'react';
import { RotateCcw, Printer, Download, CheckCircle2, Calendar, User, FileText, Store } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReturnRecord } from '../services/sales-api';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface ReturnSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnRecord: ReturnRecord | null;
}

export function ReturnSlipModal({
  open,
  onOpenChange,
  returnRecord,
}: ReturnSlipModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!returnRecord) return null;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    const printWindow = window.open('', '', 'width=600,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Return Slip - ${returnRecord.returnNumber || 'Dispenco'}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 20px;
                color: #111;
                font-size: 12px;
                line-height: 1.4;
              }
              .header { text-align: center; border-bottom: 1px dashed #bbb; padding-bottom: 12px; margin-bottom: 12px; }
              .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
              .meta-table { width: 100%; margin-bottom: 12px; font-size: 11px; }
              .meta-table td { padding: 2px 0; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              .items-table th, .items-table td { border-bottom: 1px solid #ddd; padding: 6px 4px; text-align: left; }
              .items-table th { font-weight: bold; font-size: 11px; background: #fafafa; }
              .text-right { text-align: right; }
              .totals-section { border-top: 1px dashed #bbb; padding-top: 8px; margin-top: 8px; }
              .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
              .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }
  };

  const totalUnits = returnRecord.returnItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4.5 text-primary" />
              <DialogTitle className="text-base font-bold">
                Sales Return Slip / Credit Memo
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official stock return memorandum and refund voucher
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 font-medium cursor-pointer"
            >
              <Printer className="size-3.5 text-primary" />
              <span>Print Slip</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {/* Printable Container */}
          <div
            ref={printRef}
            className="border border-border/80 rounded-xl p-5 bg-card text-card-foreground shadow-2xs space-y-4"
          >
            {/* Pharmacy & Slip Header */}
            <div className="text-center pb-4 border-b border-dashed border-border/80 space-y-1">
              <Badge variant="secondary" className="text-micro font-semibold uppercase tracking-wider mb-1">
                Stock Return & Refund Voucher
              </Badge>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {returnRecord.sale.store?.name || 'Pharmacy Dispensary'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Return Memo #{returnRecord.returnNumber || 'RET-RECORD'}
              </p>
            </div>

            {/* Transaction Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-muted/30 rounded-lg p-3 border border-border/50">
              <div>
                <span className="text-muted-foreground block text-micro uppercase tracking-wider">Date & Time</span>
                <span className="font-semibold text-foreground">{formatDateTime(returnRecord.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-micro uppercase tracking-wider">Original Receipt #</span>
                <span className="font-mono font-bold text-primary">#{returnRecord.sale.receiptNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-micro uppercase tracking-wider">Customer</span>
                <span className="font-medium text-foreground">{returnRecord.sale.customer?.name || 'Walk-in Customer'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-micro uppercase tracking-wider">Processed By</span>
                <span className="font-medium text-foreground">{returnRecord.processedByUser?.name || 'Dispenser'}</span>
              </div>
            </div>

            {/* Return Reason Box */}
            <div className="p-2.5 rounded-lg border border-border/60 bg-background text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-micro uppercase tracking-wider font-semibold">Reason for Return</span>
                <Badge variant="outline" className="text-micro capitalize">
                  {returnRecord.refundMethod} Refund
                </Badge>
              </div>
              <p className="font-medium text-foreground text-xs">{returnRecord.reason}</p>
              {returnRecord.notes && (
                <p className="text-micro text-muted-foreground italic">Note: {returnRecord.notes}</p>
              )}
            </div>

            {/* Itemized Table */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Returned Medicines</span>
                <span>{totalUnits} Units</span>
              </div>
              <div className="border border-border/70 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">Medicine</th>
                      <th className="py-2 px-2 text-left font-semibold">Batch</th>
                      <th className="py-2 px-2 text-center font-semibold">Qty</th>
                      <th className="py-2 px-3 text-right font-semibold">Unit Refund</th>
                      <th className="py-2 px-3 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {returnRecord.returnItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">
                            {item.saleItem.product?.name || 'Medicine'}
                          </p>
                          {item.saleItem.product?.genericName && (
                            <p className="text-micro text-muted-foreground">
                              {item.saleItem.product.genericName}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-micro text-muted-foreground">
                          {item.saleItem.batch?.batchNumber || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(Number(item.unitPrice))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-foreground">
                          {formatCurrency(Number(item.refundAmount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Section */}
            <div className="border-t border-dashed border-border/80 pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Refund Method:</span>
                <span className="font-semibold text-foreground uppercase">{returnRecord.refundMethod}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-foreground">
                <span>Total Refund Issued:</span>
                <span className="text-primary tabular-nums">
                  {formatCurrency(Number(returnRecord.refundAmount))}
                </span>
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="pt-3 border-t border-border/50 text-center text-micro text-muted-foreground space-y-0.5">
              <p>Inventory batches have been restored to available stock.</p>
              <p>Thank you for shopping with us.</p>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Transaction recorded & audited</span>
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer font-semibold px-4"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
