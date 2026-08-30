import React from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pharmacy Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time daily metrics, inventory alerts, and quick POS access.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/inventory">
            <Plus className="size-4" />
            <span>Add Product</span>
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-2">
          <Link href="/pos">
            <ShoppingCart className="size-4" />
            <span>Open POS</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
