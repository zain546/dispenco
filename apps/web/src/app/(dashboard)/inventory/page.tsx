import React from 'react';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Inventory & Stock Catalog - Dispenco',
  description: 'Manage pharmacy products, batches, stock levels, and FEFO expiry tracking',
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inventory & Stock Catalog
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage products, batches, stock levels, and FEFO expiry tracking.
          </p>
        </div>
        <div>
          <Button asChild size="sm" className="gap-2">
            <Link href="/inventory/new">
              <Plus className="size-4" />
              <span>Add New Product</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-dashed bg-card/60">
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Package className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-base font-semibold text-foreground">Product Catalog Initialized</p>
            <p className="text-xs text-muted-foreground">
              Click &quot;Add New Product&quot; to register medicines, tablets, syrups, or medical supplies.
            </p>
          </div>
          <Button asChild size="sm" className="gap-2 mt-2">
            <Link href="/inventory/new">
              <Plus className="size-4" />
              <span>Add First Product</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
