import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tag, Search, Loader2, Pill, Plus } from 'lucide-react';
import type { ProductData } from '@/features/inventory/services/products-api';

interface PosLinkBarcodeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  scannedCode: string;
  parsedData?: {
    gtin?: string;
    batchNumber?: string;
    expiryDate?: string;
    mfgDate?: string;
    serialNumber?: string;
  };
  query: string;
  onQueryChange: (query: string) => void;
  results: ProductData[];
  isSearching: boolean;
  isLinking: boolean;
  onLinkProduct: (product: ProductData) => void;
}

export function PosLinkBarcodeModal({
  isOpen,
  onOpenChange,
  scannedCode,
  parsedData,
  query,
  onQueryChange,
  results,
  isSearching,
  isLinking,
  onLinkProduct,
}: PosLinkBarcodeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md p-4 sm:p-5 rounded-2xl border-border shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-1.5 text-left pr-8">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
            <Tag className="size-4 text-primary shrink-0" />
            <span className="truncate">New Medicine Barcode Scanned</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            This box&apos;s barcode isn&apos;t linked to a medicine in your catalog yet. Link it once below so future scans add it to the cart automatically:
          </DialogDescription>
        </DialogHeader>

        {/* Scanned GS1 / Barcode Details Badge Card */}
        <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">GTIN / Barcode:</span>
            <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate">
              {scannedCode}
            </span>
          </div>
          {(parsedData?.batchNumber || parsedData?.expiryDate || parsedData?.mfgDate) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60 text-micro">
              {parsedData?.batchNumber && (
                <Badge variant="outline" className="font-mono text-micro">
                  Batch: {parsedData.batchNumber}
                </Badge>
              )}
              {parsedData?.expiryDate && (
                <Badge variant="outline" className="font-mono text-micro">
                  Exp: {parsedData.expiryDate}
                </Badge>
              )}
              {parsedData?.mfgDate && (
                <Badge variant="outline" className="font-mono text-micro">
                  Mfg: {parsedData.mfgDate}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Type medicine name on box (e.g. Avsar, Panadol)..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              autoFocus
              className="pl-9 h-10 text-xs sm:text-sm"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
            )}
          </div>

          <div className="max-h-56 overflow-y-auto overflow-x-hidden divide-y divide-border/60 border border-border rounded-xl bg-muted/20">
            {!query.trim() ? (
              <div className="p-5 text-center space-y-1">
                <Pill className="size-6 text-primary/60 mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">
                  Search the medicine name printed on the box
                </p>
                <p className="text-micro text-muted-foreground">
                  Type a few letters above (e.g. &ldquo;Avsar&rdquo;) and tap Link &amp; Add.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-5 text-center text-xs text-muted-foreground">
                No matching medicine found for &ldquo;{query}&rdquo;. You can add it as a new medicine below.
              </div>
            ) : (
              results.map((prod) => (
                <div
                  key={prod.id}
                  className="p-2.5 flex items-center justify-between gap-2 hover:bg-primary/5 transition-colors min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{prod.name}</p>
                    <p className="text-micro text-muted-foreground truncate">
                      {prod.genericName || prod.category} • Stock: {prod.totalStock ?? 0} • {(prod.latestSellPrice ?? 0).toFixed(2)} PKR
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLinking}
                    onClick={() => onLinkProduct(prod)}
                    className="h-8 px-2.5 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Link &amp; Add
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* 1-Click Create New Medicine in Inventory with Scanned Box Data */}
          <div className="pt-1 border-t border-border/60 flex items-center justify-between gap-2">
            <span className="text-micro text-muted-foreground">Not in your catalog yet?</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams();
                params.set('barcode', scannedCode);
                if (parsedData?.batchNumber) {
                  params.set('batchNumber', parsedData.batchNumber);
                }
                if (parsedData?.expiryDate) {
                  params.set('expiryDate', parsedData.expiryDate);
                }
                if (parsedData?.mfgDate) {
                  params.set('mfgDate', parsedData.mfgDate);
                }
                if (query.trim()) {
                  params.set('name', query.trim());
                }
                window.location.href = `/inventory/new?${params.toString()}`;
              }}
              className="h-8 text-xs gap-1.5 font-semibold border-primary/30 text-primary hover:bg-primary/5 shrink-0 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add New Medicine from Scan</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

