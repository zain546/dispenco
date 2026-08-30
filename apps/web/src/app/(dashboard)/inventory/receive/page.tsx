import React, { Suspense } from 'react';
import { StockReceiveForm } from '@/features/inventory/components/stock-receive-form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Receive Stock Batch - Dispenco Pharmacy',
  description: 'Receive incoming medicine shipment batches, costs, and FEFO expiry dates.',
};

export default function StockReceivePage() {
  return (
    <Suspense
      fallback={
        <Card className="shadow-xs max-w-4xl mx-auto mt-6">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Loading stock receive workflow...</p>
          </CardContent>
        </Card>
      }
    >
      <StockReceiveForm />
    </Suspense>
  );
}
