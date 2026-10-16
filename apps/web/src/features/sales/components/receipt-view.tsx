'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { salesApi, SaleDetailResponse, ReturnRecord } from '../services/sales-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import {
  downloadA4TaxInvoicePdf,
  downloadThermalReceiptPdf,
} from '@/features/sales/utils/invoice-pdf-generator';
import { CreateReturnModal } from '@/features/sales/components/create-return-modal';
import { ReturnSlipModal } from '@/features/sales/components/return-slip-modal';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  Calendar,
  User,
  FileText,
  Download,
  Loader2,
  Ban,
  AlertTriangle,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  Send,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';

interface ReceiptViewProps {
  saleId: string;
  autoPrint?: boolean;
}

export function ReceiptView({ saleId, autoPrint = false }: ReceiptViewProps) {
  const router = useRouter();
  const { canVoidSales } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saleData, setSaleData] = useState<SaleDetailResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // View mode: 'a4' for Formal Tax Invoice, 'thermal' for 80mm POS Slip
  const [viewMode, setViewMode] = useState<'a4' | 'thermal'>('a4');

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnRecordForSlip, setReturnRecordForSlip] = useState<ReturnRecord | null>(null);

  // Digital Delivery (WhatsApp/SMS)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await salesApi.getSaleById(saleId);
      if (res.success && res.sale) {
        setSaleData(res.sale);
      } else {
        setError(res.message || 'Failed to load receipt details.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Receipt not found or accessible.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (saleId) {
      fetchReceipt();
    }
  }, [saleId]);

  const handleVoidSale = async () => {
    if (!saleId) return;
    setIsVoiding(true);
    try {
      const res = await salesApi.voidSale(saleId, voidReason);
      toast.success(res?.message || 'Sale voided and inventory restored successfully.');
      setIsVoidModalOpen(false);
      fetchReceipt();
    } catch (err: unknown) {
      toast.error('Failed to void sale', {
        description: getErrorMessage(err),
      });
    } finally {
      setIsVoiding(false);
    }
  };

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

  const handleDownloadA4 = async () => {
    if (!saleData) return;
    try {
      setIsDownloading(true);
      await downloadA4TaxInvoicePdf(saleData, {
        storeName: saleData.store?.name,
        address: saleData.store?.address || undefined,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadThermal = async () => {
    if (!saleData) return;
    try {
      setIsDownloading(true);
      await downloadThermalReceiptPdf(saleData, saleData.store?.name);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenWhatsAppModal = () => {
    setWhatsAppPhone(saleData?.customer?.phone || '');
    setIsWhatsAppModalOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!whatsAppPhone.trim()) {
      toast.error('Please enter customer phone number');
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      const res = await salesApi.sendDigitalInvoice(saleId, whatsAppPhone.trim());
      toast.success(res.message || 'Digital invoice dispatched via WhatsApp!');
      setIsWhatsAppModalOpen(false);
      if (res.directWhatsAppUrl) {
        window.open(res.directWhatsAppUrl, '_blank');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send WhatsApp invoice'));
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-9 w-36" />
        <Card className="p-8 space-y-4 border-border/80">
          <Skeleton className="h-10 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-16 w-full pt-4" />
        </Card>
      </div>
    );
  }

  if (error || !saleData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6">
        <EmptyState
          icon={FileText}
          title="Receipt Not Found"
          description={error || 'The requested receipt does not exist or has expired.'}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/pos')}
              className="gap-2 h-8 text-xs font-medium cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back to POS Counter
            </Button>
          }
        />
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
    returns = [],
  } = saleData;

  const subtotal = items.reduce(
    (acc: number, item: any) => acc + item.unitPrice * item.quantity,
    0,
  );
  const isVoided = status === 'VOIDED';
  const totalReturnedUnits = items.reduce(
    (acc, item) => acc + (item.returnedQuantity || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-muted/20 py-6 px-3 sm:px-6">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/pos')}
            className="gap-1.5 text-xs h-8 font-medium cursor-pointer"
          >
            <ArrowLeft className="size-3.5" /> POS Counter
          </Button>

          {/* Document Format Switcher */}
          <div className="flex items-center rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('a4')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'a4'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSpreadsheet className="size-3.5" />
              <span>A4 Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('thermal')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'thermal'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="size-3.5" />
              <span>Thermal Slip (80mm)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </Button>

          {/* Download Options */}
          {viewMode === 'a4' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadA4}
              disabled={isDownloading}
              className="gap-1.5 text-xs h-8 font-medium cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5 text-primary" />
              )}
              <span>Download A4 PDF</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadThermal}
              disabled={isDownloading}
              className="gap-1.5 text-xs h-8 font-medium cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5 text-primary" />
              )}
              <span>Download Thermal PDF</span>
            </Button>
          )}

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-8 font-medium shadow-xs cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span>Print {viewMode === 'a4' ? 'Invoice' : 'Slip'}</span>
          </Button>

          {/* WhatsApp Digital Delivery Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWhatsAppModal}
            className="gap-1.5 text-xs h-8 font-medium text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
          >
            <MessageSquare className="size-3.5 text-emerald-600" />
            <span>Send WhatsApp</span>
          </Button>

          {/* Return Processing Action */}
          {!isVoided && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReturnModalOpen(true)}
              className="gap-1.5 text-xs h-8 font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              <RotateCcw className="size-3.5 text-primary" />
              <span>Process Return</span>
            </Button>
          )}

          {/* Void Action */}
          {!isVoided && canVoidSales && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsVoidModalOpen(true)}
              className="gap-1.5 text-xs h-8 font-medium cursor-pointer"
            >
              <Ban className="size-3.5" />
              <span>Void</span>
            </Button>
          )}
        </div>
      </div>

      {/* Render Format 1: A4 Tax Invoice (Formal & Branded) */}
      {viewMode === 'a4' ? (
        <div className="max-w-4xl mx-auto bg-card border border-border/80 shadow-lg rounded-xl overflow-hidden text-foreground font-sans print:shadow-none print:border-none print:m-0 print:p-0 print:w-full">
          {/* Top Decorative Brand Ribbon */}
          <div className="h-2 bg-primary w-full" />

          <div className="p-6 sm:p-10 space-y-6">
            {/* Header: Store Identity & Document Title */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-border/70">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                      {store?.name || 'Pharmacy Dispensary'}
                    </h1>
                    <p className="text-xs text-muted-foreground">{store?.tenantName || 'Dispenco Healthcare'}</p>
                  </div>
                </div>
                {store?.address && (
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                    {store.address}
                  </p>
                )}
                <div className="flex items-center gap-3 text-micro text-muted-foreground font-medium pt-0.5">
                  <span>Licence: <strong className="text-foreground">DSL-PH-09281-R</strong></span>
                  <span>•</span>
                  <span>NTN: <strong className="text-foreground">8291044-7</strong></span>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1 shrink-0">
                <Badge
                  variant={isVoided ? 'destructive' : 'secondary'}
                  className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5"
                >
                  {isVoided ? 'VOIDED INVOICE' : 'TAX INVOICE / CASH MEMO'}
                </Badge>
                <p className="font-mono font-bold text-base text-primary">#{receiptNumber}</p>
                <p className="text-micro text-muted-foreground">Original for Recipient</p>
              </div>
            </div>

            {/* 2-Column Info Grid: Customer (Billed To) & Invoice Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer Box */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
                <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground block">
                  Billed To (Customer)
                </span>
                <p className="font-bold text-sm text-foreground">
                  {customer?.name || 'Walk-in Retail Customer'}
                </p>
                <p className="text-muted-foreground text-xs">
                  Phone: <span className="text-foreground font-medium">{customer?.phone || 'N/A'}</span>
                </p>
                {customer?.address && (
                  <p className="text-muted-foreground text-xs truncate">
                    Address: <span className="text-foreground font-medium">{customer.address}</span>
                  </p>
                )}
                {customer?.creditBalance !== undefined && customer.creditBalance > 0 && (
                  <p className="text-amber-600 font-semibold text-micro pt-0.5">
                    Khata Credit Balance: {formatCurrency(customer.creditBalance)}
                  </p>
                )}
              </div>

              {/* Invoice Meta Box */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
                <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground block">
                  Invoice Meta
                </span>
                <div className="grid grid-cols-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-medium text-foreground text-right">{formatDateTime(createdAt)}</span>

                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-bold text-foreground text-right uppercase">
                    {payment?.method || 'CASH'} ({isVoided ? 'VOIDED' : 'PAID'})
                  </span>

                  <span className="text-muted-foreground">Dispenser / Cashier:</span>
                  <span className="font-medium text-foreground text-right">{user?.name || 'Staff'}</span>

                  <span className="text-muted-foreground">Counter Branch:</span>
                  <span className="font-medium text-foreground text-right">{store?.name}</span>
                </div>
              </div>
            </div>

            {/* Returns Banner if any items were returned */}
            {totalReturnedUnits > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                  <RotateCcw className="size-4 shrink-0" />
                  <span>
                    Notice: {totalReturnedUnits} unit(s) from this invoice were returned under Return Memo(s).
                  </span>
                </div>
                {returns.length > 0 && (
                  <span className="text-micro text-muted-foreground font-mono">
                    Ref: {returns.map((r) => r.returnNumber).join(', ')}
                  </span>
                )}
              </div>
            )}

            {/* Medicine Line Items Table */}
            <div className="border border-border/70 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-primary text-primary-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-10">#</th>
                    <th className="py-2.5 px-3 text-left">Medicine Description</th>
                    <th className="py-2.5 px-3 text-left">Batch No</th>
                    <th className="py-2.5 px-3 text-left">Exp</th>
                    <th className="py-2.5 px-2 text-center w-14">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Disc</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item, index) => {
                    const isReturned = (item.returnedQuantity || 0) > 0;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          index % 2 === 1 ? 'bg-muted/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-muted-foreground font-medium">{index + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">{item.productName}</p>
                          {item.genericName && (
                            <p className="text-micro text-muted-foreground italic">
                              {item.genericName}
                            </p>
                          )}
                          {isReturned && (
                            <p className="text-micro text-amber-600 font-semibold">
                              Returned: {item.returnedQuantity} units
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-micro text-muted-foreground">
                          {item.batchNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-micro text-muted-foreground">
                          {item.expiryDate ? item.expiryDate.slice(0, 7) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold tabular-nums">
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600">
                          {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-foreground">
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Section: Terms & Signature (Left) and Financial Matrix (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Left Side: Regulatory Terms & Official Stamp */}
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-semibold text-foreground text-xs mb-1">
                    Pharmacy Regulations & Return Policy:
                  </h4>
                  <ul className="text-muted-foreground text-micro space-y-1 list-disc pl-4 leading-relaxed">
                    <li>Refrigerated / cold-chain medicines (2°C-8°C) are non-returnable once sold.</li>
                    <li>Unopened medicines in intact blister packs can be exchanged within 7 days with this invoice.</li>
                    <li>Automated computer-generated tax invoice. Valid without physical seal.</li>
                    <li>Regulated by the Drug Regulatory Authority under the Drugs Act 1976.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <div className="border border-border/70 rounded-lg p-3 w-48 h-20 flex flex-col justify-between bg-muted/10">
                    <span className="text-micro text-muted-foreground block">
                      Authorised Pharmacist Stamp
                    </span>
                    <span className="text-micro font-semibold text-foreground">
                      Dispenco Healthcare PK
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Totals Matrix */}
              <div className="space-y-2 text-xs">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Subtotal:</span>
                    <span className="tabular-nums font-semibold text-foreground">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Total Discount Allowed:</span>
                      <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {taxAmount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sales Tax (GST):</span>
                      <span className="tabular-nums font-medium text-foreground">
                        +{formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/80 flex justify-between items-center text-sm font-bold text-foreground">
                    <span>NET PAYABLE:</span>
                    <span className="text-primary font-mono text-base tabular-nums">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-border/60 text-center text-micro text-muted-foreground space-y-0.5">
              <p>{store?.receiptFooter || 'Thank you for choosing us! We wish you good health.'}</p>
              <p>Powered by Dispenco Pharmacy Management Suite</p>
            </div>
          </div>
        </div>
      ) : (
        /* Render Format 2: 80mm High-Speed Thermal POS Receipt */
        <Card
          id="thermal-receipt-card"
          className="max-w-md mx-auto bg-card shadow-lg border-border/80 text-foreground font-sans print:shadow-none print:border-none print:m-0 print:p-0 print:w-full"
        >
          <CardContent className="p-5 sm:p-6 space-y-4 print:p-0 print:text-black">
            {/* Header & Store Information */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-border/80">
              <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-lg tracking-tight">
                <Building2 className="size-5" />
                <span>{store?.name || 'Pharmacy Store'}</span>
              </div>
              {store?.address && (
                <p className="text-xs text-muted-foreground leading-snug">{store.address}</p>
              )}
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <p className="text-[11px] text-muted-foreground font-mono">
                  Receipt #: <span className="font-bold text-foreground">{receiptNumber}</span>
                </p>
                {isVoided && (
                  <Badge variant="destructive" className="text-[10px] font-extrabold uppercase tracking-wider">
                    VOIDED
                  </Badge>
                )}
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-dashed border-border/80">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" /> Date & Time
                </p>
                <p className="font-medium text-foreground">{formatDateTime(createdAt)}</p>
              </div>

              <div className="space-y-0.5 text-right">
                <p className="text-[11px] text-muted-foreground flex items-center justify-end gap-1">
                  <User className="size-3" /> Cashier
                </p>
                <p className="font-medium text-foreground">{user?.name || 'Staff'}</p>
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

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                <span>Medicine Item</span>
                <span>Amount</span>
              </div>

              <div className="divide-y divide-border/40 text-xs space-y-2">
                {items.map((item, idx) => {
                  return (
                    <div key={item.id || idx} className="pt-2 first:pt-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground leading-snug">{item.productName}</p>
                        <p className="font-bold text-foreground shrink-0 tabular-nums">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {item.quantity} {item.unit || 'pc'} × {formatCurrency(item.unitPrice)}
                        </span>
                        {item.batchNumber && (
                          <span className="font-mono text-[10px]">Batch: {item.batchNumber}</span>
                        )}
                      </div>

                      {item.discount > 0 && (
                        <p className="text-[10px] text-emerald-600 font-medium text-right tabular-nums">
                          Discount: -{formatCurrency(item.discount)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="space-y-1.5 pt-3 border-t border-dashed border-border/80 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Order Discount</span>
                  <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (GST)</span>
                  <span className="tabular-nums">+{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border/80">
                <span>GRAND TOTAL</span>
                <span className="text-primary tabular-nums">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <Badge variant="outline" className="font-bold uppercase text-[10px] px-2 py-0.5">
                  {payment?.method || 'CASH'}
                </Badge>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Payment Status:</span>
                <span
                  className={
                    isVoided
                      ? 'text-destructive font-bold'
                      : 'text-emerald-600 font-bold flex items-center gap-1'
                  }
                >
                  {isVoided ? (
                    'VOIDED'
                  ) : (
                    <>
                      <CheckCircle2 className="size-3" /> Paid
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 space-y-2 border-t border-dashed border-border/80 text-[11px] text-muted-foreground">
              <p className="leading-snug italic">
                {store?.receiptFooter ||
                  'Thank you for choosing us! Retain receipt for returns/exchanges within 7 days.'}
              </p>

              <div className="pt-2 flex flex-col items-center justify-center space-y-1">
                <div className="font-mono text-xs tracking-widest bg-muted/60 px-3 py-1 rounded border border-border/60">
                  |||| | ||||| ||| |||| || ||| |
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">{receiptNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Flow Modal for This Sale */}
      <CreateReturnModal
        open={isReturnModalOpen}
        onOpenChange={setIsReturnModalOpen}
        initialSaleId={saleId}
        onReturnSuccess={(newReturn) => {
          setIsReturnModalOpen(false);
          setReturnRecordForSlip(newReturn);
          fetchReceipt();
        }}
      />

      {/* Return Slip / Credit Memo View Modal */}
      <ReturnSlipModal
        open={Boolean(returnRecordForSlip)}
        onOpenChange={(open) => !open && setReturnRecordForSlip(null)}
        returnRecord={returnRecordForSlip}
      />

      {/* Void Sale Confirmation Dialog */}
      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Void Sale #{receiptNumber}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action will mark the transaction as <strong>VOIDED</strong>, restore all item
              quantities back into their respective inventory batches, and log an audit trail entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="void-reason" className="text-xs font-medium">
              Cancellation Reason (Optional)
            </Label>
            <Input
              id="void-reason"
              placeholder="e.g., Customer changed mind, wrong item scanned"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVoidModalOpen(false)}
              disabled={isVoiding}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleVoidSale}
              disabled={isVoiding}
              className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
            >
              {isVoiding && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Digital Invoice Delivery Dialog */}
      <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Send Invoice via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send a digital receipt link and summary to the customer&apos;s WhatsApp number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono font-bold text-foreground">#{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Amount:</span>
                <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">{customer?.name || 'Walk-in Customer'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp-phone" className="text-xs font-semibold">
                Customer WhatsApp Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="whatsapp-phone"
                placeholder="e.g. 03001234567 or 923001234567"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                className="text-xs h-9 font-mono"
                autoFocus
              />
              <p className="text-micro text-muted-foreground">
                Enter phone number with local (03xx) or international (923xx) format.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWhatsAppModalOpen(false)}
              disabled={isSendingWhatsApp}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp || !whatsAppPhone.trim()}
              className="text-xs font-semibold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              {isSendingWhatsApp ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Send Digital Receipt</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
