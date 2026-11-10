'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  shareThermalReceiptOnWhatsApp,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';

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

/**
 * Realistic vector barcode representation matching the receipt number
 */
function ReceiptBarcode({ value }: { value: string }) {
  const bars = useMemo(() => {
    const pattern: number[] = [2, 1, 1, 3, 1, 2]; // start guard
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      pattern.push((code % 3) + 1, ((code >> 1) % 2) + 1, ((code >> 2) % 3) + 1, 1);
    }
    pattern.push(3, 1, 2, 1, 1, 2); // stop guard
    return pattern;
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center pt-2">
      <svg className="h-9 w-44 max-w-full" viewBox="0 0 160 36" preserveAspectRatio="none">
        {(() => {
          let x = 4;
          const totalUnits = bars.reduce((a, b) => a + b, 0);
          const scale = 152 / totalUnits;
          return bars.map((w, idx) => {
            const barWidth = Math.max(0.9, w * scale * 0.95);
            const currentX = x;
            x += w * scale;
            if (idx % 2 === 0) {
              return (
                <rect
                  key={idx}
                  x={currentX}
                  y="0"
                  width={barWidth}
                  height="36"
                  fill="currentColor"
                />
              );
            }
            return null;
          });
        })()}
      </svg>
      <p className="font-mono text-micro tracking-widest text-zinc-500 pt-1">{value}</p>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState<'a4' | 'thermal'>('thermal');

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

  // Keyboard shortcut: Ctrl+P / Cmd+P to print, Esc to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape' && !isVoidModalOpen && !isWhatsAppModalOpen && !isReturnModalOpen) {
        router.push('/pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoidModalOpen, isWhatsAppModalOpen, isReturnModalOpen]);

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

  const handleDirectWhatsAppShare = async () => {
    if (!saleData) return;
    await shareThermalReceiptOnWhatsApp(saleData, saleData.store?.name);
    const cleanPhone = (saleData.customer?.phone || '').replace(/\D/g, '');
    if (cleanPhone) {
      salesApi.sendDigitalInvoice(saleId, cleanPhone).catch(() => {});
    }
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-44 rounded-lg" />
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
    doctorName,
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
    <div className="min-h-screen bg-muted/15 py-5 px-3 sm:px-6 print:p-0 print:bg-white print:m-0">
      {/* Dynamic Print Engine CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${viewMode === 'thermal' ? '80mm auto' : 'A4 portrait'};
            margin: ${viewMode === 'thermal' ? '0mm' : '8mm'};
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden, header, nav, aside {
            display: none !important;
          }
          #printable-thermal-receipt {
            width: 76mm !important;
            max-width: 76mm !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11px !important;
          }
          #printable-a4-invoice {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto space-y-3 print:hidden">
        {/* Tier 1: Context Header & Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card border border-border/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/pos')}
              className="gap-1.5 h-8.5 text-xs font-semibold cursor-pointer shadow-2xs hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to POS</span>
              <kbd className="hidden sm:inline-flex items-center text-micro bg-muted border border-border px-1 py-0.5 rounded text-muted-foreground font-mono">
                Esc
              </kbd>
            </Button>

            <div className="h-4 w-px bg-border/80 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                #{receiptNumber}
              </span>
              <Badge
                variant={isVoided ? 'destructive' : 'default'}
                className={`text-micro font-bold uppercase tracking-wider px-2 py-0.5 ${
                  isVoided ? '' : 'text-white'
                }`}
              >
                {isVoided ? 'VOIDED' : 'PAID'}
              </Badge>
            </div>
          </div>

          {/* Secondary Actions (Share, Returns, Void) */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1.5 border-t border-border/40 sm:border-t-0 sm:pt-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1 text-xs h-8 px-2 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </Button>

            <div className="flex items-center gap-1.5">
              {!isVoided && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReturnModalOpen(true)}
                  className="gap-1 text-xs h-8 px-2.5 font-medium hover:bg-muted cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="size-3.5 text-primary" />
                  <span>Return</span>
                </Button>
              )}

              {!isVoided && canVoidSales && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsVoidModalOpen(true)}
                  className="gap-1 text-xs h-8 px-2.5 font-medium text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer shadow-2xs"
                >
                  <Ban className="size-3.5" />
                  <span>Void</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tier 2: The Print Hub & Dispatch Command Bar */}
        <div className="bg-card border border-border/80 rounded-xl p-3 sm:px-4 sm:py-2.5 shadow-2xs">
          {/* Mobile Layout (< sm): Structured 3-row thumb-friendly stack */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {/* Mobile Row 1: Full-width Segmented Format Switcher */}
            <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/50 p-1 shadow-2xs w-full">
              <button
                type="button"
                onClick={() => setViewMode('thermal')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === 'thermal'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Receipt className="size-3.5" />
                <span>80mm Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('a4')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === 'a4'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileSpreadsheet className="size-3.5" />
                <span>A4 Invoice</span>
              </button>
            </div>

            {/* Mobile Row 2: Secondary Utilities (Tips, WhatsApp, PDF) */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {/* Printer Hardware Setup Guide */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 px-2 text-micro font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer w-full justify-center"
                  >
                    <HelpCircle className="size-3.5 text-primary" />
                    <span>Printer Tips</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3.5 text-xs space-y-2.5 shadow-xl border-border" align="center">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border">
                    <SlidersHorizontal className="size-3.5 text-primary shrink-0" />
                    <h4 className="font-bold text-foreground">Printer Settings</h4>
                  </div>
                  <ul className="space-y-2 text-micro leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">1.</span>
                      <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Paper:</span> 80mm Roll (or 3-inch)
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">2.</span>
                      <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Margins:</span> Set to <strong className="text-foreground">None</strong>
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">3.</span>
                      <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Headers & Footers:</span> <strong className="text-foreground">Uncheck</strong>
                      </p>
                    </li>
                  </ul>
                </PopoverContent>
              </Popover>

              {/* WhatsApp Receipt Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectWhatsAppShare}
                className="h-8.5 px-2 text-micro font-semibold text-[#25D366] hover:text-[#25D366] border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/15 cursor-pointer w-full justify-center gap-1"
              >
                <WhatsAppIcon className="size-3.5 shrink-0 text-[#25D366]" />
                <span>WhatsApp</span>
              </Button>

              {/* Download PDF Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'a4' ? handleDownloadA4 : handleDownloadThermal}
                disabled={isDownloading}
                className="h-8.5 px-2 text-micro font-semibold cursor-pointer hover:bg-muted w-full justify-center gap-1"
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <Download className="size-3.5 text-primary" />
                )}
                <span>PDF</span>
              </Button>
            </div>

            {/* Mobile Row 3: Full-Width Primary Print Button */}
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="w-full h-10 text-xs font-bold gap-2 shadow-xs cursor-pointer bg-primary hover:bg-primary/95 text-primary-foreground justify-center"
            >
              <Printer className="size-4" />
              <span>Print {viewMode === 'a4' ? 'Tax Invoice' : 'Thermal Slip'}</span>
            </Button>
          </div>

          {/* Desktop & Tablet Layout (sm: and up): Clean 1-Line Strict Alignment */}
          <div className="hidden sm:flex sm:items-center justify-between gap-3">
            {/* Left: Format Switcher */}
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('thermal')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === 'thermal'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Receipt className="size-3.5" />
                  <span>Thermal (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('a4')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === 'a4'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileSpreadsheet className="size-3.5" />
                  <span>A4 Invoice</span>
                </button>
              </div>
            </div>

            {/* Right: Print Actions & Help */}
            <div className="flex items-center gap-2 justify-end flex-nowrap shrink-0">
              {/* Printer Hardware Setup Guide */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs h-8.5 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <HelpCircle className="size-3.5 text-primary" />
                    <span>Printer Tips</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 text-xs space-y-2.5 shadow-xl border-border" align="end">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border">
                    <SlidersHorizontal className="size-4 text-primary shrink-0" />
                    <h4 className="font-bold text-foreground">Thermal Printer Connection Tips</h4>
                  </div>
                  <p className="text-muted-foreground text-micro leading-relaxed">
                    When connecting your USB / Network 80mm receipt printer, configure your browser print dialog once:
                  </p>
                  <ul className="space-y-2 text-micro leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">1.</span>
                      <p className="text-foreground">
                        <span className="font-bold text-primary">Destination:</span> Choose your Thermal Printer (e.g. POS-80, Xprinter, Epson, CBM-1000).
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">2.</span>
                      <p className="text-foreground">
                        <span className="font-bold text-primary">Paper Size:</span> Set to <strong>80mm Roll</strong> or <strong>80mm × 297mm</strong>.
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">3.</span>
                      <p className="text-foreground">
                        <span className="font-bold text-primary">Margins:</span> Set to <strong>None</strong> (prevents extra paper feeds).
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary shrink-0 w-3.5">4.</span>
                      <p className="text-foreground">
                        <span className="font-bold text-primary">Headers & Footers:</span> <strong>Uncheck</strong> (removes unwanted URL & date text).
                      </p>
                    </li>
                  </ul>
                  <div className="pt-1.5 border-t border-border flex justify-between items-center text-micro font-medium text-muted-foreground">
                    <span>Shortcut: <kbd className="font-mono bg-muted px-1 py-0.5 rounded border">Ctrl + P</kbd></span>
                    <span className="text-success font-semibold">✓ Auto-Optimized</span>
                  </div>
                </PopoverContent>
              </Popover>

              {/* WhatsApp Receipt Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectWhatsAppShare}
                className="gap-1.5 text-xs h-8.5 px-3 font-semibold text-[#25D366] hover:text-[#25D366] border-[#25D366]/40 bg-[#25D366]/5 hover:bg-[#25D366]/15 cursor-pointer shadow-2xs"
              >
                <WhatsAppIcon className="size-3.5 shrink-0 text-[#25D366]" />
                <span>WhatsApp</span>
              </Button>

              {/* Download PDF Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'a4' ? handleDownloadA4 : handleDownloadThermal}
                disabled={isDownloading}
                className="gap-1.5 text-xs h-8.5 px-3 font-semibold cursor-pointer shadow-2xs hover:bg-muted"
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <Download className="size-3.5 text-primary" />
                )}
                <span>PDF</span>
              </Button>

              {/* Primary Print Receipt Button */}
              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-8.5 px-3.5 font-bold shadow-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Printer className="size-3.5" />
                <span>Print {viewMode === 'a4' ? 'Invoice' : 'Slip'}</span>
                <kbd className="hidden sm:inline-flex items-center text-micro bg-primary-foreground/20 px-1 py-0.5 rounded text-primary-foreground font-mono">
                  Ctrl+P
                </kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3: Visual Receipt / Invoice Previews (Always Real White Print Paper) */}
      <div className="mt-4">
        {viewMode === 'a4' ? (
          /* Render Format 1: A4 Formal Tax Invoice (Realistic White A4 Sheet) */
          <div
            id="printable-a4-invoice"
            className="max-w-4xl mx-auto bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden text-zinc-900 font-sans print:shadow-none print:border-none print:m-0 print:p-0 print:w-full"
          >
            {/* Top Brand Ribbon */}
            <div className="h-1.5 bg-linear-to-r from-primary via-primary/80 to-primary/50 w-full" />

            <div className="p-6 sm:p-10 space-y-6">
              {/* Header: Store Identity & Document Title */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-zinc-200">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shadow-2xs">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                        {store?.name || 'Pharmacy Dispensary'}
                      </h1>
                      <p className="text-xs text-zinc-500">{store?.tenantName || 'Dispenco Healthcare'}</p>
                    </div>
                  </div>
                  {store?.address && (
                    <p className="text-xs text-zinc-600 leading-relaxed max-w-sm pt-1">
                      {store.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-micro text-zinc-500 font-medium pt-0.5">
                    <span>Licence: <strong className="text-zinc-900">DSL-PH-09281-R</strong></span>
                    <span>•</span>
                    <span>NTN: <strong className="text-zinc-900">8291044-7</strong></span>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1 shrink-0">
                  <Badge
                    variant={isVoided ? 'destructive' : 'outline'}
                    className={`text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 ${
                      isVoided ? '' : 'bg-zinc-100 text-zinc-900 border-zinc-300'
                    }`}
                  >
                    {isVoided ? 'VOIDED INVOICE' : 'TAX INVOICE / CASH MEMO'}
                  </Badge>
                  <p className="font-mono font-bold text-base text-zinc-900">#{receiptNumber}</p>
                  <p className="text-micro text-zinc-500">Original for Recipient</p>
                </div>
              </div>

              {/* 2-Column Info Grid: Customer (Billed To) & Invoice Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Customer Box */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                  <span className="text-micro font-semibold uppercase tracking-wider text-zinc-500 block">
                    Billed To (Customer)
                  </span>
                  <p className="font-bold text-sm text-zinc-900">
                    {customer?.name || 'Walk-in Retail Customer'}
                  </p>
                  <p className="text-zinc-600 text-xs">
                    Phone: <span className="text-zinc-900 font-medium">{customer?.phone || 'N/A'}</span>
                  </p>
                  {customer?.address && (
                    <p className="text-zinc-600 text-xs truncate">
                      Address: <span className="text-zinc-900 font-medium">{customer.address}</span>
                    </p>
                  )}
                  {customer?.creditBalance !== undefined && customer.creditBalance > 0 && (
                    <p className="text-amber-600 font-semibold text-micro pt-0.5">
                      Khata Credit Balance: {formatCurrency(customer.creditBalance)}
                    </p>
                  )}
                </div>

                {/* Invoice Meta Box */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                  <span className="text-micro font-semibold uppercase tracking-wider text-zinc-500 block">
                    Invoice Details
                  </span>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-zinc-600">Date & Time:</span>
                    <span className="font-medium text-zinc-900 text-right">{formatDateTime(createdAt)}</span>

                    <span className="text-zinc-600">Doctor / Ref:</span>
                    <span className="font-semibold text-zinc-900 text-right">{doctorName || 'Self'}</span>

                    <span className="text-zinc-600">Payment Mode:</span>
                    <span className="font-bold text-zinc-900 text-right uppercase">
                      {payment?.method || 'CASH'} ({isVoided ? 'VOIDED' : 'PAID'})
                    </span>

                    <span className="text-zinc-600">Cashier:</span>
                    <span className="font-medium text-zinc-900 text-right">{user?.name || 'Staff'}</span>

                    <span className="text-zinc-600">Store:</span>
                    <span className="font-medium text-zinc-900 text-right">{store?.name}</span>
                  </div>
                </div>
              </div>

              {/* Returns Banner if any items were returned */}
              {totalReturnedUnits > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <RotateCcw className="size-4 shrink-0" />
                    <span>
                      Notice: {totalReturnedUnits} unit(s) from this invoice were returned under Return Memo(s).
                    </span>
                  </div>
                  {returns.length > 0 && (
                    <span className="text-micro text-zinc-600 font-mono">
                      Ref: {returns.map((r) => r.returnNumber).join(', ')}
                    </span>
                  )}
                </div>
              )}

              {/* Medicine Line Items Table */}
              <div className="overflow-x-auto custom-scrollbar border border-zinc-200 rounded-xl shadow-2xs">
                <table className="w-full text-xs min-w-[620px]">
                  <thead className="bg-zinc-100 text-zinc-900 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left w-10 text-zinc-500 font-bold">#</th>
                      <th className="py-2.5 px-3 text-left font-bold">Medicine Description</th>
                      <th className="py-2.5 px-3 text-left font-bold">Batch No</th>
                      <th className="py-2.5 px-3 text-left font-bold">Exp</th>
                      <th className="py-2.5 px-2 text-center w-14 font-bold">Qty</th>
                      <th className="py-2.5 px-3 text-right font-bold">Price</th>
                      <th className="py-2.5 px-3 text-right font-bold">Disc</th>
                      <th className="py-2.5 px-3 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {items.map((item, index) => {
                      const isReturned = (item.returnedQuantity || 0) > 0;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-zinc-50 transition-colors ${
                            index % 2 === 1 ? 'bg-zinc-50/60' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-zinc-500 font-medium">{index + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-zinc-900">{item.productName}</p>
                            {item.genericName && (
                              <p className="text-micro text-zinc-500 italic">
                                {item.genericName}
                              </p>
                            )}
                            {isReturned && (
                              <p className="text-micro text-amber-600 font-semibold">
                                Returned: {item.returnedQuantity} units
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-micro text-zinc-600">
                            {item.batchNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-micro text-zinc-600">
                            {item.expiryDate ? item.expiryDate.slice(0, 7) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold tabular-nums text-zinc-900">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-zinc-600">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600">
                            {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold tabular-nums text-zinc-900">
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
                    <h4 className="font-semibold text-zinc-900 text-xs mb-1">
                      Pharmacy Regulations & Return Policy:
                    </h4>
                    <ul className="text-zinc-600 text-micro space-y-1 list-disc pl-4 leading-relaxed">
                      <li>Refrigerated / cold-chain medicines (2°C-8°C) are non-returnable once sold.</li>
                      <li>Unopened medicines in intact blister packs can be exchanged within 7 days with this invoice.</li>
                      <li>Automated computer-generated tax invoice. Valid without physical seal.</li>
                      <li>Regulated by the Drug Regulatory Authority under the Drugs Act 1976.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <div className="border border-zinc-300 rounded-lg p-3 w-48 h-20 flex flex-col justify-between bg-zinc-50">
                      <span className="text-micro text-zinc-500 block">
                        Authorised Pharmacist Stamp
                      </span>
                      <span className="text-micro font-semibold text-zinc-900">
                        {store?.name || 'Dispenco Pharmacy'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Totals Matrix */}
                <div className="space-y-2 text-xs">
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                    <div className="flex justify-between text-zinc-600">
                      <span>Gross Subtotal:</span>
                      <span className="tabular-nums font-semibold text-zinc-900">
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
                      <div className="flex justify-between text-zinc-600">
                        <span>Sales Tax (GST):</span>
                        <span className="tabular-nums font-medium text-zinc-900">
                          +{formatCurrency(taxAmount)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-300 flex justify-between items-center text-sm font-black text-zinc-950">
                      <span>NET PAYABLE:</span>
                      <span className="text-zinc-950 font-mono text-base tabular-nums">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-zinc-200 text-center text-micro text-zinc-500 space-y-0.5">
                <p>{store?.receiptFooter || 'Thank you for choosing us! We wish you good health.'}</p>
                <p>Powered by Dispenco Pharmacy Management Suite</p>
              </div>
            </div>
          </div>
        ) : (
          /* Render Format 2: 80mm High-Speed Thermal POS Receipt (Realistic White Thermal Paper) */
          <div className="flex justify-center">
            <div
              id="printable-thermal-receipt"
              className="w-full max-w-[420px] rounded-xl bg-white text-zinc-900 border border-zinc-200 shadow-xl"
            >
              {/* Paper Top Decorative Perforated Edge */}
              <div className="h-2 border-b border-dashed border-zinc-300" />

              <div className="p-5 sm:p-6 space-y-4">
                {/* Header & Store Identity */}
                <div className="text-center space-y-1.5 pb-4 border-b border-dashed border-zinc-300">
                  <div className="flex items-center justify-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-zinc-900">
                    <Building2 className="size-5 shrink-0" />
                    <span>{store?.name || 'Pharmacy Store'}</span>
                  </div>

                  {store?.address && (
                    <p className="text-xs leading-snug px-2 text-zinc-600">
                      {store.address}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <p className="text-micro font-mono text-zinc-600">
                      Receipt #: <strong className="text-zinc-900">{receiptNumber}</strong>
                    </p>
                    {isVoided && (
                      <Badge variant="destructive" className="text-micro font-black uppercase tracking-wider">
                        VOIDED
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-dashed border-zinc-300">
                  <div className="space-y-0.5">
                    <p className="text-micro flex items-center gap-1 text-zinc-500">
                      <Calendar className="size-3" /> Date & Time
                    </p>
                    <p className="font-semibold text-zinc-800">
                      {formatDateTime(createdAt)}
                    </p>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <p className="text-micro flex items-center justify-end gap-1 text-zinc-500">
                      <User className="size-3" /> Cashier
                    </p>
                    <p className="font-semibold text-zinc-800">
                      {user?.name || 'Staff'}
                    </p>
                  </div>

                  <div className="col-span-2 pt-1.5 border-t border-zinc-200 flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Doctor / Ref:</span>
                    <span className="font-bold text-zinc-800">
                      {doctorName || 'Self'}
                    </span>
                  </div>

                  {customer && (
                    <div className="col-span-2 pt-1 border-t border-zinc-200 flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Customer:</span>
                      <span className="font-bold text-zinc-800">
                        {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-overline font-bold uppercase tracking-wider pb-1 border-b text-zinc-600 border-zinc-300">
                    <span>ITEM</span>
                    <span className="text-right">TOTAL</span>
                  </div>

                  <div className="divide-y divide-zinc-200 text-xs space-y-2">
                    {items.map((item, idx) => {
                      return (
                        <div key={item.id || idx} className="pt-2 first:pt-0 space-y-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold leading-snug text-zinc-900">
                              {item.productName}
                            </p>
                            <p className="font-mono font-bold shrink-0 tabular-nums text-zinc-900">
                              {formatCurrency(item.lineTotal)}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-micro text-zinc-600">
                            <span>
                              {item.quantity} {item.unit || 'pc'} × {formatCurrency(item.unitPrice)}
                            </span>
                            {item.batchNumber && (
                              <span className="font-mono text-micro">BN: {item.batchNumber}</span>
                            )}
                          </div>

                          {item.discount > 0 && (
                            <p className="text-micro text-emerald-600 font-semibold text-right tabular-nums">
                              Discount: -{formatCurrency(item.discount)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals & Calculations */}
                <div className="space-y-1.5 pt-3 border-t border-dashed border-zinc-300 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span className="tabular-nums font-mono font-semibold">{formatCurrency(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount:</span>
                      <span className="tabular-nums font-mono">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  {taxAmount > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Tax (GST):</span>
                      <span className="tabular-nums font-mono font-semibold">+{formatCurrency(taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline text-sm font-black pt-2 border-t border-zinc-400 text-zinc-950">
                    <span>GRAND TOTAL</span>
                    <span className="text-base font-mono tracking-tight text-zinc-950 font-black">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Payment Badge Box */}
                <div className="p-2.5 rounded-lg border bg-zinc-50 border-zinc-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Payment Method:</span>
                    <Badge
                      variant="outline"
                      className="font-mono font-bold uppercase text-micro px-2 py-0.5 border-zinc-300 text-zinc-900 bg-white"
                    >
                      {payment?.method || 'CASH'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-zinc-600">Payment Status:</span>
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

                {/* Footer Note & Barcode */}
                <div className="text-center pt-3 space-y-2 border-t border-dashed border-zinc-300 text-zinc-600 text-micro">
                  <p className="leading-snug italic font-medium">
                    {store?.receiptFooter ||
                      'Thank you for choosing us! Retain receipt for returns/exchanges within 7 days.'}
                  </p>

                  {/* Clean Vector Barcode */}
                  <div className="text-zinc-900">
                    <ReceiptBarcode value={receiptNumber} />
                  </div>
                </div>
              </div>

              {/* Paper Bottom Perforated Edge */}
              <div className="h-2 border-t border-dashed border-zinc-300" />
            </div>
          </div>
        )}
      </div>

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
            <div className="size-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center border border-[#25D366]/30">
              <WhatsAppIcon className="size-5 text-[#25D366]" />
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
              className="text-xs font-semibold gap-1.5 h-8 bg-success hover:bg-success/90 text-success-foreground cursor-pointer shadow-xs"
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
