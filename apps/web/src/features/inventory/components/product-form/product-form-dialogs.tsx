import React from 'react';
import { AlertTriangle, Boxes, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatUnitPlural } from '../product-list';
import type { ProductData } from '../../services/products-api';
import type { ProductFormValues } from '../../schemas/product-schema';

interface InvertedPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingValues: ProductFormValues | null;
  isLoading: boolean;
  onConfirm: () => void;
}

export function InvertedPriceDialog({
  open,
  onOpenChange,
  pendingValues,
  isLoading,
  onConfirm,
}: InvertedPriceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md p-5 sm:p-6 gap-4">
        <AlertDialogHeader className="sm:text-left gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                Selling Price is Below Cost
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check if prices were entered correctly
              </p>
            </div>
          </div>

          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1 text-xs text-foreground">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Your purchase cost is higher than your selling price. Selling this medicine will result in a loss.
              </p>

              {/* Clean Price Comparison Box */}
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Purchase Cost:</span>
                  <span className="font-semibold text-foreground">
                    PKR {pendingValues?.costPrice !== undefined ? Number(pendingValues.costPrice).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Retail Price (MRP):</span>
                  <span className="font-bold text-destructive">
                    PKR {pendingValues?.sellPrice !== undefined ? Number(pendingValues.sellPrice).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Did you accidentally swap the purchase price and retail price?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end sm:gap-2.5 pt-1">
          <AlertDialogCancel
            variant="default"
            disabled={isLoading}
            className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs order-1"
          >
            Fix Prices
          </AlertDialogCancel>
          <AlertDialogAction
            variant="secondary"
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto h-9 text-xs font-medium order-2"
          >
            {isLoading && <Loader2 className="size-3.5 animate-spin mr-1" />}
            Save Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface BarcodeCollisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannedProduct: ProductData | null;
  barcodeValue?: string;
  isLoading: boolean;
  onClearBarcode: () => void;
  onReceiveBatch: () => void;
}

export function BarcodeCollisionDialog({
  open,
  onOpenChange,
  scannedProduct,
  barcodeValue,
  isLoading,
  onClearBarcode,
  onReceiveBatch,
}: BarcodeCollisionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md p-5 sm:p-6 gap-4">
        <AlertDialogHeader className="sm:text-left gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Boxes className="size-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                Medicine Already in Catalog
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Barcode is already linked to an existing medicine
              </p>
            </div>
          </div>

          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1 text-xs text-foreground">
              <p className="text-muted-foreground text-xs leading-relaxed">
                <strong>{scannedProduct?.name}</strong> is already registered in your inventory with this barcode. You cannot create a duplicate medicine record with the same barcode.
              </p>

              {/* Medicine Summary Box */}
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Medicine:</span>
                  <span className="font-semibold text-foreground">
                    {scannedProduct?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Barcode:</span>
                  <span className="font-mono text-foreground">
                    {scannedProduct?.barcode || barcodeValue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Stock:</span>
                  <span className="font-semibold text-foreground">
                    {scannedProduct?.totalStock ?? 0} {formatUnitPlural(scannedProduct?.unit || 'Box')}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Would you like to receive a new stock batch for this medicine instead?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end sm:gap-2.5 pt-1">
          <AlertDialogCancel
            variant="secondary"
            disabled={isLoading}
            onClick={onClearBarcode}
            className="w-full sm:w-auto h-9 text-xs font-medium order-2"
          >
            Clear Barcode
          </AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            type="button"
            onClick={onReceiveBatch}
            disabled={isLoading}
            className="w-full sm:w-auto h-9 text-xs font-semibold shadow-xs order-1"
          >
            <Boxes className="size-3.5 mr-1" />
            Receive Batch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

