'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { User, UserPlus, UserCheck, Loader2 } from 'lucide-react';
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
import { customersApi, CustomerItem } from '../services/customers-api';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer?: CustomerItem) => void;
  customerToEdit?: CustomerItem | null;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}: CustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(customerToEdit);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address || '');
      setInitialBalance('');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setInitialBalance('');
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && customerToEdit) {
        const updated = await customersApi.updateCustomer(customerToEdit.id, {
          name: cleanName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
        });
        toast.success(`Customer "${cleanName}" updated successfully`);
        onSuccess(updated);
      } else {
        const created = await customersApi.createCustomer({
          name: cleanName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          initialCreditBalance: initialBalance ? Number(initialBalance) : undefined,
        });
        toast.success(`Customer "${cleanName}" registered successfully`);
        onSuccess(created);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save customer';
      toast.error(msg);
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
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {isEditing ? <UserCheck className="size-5" /> : <UserPlus className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? `Edit Customer: ${customerToEdit?.name}` : 'Register New Customer'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? 'Update contact info and personal record details.'
                  : 'Add a customer to track purchase receipts and Khata credit.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* Customer Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs font-semibold">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cust-name"
                placeholder="e.g. Haji Abdul Rehman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <Input
                id="cust-phone"
                placeholder="e.g. +92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Used to quickly lookup customer at the POS counter and send digital invoices.
              </p>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-email" className="text-xs font-semibold">
                Email Address (Optional)
              </Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="cust-address" className="text-xs font-semibold">
                Address / Street
              </Label>
              <Input
                id="cust-address"
                placeholder="e.g. House 42, Street 7, Block B"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Initial Credit Balance (only when creating) */}
            {!isEditing && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="cust-init-balance" className="text-xs font-semibold">
                  Starting Khata Balance (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="cust-init-balance"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="h-9 text-sm pr-12 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    PKR
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  If migrating from an existing paper Khata ledger, enter their current balance.
                </p>
              </div>
            )}
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
              disabled={isSubmitting}
              className="gap-2 font-semibold cursor-pointer shadow-xs"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
