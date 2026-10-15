import React from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export function DashboardHeader() {
  return (
    <PageHeader
      title="Pharmacy Overview"
      description="Real-time daily metrics, inventory alerts, and quick POS access."
      actions={
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial gap-1.5 h-8 text-xs font-medium">
            <Link href="/inventory/new">
              <Plus className="size-3.5" />
              <span>Add Product</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1 sm:flex-initial gap-1.5 h-8 text-xs font-medium">
            <Link href="/pos">
              <ShoppingCart className="size-3.5" />
              <span>Open POS</span>
            </Link>
          </Button>
        </div>
      }
    />
  );
}
