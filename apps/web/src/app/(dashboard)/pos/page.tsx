import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export const metadata = {
  title: 'POS Billing Counter - Dispenco',
  description: 'Fast counter checkout with barcode scanning & automatic stock deduction',
};

export default function POSPage() {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          POS Billing Counter
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Fast counter checkout with barcode scanning & automatic stock deduction.
        </p>
      </div>

      <Card className="border-dashed bg-card/60">
        <CardContent className="p-6 sm:p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingCart className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-base font-semibold text-foreground">POS Counter Checkout</p>
            <p className="text-xs text-muted-foreground">
              Ready for product barcode scanning, fast cart creation, and cash/digital receipt checkout.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
