import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Inventory & Stock
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage products, batches, stock levels, and FEFO expiry tracking.
        </p>
      </div>

      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Package className="size-10 text-muted-foreground/60" />
          <p className="text-sm">
            Inventory module placeholder — ready for catalog & batch management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
