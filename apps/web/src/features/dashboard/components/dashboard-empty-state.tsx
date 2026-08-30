import React from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <ShoppingCart className="size-6" />
        </div>
        <CardTitle className="text-lg">Welcome to Your Pharmacy Workspace</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          Your store is set up and ready! Start by populating your product catalog or launching the POS counter for sales.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-center gap-3 pt-0">
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href="/inventory">
            <Plus className="size-4" />
            <span>Add Medicine Product</span>
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-2">
          <Link href="/pos">
            <ShoppingCart className="size-4" />
            <span>Launch POS Counter</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
