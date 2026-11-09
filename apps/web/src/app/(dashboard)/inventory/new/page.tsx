import React, { Suspense } from 'react';
import { ProductForm } from '@/features/inventory/components/product-form';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Add New Product - Dispenco',
  description: 'Register a new medicine or retail product in your store catalog',
};

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm">Loading medicine form...</span>
        </div>
      }
    >
      <ProductForm />
    </Suspense>
  );
}
