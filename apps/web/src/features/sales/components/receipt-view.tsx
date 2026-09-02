'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { salesApi } from '../services/sales-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Building2,
  Calendar,
  User,
  Phone,
  FileText,
  CreditCard,
  Banknote,
  Receipt as ReceiptIcon,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptViewProps {
  saleId: string;
  autoPrint?: boolean;
}

export function ReceiptView({ saleId, autoPrint = false }: ReceiptViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saleData, setSaleData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        setLoading(true);
        setError(null);
        const res = await salesApi.getSaleById(saleId);
        if (res.success && res.sale) {
          setSaleData(res.sale);
        } else {
          setError(res.message || 'Failed to load receipt details.');
        }
      } catch (err: any) {
        console.error('Error fetching receipt:', err);
        setError(err.response?.data?.message || 'Receipt not found or accessible.');
      } finally {
        setLoading(false);
      }
    }

    if (saleId) {
      fetchReceipt();
    }
  }, [saleId]);

  useEffect(() => {
    if (!loading && saleData && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, saleData, autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Receipt link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const { jsPDF } = await import('jspdf');

      const itemRowsCount = items.length;
      const pdfHeight = Math.max(160, 90 + itemRowsCount * 10);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pdfHeight],
      });

      // Store Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(store?.name || 'Pharmacy Store', 40, 12, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      let currentY = 17;
      if (store?.address) {
        pdf.text(store.address, 40, currentY, { align: 'center' });
        currentY += 5;
      }
      pdf.text(`Receipt #: ${receiptNumber}`, 40, currentY, { align: 'center' });
      currentY += 5;

      // Divider Line
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Metadata
      pdf.setFontSize(8);
      pdf.text(`Date & Time: ${formattedDate}`, 5, currentY);
      currentY += 4;
      pdf.text(`Cashier: ${user?.name || 'Pharmacy Staff'}`, 5, currentY);
      currentY += 4;
      if (customer) {
        pdf.text(`Customer: ${customer.name} ${customer.phone ? `(${customer.phone})` : ''}`, 5, currentY);
        currentY += 4;
      }

      // Divider Line
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Table Header
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITEM', 5, currentY);
      pdf.text('QTY × PRICE', 42, currentY);
      pdf.text('TOTAL', 75, currentY, { align: 'right' });
      currentY += 2;
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Table Line Items
      pdf.setFont('helvetica', 'normal');
      items.forEach((item: any) => {
        const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
        const nameTruncated = item.productName.length > 20 ? item.productName.substring(0, 20) + '...' : item.productName;
        pdf.text(nameTruncated, 5, currentY);
        pdf.text(`${item.quantity} ${item.unit || 'pc'} × ${item.unitPrice.toFixed(0)}`, 42, currentY);
        pdf.text(`${lineTotal.toFixed(2)} ${currency}`, 75, currentY, { align: 'right' });
        currentY += 5;
      });

      // Divider Line
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      // Totals Summary
      pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal:', 5, currentY);
      pdf.text(`${subtotal.toFixed(2)} ${currency}`, 75, currentY, { align: 'right' });
      currentY += 5;

      if (discountAmount > 0) {
        pdf.text('Discount:', 5, currentY);
        pdf.text(`-${discountAmount.toFixed(2)} ${currency}`, 75, currentY, { align: 'right' });
        currentY += 5;
      }

      if (taxAmount > 0) {
        pdf.text('Tax:', 5, currentY);
        pdf.text(`+${taxAmount.toFixed(2)} ${currency}`, 75, currentY, { align: 'right' });
        currentY += 5;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('GRAND TOTAL:', 5, currentY);
      pdf.text(`${totalAmount.toFixed(2)} ${currency}`, 75, currentY, { align: 'right' });
      currentY += 7;

      // Payment Details
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Payment Method: ${payment?.method || 'CASH'} (PAID)`, 5, currentY);
      currentY += 8;

      // Footer
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(5, currentY, 75, currentY);
      currentY += 5;

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(7);
      const footerLines = pdf.splitTextToSize(
        store?.receiptFooter || 'Thank you for choosing us! Please retain receipt for returns within 7 days.',
        70
      );
      pdf.text(footerLines, 40, currentY, { align: 'center' });

      pdf.save(`Receipt-${receiptNumber || 'POS'}.pdf`);
      toast.success('Thermal Receipt PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF receipt.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
          <Skeleton className="h-12 w-full pt-4" />
        </Card>
      </div>
    );
  }

  if (error || !saleData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <FileText className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Receipt Not Found</h2>
        <p className="text-sm text-muted-foreground">{error || 'The requested receipt does not exist.'}</p>
        <Button variant="outline" onClick={() => router.push('/pos')} className="gap-2">
          <ArrowLeft className="size-4" /> Back to POS
        </Button>
      </div>
    );
  }

  const {
    receiptNumber,
    createdAt,
    totalAmount,
    discountAmount,
    taxAmount,
    status,
    customer,
    user,
    store,
    payment,
    items = [],
  } = saleData;

  const currency = store?.currency || 'PKR';
  const formattedDate = new Date(createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subtotal = items.reduce((acc: number, item: any) => acc + item.unitPrice * item.quantity, 0);

  return (
    <div className="min-h-screen bg-muted/20 py-6 px-3 sm:px-6">
      {/* Screen Action Bar (Hidden when printing) */}
      <div className="max-w-md mx-auto mb-4 flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Button variant="outline" size="sm" onClick={() => router.push('/pos')} className="gap-1.5 text-xs">
          <ArrowLeft className="size-3.5" /> POS Counter
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 text-xs">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Share'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="gap-1.5 text-xs font-semibold"
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5 text-primary" />
            )}
            Download PDF
          </Button>
          <Button variant="default" size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold shadow-xs">
            <Printer className="size-3.5" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Main Thermal Receipt Box */}
      <Card id="thermal-receipt-card" className="max-w-md mx-auto bg-card shadow-lg border-border/80 text-foreground font-sans print:shadow-none print:border-none print:m-0 print:p-0 print:w-full">
        <CardContent className="p-5 sm:p-6 space-y-4 print:p-0 print:text-black">
          {/* Header & Store Information */}
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-border/80">
            <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-lg tracking-tight">
              <Building2 className="size-5" />
              <span>{store?.name || 'Pharmacy Store'}</span>
            </div>
            {store?.address && <p className="text-xs text-muted-foreground leading-snug">{store.address}</p>}
            <p className="text-[11px] text-muted-foreground font-mono">
              Receipt #: <span className="font-bold text-foreground">{receiptNumber}</span>
            </p>
          </div>

          {/* Meta Info: Cashier, Customer, Date & Status */}
          <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-dashed border-border/80">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> Date & Time
              </p>
              <p className="font-medium text-foreground">{formattedDate}</p>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                <User className="size-3" /> Cashier
              </p>
              <p className="font-medium text-foreground">{user?.name || 'Pharmacy Staff'}</p>
            </div>

            {customer && (
              <div className="col-span-2 pt-1 border-t border-border/40 flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">
                  {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Purchased Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
              <span>Item & Qty</span>
              <span>Amount</span>
            </div>

            <div className="divide-y divide-border/40 text-xs space-y-2">
              {items.map((item: any, idx: number) => {
                const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
                return (
                  <div key={item.id || idx} className="pt-2 first:pt-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground leading-snug">{item.productName}</p>
                      <p className="font-bold text-foreground shrink-0">{lineTotal.toFixed(2)} {currency}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {item.quantity} {item.unit || 'pc'} × {item.unitPrice.toFixed(2)} {currency}
                      </span>
                      {item.batchNumber && (
                        <span className="font-mono text-[10px]">
                          Batch: {item.batchNumber}
                        </span>
                      )}
                    </div>

                    {item.discount > 0 && (
                      <p className="text-[10px] text-emerald-600 font-medium text-right">
                        Discount: -{item.discount.toFixed(2)} {currency}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Breakdown & Totals */}
          <div className="space-y-1.5 pt-3 border-t border-dashed border-border/80 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} {currency}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Order Discount</span>
                <span>-{discountAmount.toFixed(2)} {currency}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>+{taxAmount.toFixed(2)} {currency}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border/80">
              <span>GRAND TOTAL</span>
              <span className="text-primary">{totalAmount.toFixed(2)} {currency}</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <Badge variant="outline" className="font-bold uppercase text-[10px] px-2 py-0.5">
                {payment?.method || 'CASH'}
              </Badge>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Paid
              </span>
            </div>
          </div>

          {/* Footer Note & Barcode Representation */}
          <div className="text-center pt-3 space-y-2 border-t border-dashed border-border/80 text-[11px] text-muted-foreground">
            <p className="leading-snug italic">
              {store?.receiptFooter || 'Thank you for choosing us! Please retain this receipt for returns/exchanges within 7 days.'}
            </p>

            <div className="pt-2 flex flex-col items-center justify-center space-y-1">
              {/* Monospace Barcode Visual Pattern */}
              <div className="font-mono text-xs tracking-widest bg-muted/60 px-3 py-1 rounded border border-border/60">
                |||| | ||||| ||| |||| || ||| |
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">{receiptNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
