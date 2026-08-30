import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Truck } from 'lucide-react';

export const metadata = {
  title: 'Purchases & Suppliers - Dispenco',
  description: 'Manage purchase orders, supplier directory, and shipment check-in',
};

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Purchases & Suppliers
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Manage purchase orders, supplier directory, and shipment check-in.
        </p>
      </div>

      <Card className="border-dashed bg-card/60">
        <CardContent className="p-6 sm:p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Truck className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-base font-semibold text-foreground">Purchases & Receiving</p>
            <p className="text-xs text-muted-foreground">
              Ready for purchase orders, vendor invoices, and incoming stock batch arrivals.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
