'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CreditCard, Banknote, Loader2, ArrowDownCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { customersApi, CustomerItem } from '../services/customers-api';

interface RecordKhataPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  customer: {
    id: string;
    name: string;
    creditBalance: number;
  } | null;
}

export function RecordKhataPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: RecordKhataPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'DIGITAL'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer && customer.creditBalance > 0) {
      setAmount(String(customer.creditBalance));
    } else {
      setAmount('');
    }
    setMethod('CASH');
    setNotes('');
  }, [customer, isOpen]);

  if (!customer) return null;

  const currentBalance = Number(customer.creditBalance) || 0;
  const numAmount = Number(amount) || 0;
  const remainingBalance = Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await customersApi.recordPayment(customer.id, {
        amount: numAmount,
        method,
        notes: notes.trim() || undefined,
      });

      toast.success(res.message);
      onSuccess(res.newCreditBalance);
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to record payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border border-border bg-background">
        {/* Pinned Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <ArrowDownCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Record Khata Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Settle outstanding credit balance for <span className="font-semibold text-foreground">{customer.name}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* Balance Overview Card */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
              <div>
                <p className="text-micro text-muted-foreground font-medium uppercase text-overline">Current Khata Debt</p>
                <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-micro text-muted-foreground font-medium uppercase text-overline">After Payment</p>
                <p className={`text-lg font-bold tabular-nums mt-0.5 ${remainingBalance === 0 ? 'text-success' : 'text-primary'}`}>
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="pay-amount" className="text-xs font-semibold">
                Repayment Amount (PKR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 text-base font-bold font-mono pr-14"
                  required
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  PKR
                </span>
              </div>

              {/* Quick Preset Buttons */}
              {currentBalance > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <button
                    type="button"
                    onClick={() => setAmount(String(currentBalance))}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-muted/80 hover:bg-muted font-medium text-foreground transition-colors cursor-pointer border border-border/50"
                  >
                    Pay Full (PKR {currentBalance.toLocaleString()})
                  </button>
                  {currentBalance > 500 && (
                    <button
                      type="button"
                      onClick={() => setAmount('500')}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-muted/80 hover:bg-muted font-medium text-foreground transition-colors cursor-pointer border border-border/50 font-mono"
                    >
                      500
                    </button>
                  )}
                  {currentBalance > 1000 && (
                    <button
                      type="button"
                      onClick={() => setAmount('1000')}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-muted/80 hover:bg-muted font-medium text-foreground transition-colors cursor-pointer border border-border/50 font-mono"
                    >
                      1,000
                    </button>
                  )}
                  {currentBalance > 2000 && (
                    <button
                      type="button"
                      onClick={() => setAmount('2000')}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-muted/80 hover:bg-muted font-medium text-foreground transition-colors cursor-pointer border border-border/50 font-mono"
                    >
                      2,000
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Payment Method Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('CASH')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    method === 'CASH'
                      ? 'border-primary/50 bg-primary/5 text-foreground shadow-2xs'
                      : 'border-border/60 bg-card hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Banknote className="size-4 text-primary" />
                  <span>Cash Payment</span>
                  {method === 'CASH' && <Check className="size-3 text-primary ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('DIGITAL')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    method === 'DIGITAL'
                      ? 'border-primary/50 bg-primary/5 text-foreground shadow-2xs'
                      : 'border-border/60 bg-card hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <CreditCard className="size-4 text-primary" />
                  <span>Digital Transfer</span>
                  {method === 'DIGITAL' && <Check className="size-3 text-primary ml-auto" />}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes" className="text-xs font-semibold">
                Notes / Reference (Optional)
              </Label>
              <Input
                id="pay-notes"
                placeholder="e.g. Paid at front counter by brother"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Pinned Footer */}
          <DialogFooter className="p-4 sm:p-5 border-t border-border/80 shrink-0 bg-muted/20 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || numAmount <= 0}
              className="gap-2 font-semibold cursor-pointer shadow-xs"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Confirm {formatCurrency(numAmount)} Payment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
