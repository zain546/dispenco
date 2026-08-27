import { Card, CardContent } from '@/components/ui/card';
import { Truck } from 'lucide-react';

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Purchases & Suppliers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage purchase orders, supplier directory, and shipment check-in.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Truck className="size-10 text-muted-foreground/60" />
          <p className="text-sm">
            Purchases module placeholder — ready for purchase orders & receiving stock.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
