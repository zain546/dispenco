'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useInventoryAggregation } from '@/features/inventory/hooks/use-inventory-queries';
import { useStore } from '@/context/store-context';

export function DashboardEmptyState() {
  const { activeStoreId, isAllStores, isStoreReady } = useStore();
  const storeIdParam = !isAllStores && activeStoreId ? activeStoreId : undefined;

  const { data, isLoading } = useInventoryAggregation(
    storeIdParam ? { storeId: storeIdParam } : undefined,
    { enabled: isStoreReady }
  );

  if (isLoading || !data?.summary || data.summary.totalCatalogItems > 0) {
    return null;
  }

  return (
    <Card className="border-dashed border-border/80 bg-card/50">
      <EmptyState
        icon={ShoppingCart}
        title="Welcome to Your Pharmacy Workspace"
        description="Your store is set up and ready! Start by populating your product catalog or launching the POS counter for sales."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs font-medium">
              <Link href="/inventory">
                <Plus className="size-3.5" />
                <span>Add Medicine Product</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5 h-8 text-xs font-medium">
              <Link href="/pos">
                <ShoppingCart className="size-3.5" />
                <span>Launch POS Counter</span>
              </Link>
            </Button>
          </div>
        }
      />
    </Card>
  );
}
