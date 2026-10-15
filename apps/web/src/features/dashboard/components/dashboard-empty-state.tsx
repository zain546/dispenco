'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { productsApi } from '@/features/inventory/services/products-api';

export function DashboardEmptyState() {
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    productsApi
      .getProducts({ limit: 1 })
      .then((res) => {
        const count = res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0);
        setProductCount(count);
      })
      .catch(() => {
        setProductCount(0);
      });
  }, []);

  if (productCount === null || productCount > 0) {
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
