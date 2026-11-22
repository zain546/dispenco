'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Search,
  Loader2,
  Minus,
  Plus,
  ArrowRight,
  CheckCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/context/store-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  SaleDetailResponse,
  SaleItemData,
  SaleResponse,
  ReturnRecord,
  salesApi,
} from '../services/sales-api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';

interface CreateReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSaleId?: string;
  onReturnSuccess?: (returnRecord: ReturnRecord) => void;
}

const RETURN_REASONS = [
  'Customer changed mind',
  'Wrong medicine dispensed',
  'Doctor changed prescription',
  'Adverse reaction / Allergy',
  'Damaged packaging / Defective',
  'Expired / Near expiry dispensed by error',
  'Excess quantity returned',
  'Other reason',
];

function computeItemEffectiveTotal(
  item: SaleItemData,
  allItems: SaleItemData[],
  saleDiscountAmount: number,
): number {
  let totalItemNetBeforeOverall = 0;
  let totalItemDiscounts = 0;
  for (const si of allItems) {
    const gross = si.unitPrice * si.quantity;
    const itemDisc = si.discount || 0;
    totalItemDiscounts += itemDisc;
    totalItemNetBeforeOverall += Math.max(0, gross - itemDisc);
  }
  const overallSaleDiscount = Math.max(0, (saleDiscountAmount || 0) - totalItemDiscounts);

  const lineGross = item.unitPrice * item.quantity;
  const lineDiscount = item.discount || 0;
  const lineNetBeforeOverall = Math.max(0, lineGross - lineDiscount);
  const lineOverallDiscountShare =
    totalItemNetBeforeOverall > 0 && overallSaleDiscount > 0
      ? overallSaleDiscount * (lineNetBeforeOverall / totalItemNetBeforeOverall)
      : 0;
  const lineTax = item.taxApplied || 0;

  return Math.max(0, lineNetBeforeOverall - lineOverallDiscountShare + lineTax);
}

export function CreateReturnModal({
  open,
  onOpenChange,
  initialSaleId,
  onReturnSuccess,
}: CreateReturnModalProps) {
  const { activeStore, isAllStores } = useStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleResponse[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleDetailResponse | null>(null);

  // Return item selection: map of saleItemId -> return quantity
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<string>('Customer changed mind');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT' | 'DIGITAL'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recentReqSeqRef = React.useRef(0);

  const fetchRecentSales = useCallback(async () => {
    const reqId = ++recentReqSeqRef.current;
    setLoadingRecent(true);
    try {
      const storeId = !isAllStores && activeStore?.id ? activeStore.id : undefined;
      const res = await salesApi.getRecentSales(12, storeId);
      if (reqId !== recentReqSeqRef.current) return;
      if (res.data) {
        setRecentSales(
          res.data.filter(
            (s: SaleResponse) => s.status !== 'VOIDED' && s.status !== 'RETURNED' && !s.isFullyReturned,
          ),
        );
      }
    } catch (err) {
      if (reqId !== recentReqSeqRef.current) return;
      console.error('Failed to load recent sales:', err);
    } finally {
      if (reqId === recentReqSeqRef.current) {
        setLoadingRecent(false);
      }
    }
  }, [activeStore?.id, isAllStores]);

  // Load initial sale if provided or fetch recent sales for fast picking
  useEffect(() => {
    if (open) {
      if (initialSaleId) {
        fetchSaleDetails(initialSaleId);
      } else {
        fetchRecentSales();
      }
    } else {
      // Reset state when closing
      setSelectedSale(null);
      setReturnQuantities({});
      setSearchQuery('');
      setNotes('');
      setCustomReason('');
    }
  }, [open, initialSaleId, fetchRecentSales]);

  const fetchSaleDetails = async (identifier: string) => {
    if (!identifier.trim()) return;
    setIsSearching(true);
    try {
      const res = await salesApi.getSaleById(identifier.trim());
      if (res && res.sale) {
        if (res.sale.status === 'VOIDED') {
          toast.error(`Receipt #${res.sale.receiptNumber} is already voided. Cannot process returns.`);
          return;
        }

        setSelectedSale(res.sale);
        // Initialize return quantities with 0 for all items
        const initialQtys: Record<string, number> = {};
        res.sale.items.forEach((item) => {
          initialQtys[item.id] = 0;
        });
        setReturnQuantities(initialQtys);

        // Default refund method to CREDIT only if original sale was on credit and has a registered customer
        const hasRegisteredCustomer = Boolean(
          res.sale.customer?.id && res.sale.customer.id !== 'walkin',
        );
        if (
          hasRegisteredCustomer &&
          (res.sale.payment?.method === 'CREDIT' || res.sale.status === 'ON_CREDIT')
        ) {
          setRefundMethod('CREDIT');
        } else if (res.sale.payment?.method === 'DIGITAL') {
          setRefundMethod('DIGITAL');
        } else {
          setRefundMethod('CASH');
        }
      } else {
        toast.error('Sale transaction not found');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not find sale receipt'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSaleDetails(searchQuery);
  };

  const updateQuantity = (itemId: string, maxReturnable: number, delta: number) => {
    setReturnQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxReturnable, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const setDirectQuantity = (itemId: string, maxReturnable: number, value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setReturnQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      return;
    }
    const parsed = parseInt(trimmed, 10);
    const validQty = isNaN(parsed) ? 0 : Math.max(0, Math.min(maxReturnable, parsed));
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: validQty,
    }));
  };

  const handleToggleReturnAll = () => {
    if (!selectedSale) return;
    const allMaxSelected = selectedSale.items.every((item) => {
      const maxRet =
        item.maxReturnable !== undefined
          ? item.maxReturnable
          : Math.max(0, item.quantity - (item.returnedQuantity || 0));
      return maxRet <= 0 || (returnQuantities[item.id] || 0) === maxRet;
    });

    const nextQtys: Record<string, number> = {};
    selectedSale.items.forEach((item) => {
      const maxRet =
        item.maxReturnable !== undefined
          ? item.maxReturnable
          : Math.max(0, item.quantity - (item.returnedQuantity || 0));
      nextQtys[item.id] = allMaxSelected ? 0 : Math.max(0, maxRet);
    });
    setReturnQuantities(nextQtys);
  };

  // Compute calculated refunds
  const { itemsToReturn, totalRefundAmount, totalUnitsToReturn } = useMemo(() => {
    if (!selectedSale) {
      return { itemsToReturn: [], totalRefundAmount: 0, totalUnitsToReturn: 0 };
    }

    let refundSum = 0;
    let unitsSum = 0;
    const itemsList: {
      saleItemId: string;
      quantity: number;
      productName: string;
      unitRefund: number;
      lineRefund: number;
    }[] = [];

    selectedSale.items.forEach((item) => {
      const qty = returnQuantities[item.id] || 0;
      if (qty > 0) {
        const lineEffective = computeItemEffectiveTotal(
          item,
          selectedSale.items,
          selectedSale.discountAmount || 0,
        );

        const lineRefund = Math.round((lineEffective * (qty / item.quantity)) * 100) / 100;
        const unitRefund = qty > 0 ? Math.round((lineRefund / qty) * 100) / 100 : 0;

        refundSum += lineRefund;
        unitsSum += qty;

        itemsList.push({
          saleItemId: item.id,
          quantity: qty,
          productName: item.productName,
          unitRefund,
          lineRefund,
        });
      }
    });

    return {
      itemsToReturn: itemsList,
      totalRefundAmount: Math.round(refundSum * 100) / 100,
      totalUnitsToReturn: unitsSum,
    };
  }, [selectedSale, returnQuantities]);

  const alreadyRefundedTotal = useMemo(() => {
    if (!selectedSale) return 0;
    if (selectedSale.returns && selectedSale.returns.length > 0) {
      return selectedSale.returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
    }
    return selectedSale.items.reduce((sum, item) => {
      const retQty = item.returnedQuantity || 0;
      if (retQty <= 0) return sum;
      const lineEffective = computeItemEffectiveTotal(
        item,
        selectedSale.items,
        selectedSale.discountAmount || 0,
      );
      return sum + Math.round((lineEffective * (retQty / item.quantity)) * 100) / 100;
    }, 0);
  }, [selectedSale]);

  const hasPastReturns =
    alreadyRefundedTotal > 0 ||
    Boolean(selectedSale?.items.some((i) => (i.returnedQuantity || 0) > 0));
  const remainingReturnableTotal = Math.max(
    0,
    Number(((selectedSale?.totalAmount || 0) - alreadyRefundedTotal).toFixed(2)),
  );

  const handleSubmitReturn = async () => {
    if (!selectedSale) return;
    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item and quantity to return');
      return;
    }

    const effectiveReason = reason === 'Other reason' && customReason.trim() ? customReason.trim() : reason;
    if (!effectiveReason) {
      toast.error('Please specify a return reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdReturn = await salesApi.createReturn({
        saleId: selectedSale.id,
        reason: effectiveReason,
        notes: notes.trim() || undefined,
        refundMethod,
        items: itemsToReturn.map((i) => ({
          saleItemId: i.saleItemId,
          quantity: i.quantity,
        })),
      });

      toast.success(`Return #${createdReturn.returnNumber || ''} processed successfully! Stock restored.`);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dispenco:sales-updated', { detail: { saleId: selectedSale.id } }));
      }
      onOpenChange(false);
      if (onReturnSuccess) {
        onReturnSuccess(createdReturn);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to process sales return'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-20px)] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-xl">
        <DialogHeader className="p-4 sm:p-5 pr-11 sm:pr-14 border-b border-border/80 bg-muted/20 flex flex-row items-center justify-between text-left shrink-0">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4.5 text-primary shrink-0" />
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                Process Customer Medicine Return
              </DialogTitle>
            </div>
            <DialogDescription className="text-micro sm:text-xs text-muted-foreground line-clamp-1 leading-normal">
              Select purchased medicines to return, restock batches automatically, and issue customer refunds.
            </DialogDescription>
          </div>
          {selectedSale && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSale(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer h-8 px-2.5 shrink-0"
            >
              Change Receipt
            </Button>
          )}
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {/* Step 1: Receipt Search or Selection if no sale is selected */}
          {!selectedSale ? (
            <div className="space-y-5">
              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <Label htmlFor="search-receipt" className="text-xs font-semibold">
                  Lookup Sale by Receipt Number or Customer ID
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="search-receipt"
                      placeholder="e.g. REC-20261016-0001..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs h-9 font-mono"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="h-9 text-xs px-4 font-semibold cursor-pointer gap-1.5"
                  >
                    {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    <span>Lookup</span>
                  </Button>
                </div>
                <p className="text-micro text-muted-foreground">
                  Scan receipt barcode with your scanner or type the receipt number printed on customer slip.
                </p>
              </form>

              {/* Fast Pick from Recent Sales */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Recent Pharmacy Receipts</span>
                  {loadingRecent && <Loader2 className="size-3.5 animate-spin" />}
                </div>

                {loadingRecent ? (
                  <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Loading recent sales...</span>
                  </div>
                ) : recentSales.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No recent sales found. Use the search input above to locate the receipt.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs max-h-64 overflow-y-auto custom-scrollbar">
                    {recentSales.map((sale) => (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => fetchSaleDetails(sale.id)}
                        className="w-full p-3 text-left hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer group"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                              #{sale.receiptNumber}
                            </span>
                            <Badge variant="outline" className="text-micro uppercase shrink-0">
                              {sale.paymentMethod}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-micro truncate">
                            {sale.customerName || 'Walk-in'} • {sale.itemsCount} items • {formatDateTime(sale.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <span className="font-bold tabular-nums text-foreground whitespace-nowrap">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Sale is Selected -> Select Return Items & Reason */
            <div className="space-y-4">
              {/* Receipt Overview Card */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-foreground">
                      #{selectedSale.receiptNumber}
                    </span>
                    <Badge variant="secondary" className="text-micro font-semibold uppercase">
                      {selectedSale.payment?.method || selectedSale.status}
                    </Badge>
                    {hasPastReturns && (
                      <Badge variant="outline" className="text-micro font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                        Partial Return
                      </Badge>
                    )}
                    <span className="text-muted-foreground">{formatDateTime(selectedSale.createdAt)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    Customer: <strong className="text-foreground">{selectedSale.customer?.name || 'Walk-in Customer'}</strong>
                    {selectedSale.customer?.phone && ` (${selectedSale.customer.phone})`}
                    {selectedSale.user && (
                      <span> • Cashier: <strong className="text-foreground">{selectedSale.user.name}</strong></span>
                    )}
                  </p>
                </div>
                <div className="text-left sm:text-right sm:border-l sm:border-border/60 sm:pl-4 shrink-0">
                  <div className="flex items-center sm:justify-end gap-3 sm:gap-4 flex-wrap">
                    <div>
                      <span className="text-muted-foreground block text-micro uppercase tracking-wider">Original Total</span>
                      <span className="font-bold text-sm sm:text-base text-foreground tabular-nums">
                        {formatCurrency(selectedSale.totalAmount)}
                      </span>
                    </div>
                    {hasPastReturns && (
                      <>
                        <div>
                          <span className="text-amber-600 dark:text-amber-400 block text-micro uppercase tracking-wider">Refunded</span>
                          <span className="font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400 tabular-nums">
                            -{formatCurrency(alreadyRefundedTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-primary block text-micro uppercase tracking-wider">Max Returnable</span>
                          <span className="font-bold text-sm sm:text-base text-primary tabular-nums">
                            {formatCurrency(remainingReturnableTotal)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold px-1 gap-2 flex-wrap">
                  <div>
                    <span className="text-foreground">Select Medicines to Return</span>
                    <span className="text-muted-foreground text-micro block sm:inline sm:ml-2 font-normal">
                      Batch inventory will be restored automatically
                    </span>
                  </div>
                  {selectedSale.items.some(
                    (i) => (i.maxReturnable ?? i.quantity - (i.returnedQuantity || 0)) > 0,
                  ) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleReturnAll}
                      className="h-7 px-2.5 text-micro font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <CheckCheck className="size-3.5" />
                      <span>
                        {selectedSale.items.every((item) => {
                          const maxRet =
                            item.maxReturnable ??
                            Math.max(0, item.quantity - (item.returnedQuantity || 0));
                          return maxRet <= 0 || (returnQuantities[item.id] || 0) === maxRet;
                        })
                          ? 'Clear Selection'
                          : 'Return All Items'}
                      </span>
                    </Button>
                  )}
                </div>

                <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
                  <div className="divide-y divide-border/60">
                    {selectedSale.items.map((item) => {
                      const returnedQty = item.returnedQuantity || 0;
                      const maxReturnable = item.maxReturnable !== undefined ? item.maxReturnable : (item.quantity - returnedQty);
                      const isFullyReturned = maxReturnable <= 0;
                      const selectedQty = returnQuantities[item.id] || 0;

                      // Proportional refund preview for this item (including overall sale discount share)
                      const lineEffective = computeItemEffectiveTotal(
                        item,
                        selectedSale.items,
                        selectedSale.discountAmount || 0,
                      );
                      const itemRefundPreview = selectedQty > 0
                        ? Math.round((lineEffective * (selectedQty / item.quantity)) * 100) / 100
                        : 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 sm:py-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isFullyReturned
                              ? 'bg-muted/20 opacity-60'
                              : selectedQty > 0
                              ? 'bg-primary/5'
                              : 'hover:bg-muted/10'
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-xs text-foreground">
                                {item.productName}
                              </p>
                              <Badge variant="outline" className="text-micro font-mono">
                                Batch: {item.batchNumber}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-micro text-muted-foreground flex-wrap">
                              <span>Sold: <strong className="text-foreground">{item.quantity} {item.unit}</strong></span>
                              <span>Unit Price: <strong className="text-foreground">{formatCurrency(item.unitPrice)}</strong></span>
                              {returnedQty > 0 && (
                                <span className="text-warning font-medium">
                                  Already Returned: {returnedQty}
                                </span>
                              )}
                              <span>
                                Max Returnable: <strong className={maxReturnable > 0 ? 'text-primary' : 'text-muted-foreground'}>{maxReturnable}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                            {/* Proportional refund display */}
                            <div className="text-right mr-1 min-w-[65px]">
                              {isFullyReturned ? (
                                <>
                                  <span className="text-micro text-muted-foreground block">Past Refund</span>
                                  <span className="text-xs font-semibold tabular-nums text-muted-foreground/75">
                                    {formatCurrency(
                                      Math.round(
                                        (lineEffective * ((item.returnedQuantity || item.quantity) / item.quantity)) *
                                          100,
                                      ) / 100,
                                    )}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-micro text-muted-foreground block">Refund</span>
                                  <span
                                    className={`tabular-nums text-xs ${
                                      selectedQty > 0
                                        ? 'font-bold text-primary'
                                        : 'font-medium text-muted-foreground/70'
                                    }`}
                                  >
                                    {formatCurrency(itemRefundPreview)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            {isFullyReturned ? (
                              <Badge variant="secondary" className="text-micro">
                                Fully Returned
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, maxReturnable, -1)}
                                  disabled={selectedQty <= 0}
                                  className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                >
                                  <Minus className="size-3.5" />
                                </Button>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={selectedQty}
                                  onChange={(e) => setDirectQuantity(item.id, maxReturnable, e.target.value)}
                                  className="w-12 h-7 text-center font-bold text-xs px-1 border-0 bg-transparent focus-visible:ring-0 tabular-nums"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateQuantity(item.id, maxReturnable, 1)}
                                  disabled={selectedQty >= maxReturnable}
                                  className="size-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 3: Return Details (Reason, Method, Notes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="return-reason" className="text-xs font-semibold">
                    Reason for Return <span className="text-destructive">*</span>
                  </Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="return-reason" className="h-9 text-xs">
                      <SelectValue placeholder="Select return reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {RETURN_REASONS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {reason === 'Other reason' && (
                    <Input
                      placeholder="Specify custom reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="text-xs h-9 mt-1.5"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="refund-method" className="text-xs font-semibold">
                    Refund Issuance Method
                  </Label>
                  <Select
                    value={refundMethod}
                    onValueChange={(val: 'CASH' | 'CREDIT' | 'DIGITAL') => setRefundMethod(val)}
                  >
                    <SelectTrigger id="refund-method" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH" className="text-xs">
                        Cash Refund (Hand cash to customer)
                      </SelectItem>
                      <SelectItem
                        value="CREDIT"
                        disabled={!selectedSale.customer?.id || selectedSale.customer.id === 'walkin'}
                        className="text-xs"
                      >
                        Khata / Credit Adjustment (Reduce customer debt)
                      </SelectItem>
                      <SelectItem value="DIGITAL" className="text-xs">
                        Digital Payment Reversal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-micro text-muted-foreground">
                    {refundMethod === 'CREDIT'
                      ? "Automatically decreases customer's outstanding Khata balance."
                      : !selectedSale.customer?.id || selectedSale.customer.id === 'walkin'
                      ? 'Walk-in receipt — refund via counter cash or digital reversal.'
                      : 'Cashier pays refund from active counter register.'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="return-notes" className="text-xs font-semibold">
                  Internal Pharmacist Notes (Optional)
                </Label>
                <Textarea
                  id="return-notes"
                  placeholder="Additional inspection remarks or medicine condition details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Step 4: Summary Card */}
              {itemsToReturn.length > 0 && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <RotateCcw className="size-3.5 text-primary" />
                      <span>Return Summary</span>
                    </span>
                    <Badge variant="secondary" className="text-micro font-bold">
                      {totalUnitsToReturn} Units across {itemsToReturn.length} medicines
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-primary/10">
                    <span className="text-xs text-muted-foreground">
                      Total Calculated Refund ({refundMethod}):
                    </span>
                    <span className="font-bold text-base text-primary tabular-nums">
                      {formatCurrency(totalRefundAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>

          {selectedSale && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSubmitReturn}
              disabled={isSubmitting || itemsToReturn.length === 0}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs px-4"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {itemsToReturn.length === 0 ? (
                <span>Select Medicines to Return</span>
              ) : (
                <>
                  <span className="hidden sm:inline">Confirm Return & Refund ({formatCurrency(totalRefundAmount)})</span>
                  <span className="sm:hidden">Confirm Return ({formatCurrency(totalRefundAmount)})</span>
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
