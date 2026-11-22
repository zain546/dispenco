'use client';

import React, { useState } from 'react';
import { History, RefreshCw, Loader2, Download, Ban, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaleResponse, ReturnRecord, salesApi } from '@/features/sales/services/sales-api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { downloadThermalReceiptPdf, downloadA4TaxInvoicePdf } from '../utils/pos-receipt-pdf';
import { CreateReturnModal } from '@/features/sales/components/create-return-modal';
import { ReturnSlipModal } from '@/features/sales/components/return-slip-modal';
import { toast } from 'sonner';

export interface RecentSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentSales: SaleResponse[];
  isLoading: boolean;
  onRefresh: () => void;
  storeName?: string;
}

export function RecentSalesModal({
  open,
  onOpenChange,
  recentSales,
  isLoading,
  onRefresh,
  storeName,
}: RecentSalesModalProps) {
  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(null);
  const [saleToVoid, setSaleToVoid] = useState<SaleResponse | null>(null);
  const [voidReason, setVoidReason] = useState('Customer Return');
  const [isVoiding, setIsVoiding] = useState(false);
  const [saleIdToReturn, setSaleIdToReturn] = useState<string | null>(null);
  const [returnRecordForSlip, setReturnRecordForSlip] = useState<ReturnRecord | null>(null);

  const handleDownload = async (sale: SaleResponse) => {
    setDownloadingSaleId(sale.id);
    try {
      let fullSale: any = sale;
      // Fetch full detailed receipt data (batches, taxes, store info) if missing
      if (!sale.items || sale.items.length === 0 || !(sale.items[0] as any)?.batchNumber) {
        try {
          const res = await salesApi.getSaleById(sale.id);
          if (!res?.sale) {
            toast.error('Could not load full receipt details. Please retry.');
            return;
          }
          fullSale = res.sale;
        } catch {
          toast.error('Could not load full receipt details. Please retry.');
          return;
        }
      }
      await downloadThermalReceiptPdf(fullSale, storeName);
    } catch (err) {
      console.error('Thermal PDF generation error:', err);
      toast.error('Failed to generate thermal receipt PDF.');
    } finally {
      setDownloadingSaleId(null);
    }
  };

  const handleConfirmVoid = async () => {
    if (!saleToVoid) return;
    setIsVoiding(true);
    try {
      await salesApi.voidSale(saleToVoid.id, voidReason.trim() || 'Cashier Void');
      toast.success(`Sale #${saleToVoid.receiptNumber} voided successfully! Stock restored.`);
      setSaleToVoid(null);
      setVoidReason('Customer Return');
      onRefresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dispenco:sales-updated', { detail: { saleId: saleToVoid.id } }));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to void sale'));
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-xl shadow-2xl border-border/80">
          <DialogHeader className="p-3.5 sm:p-5 border-b border-border/70 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="size-8 sm:size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <History className="size-4 sm:size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                    <span className="sm:hidden">Recent Sales</span>
                    <span className="hidden sm:inline">Recent Pharmacy Transactions</span>
                  </DialogTitle>
                  <Badge variant="outline" className="text-micro font-mono px-2 py-0.5 rounded-full bg-secondary border-border/70 text-muted-foreground hidden sm:inline-flex">
                    {recentSales.length} {recentSales.length === 1 ? 'sale' : 'sales'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 shrink-0 cursor-pointer transition-colors"
                    title="Refresh sales ledger"
                  >
                    <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <DialogDescription className="text-micro sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  <span className="sm:hidden">Audit sales, receipts &amp; returns</span>
                  <span className="hidden sm:inline">Audit past customer sales, reprint thermal receipt PDFs, or void transactions with automatic stock restoration.</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3.5 sm:p-4 overflow-y-auto space-y-2.5 flex-1 min-h-0">
            {isLoading && recentSales.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading sales history ledger...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2.5">
                <div className="size-12 rounded-xl bg-muted/60 border border-border/70 text-muted-foreground/60 flex items-center justify-center mx-auto shadow-2xs">
                  <History className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">No Sales Logged Yet</p>
                  <p className="text-xs text-muted-foreground">Completed transactions will appear here for reprint and void management.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSales.map((sale) => {
                  const isVoided = sale.status === 'VOIDED';
                  const isReturned = sale.status === 'RETURNED' || Boolean(sale.isFullyReturned);
                  const isPartiallyReturned =
                    sale.status === 'PARTIAL_RETURN' ||
                    sale.status === 'PARTIALLY_RETURNED' ||
                    Boolean(sale.isPartiallyReturned);

                  return (
                    <div
                      key={sale.id}
                      className={`p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card transition-all shadow-2xs space-y-2.5 ${
                        isVoided || isReturned
                          ? 'border-destructive/20 bg-destructive/[0.02] opacity-85'
                          : isPartiallyReturned
                          ? 'border-amber-500/25 bg-amber-500/[0.02]'
                          : 'hover:border-primary/30 hover:bg-muted/20'
                      }`}
                    >
                      {/* Top Header Row: Receipt #, Payment Method, Status Badge & Timestamp */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-xs sm:text-sm text-foreground">#{sale.receiptNumber}</span>
                          <span className="text-micro font-mono px-2 py-0.5 rounded-md bg-secondary border border-border/60 text-muted-foreground uppercase font-medium">
                            {sale.paymentMethod}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-micro font-medium px-2 py-0.5 rounded-full ${
                              isVoided || isReturned
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                                : isPartiallyReturned
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                            }`}
                          >
                            {isVoided
                              ? 'VOIDED'
                              : isReturned
                              ? 'RETURNED'
                              : isPartiallyReturned
                              ? 'PARTIAL RETURN'
                              : 'COMPLETED'}
                          </Badge>
                        </div>
                        <span className="text-micro text-muted-foreground font-mono">
                          {formatDateTime(sale.createdAt)}
                        </span>
                      </div>

                      {/* Middle Details: Customer, Doctor, Cashier */}
                      <div className="text-micro sm:text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span className="text-foreground font-medium">{sale.customerName || 'Walk-in'}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>Dr: <strong className="text-foreground font-medium">{(sale as any).doctorName || 'Self'}</strong></span>
                        <span className="text-muted-foreground/40 hidden xs:inline">•</span>
                        <span className="hidden xs:inline">Cashier: <strong className="text-foreground font-medium">{sale.cashierName || 'Staff'}</strong></span>
                      </div>

                      {/* Items Preview */}
                      {sale.itemsCount > 0 && (
                        <div className="text-micro text-muted-foreground font-mono bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50 truncate max-w-full">
                          <span className="font-semibold text-foreground">Items ({sale.itemsCount})</span>
                          {sale.items && sale.items.length > 0 ? (
                            <span>: {sale.items.map((i: any) => `${i.productName} (${i.quantity})`).join(', ')}</span>
                          ) : null}
                        </div>
                      )}

                      {/* Bottom Footer Row: Total Amount & Action CTA Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total</span>
                          <p className={`font-bold font-mono tabular-nums text-sm sm:text-base ${
                            isVoided || isReturned
                              ? 'line-through text-muted-foreground/60'
                              : 'text-foreground'
                          }`}>
                            {formatCurrency(sale.totalAmount)}
                            {isReturned && (
                              <span className="text-micro text-rose-500 font-normal ml-1.5 no-underline">
                                (Refunded)
                              </span>
                            )}
                            {isPartiallyReturned && typeof sale.totalRefunded === 'number' && sale.totalRefunded > 0 && (
                              <span className="text-micro text-amber-500 font-normal ml-1.5 no-underline">
                                (-{formatCurrency(sale.totalRefunded)})
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(sale)}
                            disabled={downloadingSaleId === sale.id}
                            className="h-7.5 sm:h-8 px-2 sm:px-2.5 text-xs font-medium gap-1 border-border/80 bg-card hover:bg-muted/60 text-foreground rounded-lg shadow-2xs cursor-pointer transition-colors"
                          >
                            {downloadingSaleId === sale.id ? (
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                            ) : (
                              <Download className="size-3.5 text-primary" />
                            )}
                            <span className="hidden sm:inline">Receipt PDF</span>
                            <span className="sm:hidden text-micro">PDF</span>
                          </Button>

                          {!isVoided && !isReturned && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSaleIdToReturn(sale.id)}
                                className="h-7.5 sm:h-8 px-2 sm:px-2.5 text-xs font-medium gap-1 border-border/80 bg-card hover:bg-muted/60 text-foreground rounded-lg shadow-2xs cursor-pointer transition-colors"
                                title="Process Customer Return"
                              >
                                <RotateCcw className="size-3.5 text-muted-foreground" />
                                <span className="text-micro sm:text-xs">Return</span>
                              </Button>

                              {!isPartiallyReturned && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSaleToVoid(sale)}
                                  className="h-7.5 sm:h-8 px-2 sm:px-2.5 text-xs font-medium gap-1 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg shadow-2xs cursor-pointer transition-colors"
                                >
                                  <Ban className="size-3.5" />
                                  <span className="text-micro sm:text-xs">Void</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Flow Modal for Specific Sale */}
      <CreateReturnModal
        open={Boolean(saleIdToReturn)}
        onOpenChange={(open) => !open && setSaleIdToReturn(null)}
        initialSaleId={saleIdToReturn || undefined}
        onReturnSuccess={(newReturn) => {
          setSaleIdToReturn(null);
          setReturnRecordForSlip(newReturn);
          onRefresh();
        }}
      />

      {/* Return Slip / Credit Memo View Modal */}
      <ReturnSlipModal
        open={Boolean(returnRecordForSlip)}
        onOpenChange={(open) => !open && setReturnRecordForSlip(null)}
        returnRecord={returnRecordForSlip}
      />

      {/* Void Confirmation Dialog with Accessible Reason Input */}
      <Dialog open={Boolean(saleToVoid)} onOpenChange={(open) => !open && setSaleToVoid(null)}>
        <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md rounded-2xl sm:rounded-xl shadow-2xl border-border/80 p-4 sm:p-5">
          <DialogHeader className="pr-8">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Void Sale #{saleToVoid?.receiptNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Voiding this sale will mark it void in records, restore batch stock quantities, and adjust any customer credit balance.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-2xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sale Amount:</span>
                <span className="font-bold font-mono text-foreground">{formatCurrency(saleToVoid?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">{saleToVoid?.customerName || 'Walk-in'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="void-reason" className="text-xs font-medium text-foreground">
                Reason for Voiding <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-reason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer Return, Scanning Error, Dispensing Mistake"
                className="text-xs h-8.5 rounded-lg bg-background/50 border-border/70 focus-visible:ring-1 focus-visible:ring-primary/30"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaleToVoid(null)}
              disabled={isVoiding}
              className="h-8.5 px-3 rounded-lg border-border/80 bg-card hover:bg-muted/60 text-foreground text-xs font-medium cursor-pointer shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmVoid}
              disabled={isVoiding || !voidReason.trim()}
              className="h-8.5 px-3.5 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              {isVoiding && <Loader2 className="size-3.5 animate-spin" />}
              <span>Confirm Void Sale</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
