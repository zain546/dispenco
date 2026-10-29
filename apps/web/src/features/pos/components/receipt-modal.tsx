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
import { SaleResponse, salesApi } from '@/features/sales/services/sales-api';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { downloadThermalReceiptPdf, downloadA4TaxInvoicePdf } from '../utils/pos-receipt-pdf';
import { toast } from 'sonner';

export interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleResponse | null;
  storeName?: string;
  onNextSale: () => void;
}

function WhatsAppIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
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
      await downloadA4TaxInvoicePdf(sale, { storeName });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const rawPhone = sale.customer?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    const receiptUrl = typeof window !== 'undefined' ? `${window.location.origin}/pos/receipt/${sale.id}` : '';
    const itemsList = (sale.items || [])
      .map((it) => `• ${it.productName} (${it.quantity} ${it.unit}) - ${formatCurrency(it.lineTotal)}`)
      .slice(0, 5)
      .join('\n');
    const extraItems = (sale.items?.length || 0) > 5 ? `\n...and ${(sale.items?.length || 0) - 5} more item(s)` : '';

    const textMessage = `🧾 *Pharmacy Receipt: ${sale.receiptNumber}*
🏪 *${storeName || 'Dispenco Pharmacy'}*
👤 *Customer:* ${sale.customerName || 'Valued Customer'}
💳 *Payment:* ${sale.paymentMethod}
💰 *Total Paid:* ${formatCurrency(sale.totalAmount)}

📦 *Purchased Items:*
${itemsList}${extraItems}

📄 *View / Download Invoice:*
${receiptUrl}

Thank you for your visit!`;

    const encodedText = encodeURIComponent(textMessage);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp to share receipt...');

    if (cleanPhone) {
      salesApi.sendDigitalInvoice(sale.id, cleanPhone).catch(() => {});
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
              Purchased Items ({sale.items?.length || 0})
            </p>
            <div className="max-h-40 overflow-y-auto divide-y divide-border/60 border border-border/60 rounded-xl p-2 bg-card custom-scrollbar">
              {(sale.items || []).map((item) => (
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
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloadingPdf}
              className="w-full h-10 px-2 text-xs font-semibold gap-1.5 cursor-pointer whitespace-nowrap overflow-hidden active:scale-98"
              title="Download A4 Tax Invoice PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="size-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="size-3.5 text-primary shrink-0" />
              )}
              <span className="whitespace-nowrap">PDF</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="w-full h-10 px-2 text-xs font-semibold gap-1.5 text-[#25D366] hover:text-[#25D366] border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/15 dark:hover:bg-[#25D366]/20 cursor-pointer whitespace-nowrap overflow-hidden active:scale-98"
              title="Share receipt via WhatsApp"
            >
              <WhatsAppIcon className="size-3.5 shrink-0 text-[#25D366]" />
              <span className="whitespace-nowrap">WhatsApp</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.open(`/pos/receipt/${sale.id}`, '_blank');
              }}
              className="w-full h-10 px-2 text-xs gap-1.5 cursor-pointer font-medium whitespace-nowrap overflow-hidden active:scale-98"
              title="View full printable invoice"
            >
              <Printer className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="whitespace-nowrap">Invoice</span>
            </Button>
          </div>
          <Button
            type="button"
            onClick={onNextSale}
            className="w-full h-10.5 text-xs sm:text-sm font-bold gap-1.5 cursor-pointer shadow-xs active:scale-98"
          >
            Next Sale (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
