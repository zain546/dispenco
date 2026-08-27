import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function POSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          POS Billing Counter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fast counter checkout with barcode scanning & automatic stock deduction.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <ShoppingCart className="size-10 text-muted-foreground/60" />
          <p className="text-sm">
            POS Counter placeholder — ready for scanner & cart checkout logic.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
