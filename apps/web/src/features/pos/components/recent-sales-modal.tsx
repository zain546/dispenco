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
      await downloadA4TaxInvoicePdf(sale, { storeName });
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to void sale'));
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4.5 text-primary" />
                <span>Recent Pharmacy Transactions</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Audit past customer sales, reprint thermal receipt PDFs, or void transactions with automatic stock restoration.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="size-8 p-0 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogHeader>

          <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Loading sales history ledger...</span>
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <History className="size-8 text-muted-foreground/50 mx-auto" />
                <p className="font-semibold text-sm text-foreground">No Sales Logged Yet</p>
                <p className="text-xs">Completed transactions will appear here for reprint and void management.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
                {recentSales.map((sale) => {
                  const isVoided = sale.status === 'VOIDED';

                  return (
                    <div
                      key={sale.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isVoided ? 'bg-destructive/5 opacity-75' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-foreground">#{sale.receiptNumber}</span>
                          <Badge variant={isVoided ? 'destructive' : 'outline'} className="text-micro font-semibold uppercase">
                            {sale.paymentMethod} • {isVoided ? 'VOIDED' : 'COMPLETED'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Customer: <strong className="text-foreground">{sale.customerName || 'Walk-in Customer'}</strong> • Cashier: <strong className="text-foreground">{sale.cashierName || 'Staff'}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-xl">
                          Items ({sale.itemsCount}): {sale.items?.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-right mr-1">
                          <p className={`font-bold tabular-nums text-sm ${isVoided ? 'line-through text-muted-foreground' : 'text-primary'}`}>
                            {formatCurrency(sale.totalAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(sale)}
                            disabled={downloadingSaleId === sale.id}
                            className="h-8 text-xs gap-1 font-medium cursor-pointer"
                          >
                            {downloadingSaleId === sale.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5 text-primary" />
                            )}
                            <span className="hidden xs:inline">PDF</span>
                          </Button>
                          {!isVoided && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSaleIdToReturn(sale.id)}
                                className="h-8 text-xs gap-1 font-medium text-foreground hover:bg-muted cursor-pointer"
                                title="Process Customer Return"
                              >
                                <RotateCcw className="size-3.5 text-primary" />
                                <span className="hidden xs:inline">Return</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSaleToVoid(sale)}
                                className="h-8 text-xs gap-1 font-medium text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                              >
                                <Ban className="size-3.5" />
                                <span>Void</span>
                              </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <DialogTitle className="text-base font-bold">
                Void Sale #{saleToVoid?.receiptNumber}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Voiding this sale will mark it void in records, restore batch stock quantities, and adjust any customer credit balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/70 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sale Amount:</span>
                <span className="font-bold text-foreground">{formatCurrency(saleToVoid?.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">{saleToVoid?.customerName || 'Walk-in'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="void-reason" className="text-xs font-semibold">
                Reason for Voiding <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-reason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Customer Return, Scanning Error, Dispensing Mistake"
                className="text-xs h-9"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaleToVoid(null)}
              disabled={isVoiding}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmVoid}
              disabled={isVoiding || !voidReason.trim()}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
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
