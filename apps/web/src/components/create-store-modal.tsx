'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useStore } from '@/context/store-context';
import { Store, Loader2, MapPin, Building2, Receipt, CalendarClock } from 'lucide-react';

const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  address: z.string().optional(),
  currency: z.string().default('PKR'),
  taxRate: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 0)),
  expiryAlertDays: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 90)),
  receiptFooter: z.string().optional(),
});

type CreateStoreFormValues = z.infer<typeof createStoreSchema>;

interface CreateStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateStoreModal({ open, onOpenChange, onSuccess }: CreateStoreModalProps) {
  const { createStore } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema) as any,
    defaultValues: {
      name: '',
      address: '',
      currency: 'PKR',
      taxRate: '0' as any,
      expiryAlertDays: '90' as any,
      receiptFooter: 'Thank you for choosing our pharmacy!',
    },
  });

  const onSubmit = async (data: CreateStoreFormValues) => {
    try {
      setIsSubmitting(true);
      await createStore({
        name: data.name.trim(),
        address: data.address?.trim() || undefined,
        currency: data.currency || 'PKR',
        taxRate: Number(data.taxRate) || 0,
        expiryAlertDays: Number(data.expiryAlertDays) || 90,
        receiptFooter: data.receiptFooter?.trim() || undefined,
      });
      reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch {
      // Error toast handled in createStore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-xs">
            <Building2 className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Add New Pharmacy Branch
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Register a new physical store location or counter under your pharmacy workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Store Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold flex items-center gap-1.5">
              <Store className="size-3.5 text-primary" />
              Store / Branch Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Clifton Branch or Counter 2"
              className={errors.name ? 'border-destructive' : ''}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-micro text-destructive font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" />
              Physical Address / Location
            </Label>
            <Input
              id="address"
              placeholder="e.g. Block 5, Marine Drive, Karachi"
              {...register('address')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Currency */}
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-semibold">
                Currency
              </Label>
              <Input id="currency" defaultValue="PKR" {...register('currency')} />
            </div>

            {/* Tax Rate % */}
            <div className="space-y-1.5">
              <Label htmlFor="taxRate" className="text-xs font-semibold">
                Default Tax Rate (%)
              </Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                {...register('taxRate')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Expiry Alert Days */}
            <div className="space-y-1.5">
              <Label htmlFor="expiryAlertDays" className="text-xs font-semibold flex items-center gap-1">
                <CalendarClock className="size-3.5 text-muted-foreground" />
                Expiry Alert (Days)
              </Label>
              <Input
                id="expiryAlertDays"
                type="number"
                min="7"
                max="365"
                placeholder="90"
                {...register('expiryAlertDays')}
              />
            </div>

            {/* Receipt Footer */}
            <div className="space-y-1.5">
              <Label htmlFor="receiptFooter" className="text-xs font-semibold flex items-center gap-1">
                <Receipt className="size-3.5 text-muted-foreground" />
                Receipt Footer Text
              </Label>
              <Input
                id="receiptFooter"
                placeholder="Thank you for visiting"
                {...register('receiptFooter')}
              />
            </div>
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Branch...
                </>
              ) : (
                'Create Branch'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
